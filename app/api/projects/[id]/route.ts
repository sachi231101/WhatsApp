import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { projectService } from '@/lib/services/tenants/projectService';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]
 * Retrieves details for a specific project.
 * Strictly verifies user belongs to the project's workspace.
 * Returns non-disclosing 404 if project doesn't exist or is inaccessible.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const { project, workspace, membership } = await requireProjectAccess(projectId);

    return NextResponse.json({
      status: 'ok',
      data: {
        ...project,
        workspaceName: workspace.name,
        userRole: membership.role,
      },
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 },
      );
    }
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve project' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Updates project settings (name, description).
 * Requires OWNER or ADMIN role in the project's workspace.
 * Strictly rejects changing workspace_id.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    // Verify access with at least ADMIN role
    const { project } = await requireProjectAccess(projectId, WORKSPACE_ROLES.ADMIN);

    const body = await request.json();
    const { name, description, workspace_id, workspaceId } = body;

    // Explicitly reject tampering with tenant / workspace boundary
    if (workspace_id || workspaceId) {
      return NextResponse.json(
        { error: 'Changing project workspace is strictly prohibited.' },
        { status: 400 },
      );
    }

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      return NextResponse.json(
        { error: 'Project name cannot be empty.' },
        { status: 400 },
      );
    }

    if (name && name.trim().length > 255) {
      return NextResponse.json(
        { error: 'Project name must be 255 characters or fewer.' },
        { status: 400 },
      );
    }

    const updated = await projectService.updateProject(project.workspaceId, projectId, {
      name: typeof name === 'string' ? name.trim() : undefined,
      description: typeof description === 'string' ? description.trim() : undefined,
    });

    return NextResponse.json({
      status: 'ok',
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 },
      );
    }
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Soft-archives the project. Requires OWNER or ADMIN role.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    // Verify access with at least ADMIN role
    const { project } = await requireProjectAccess(projectId, WORKSPACE_ROLES.ADMIN);

    const archived = await projectService.archiveProject(project.workspaceId, projectId);

    return NextResponse.json({
      status: 'ok',
      message: 'Project archived successfully',
      data: archived,
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 },
      );
    }
    console.error('Error archiving project:', error);
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 },
    );
  }
}
