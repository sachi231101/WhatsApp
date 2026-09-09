import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { projectService } from '@/lib/services/tenants/projectService';
import { requireWorkspaceRole } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * Retrieves projects scoped to the user's active workspace.
 * Supports status filtering: ?status=active (default) | archived | all
 */
export const GET = withAuth(async function listProjects(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') || 'active';

    const projects = await projectService.getWorkspaceProjects(workspaceId, {
      status: statusParam,
    });

    return NextResponse.json({
      status: 'ok',
      data: projects,
    });
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve projects' },
      { status: 500 },
    );
  }
});

/**
 * POST /api/projects
 * Creates a new project in the active workspace.
 * Requires at least AGENT role in the workspace.
 */
export const POST = withAuth(async function createProject(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;

    // Verify role authorization (AGENT or higher)
    await requireWorkspaceRole(workspaceId, WORKSPACE_ROLES.AGENT, session.workspace.userId);

    const body = await request.json();
    const { name, description, slug } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required.' },
        { status: 400 },
      );
    }

    if (name.trim().length > 255) {
      return NextResponse.json(
        { error: 'Project name must be 255 characters or fewer.' },
        { status: 400 },
      );
    }

    const project = await projectService.createProject(workspaceId, {
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
      slug: typeof slug === 'string' ? slug.trim() : undefined,
    });

    return NextResponse.json(
      {
        status: 'ok',
        data: project,
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.statusCode === 403 || error.name === 'RoleAuthorizationError') {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 },
      );
    }

    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 },
    );
  }
});
