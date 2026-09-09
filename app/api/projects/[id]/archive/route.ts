import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { projectService } from '@/lib/services/tenants/projectService';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/archive
 * Soft-archives a project.
 * Requires OWNER or ADMIN role.
 */
export async function POST(
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
