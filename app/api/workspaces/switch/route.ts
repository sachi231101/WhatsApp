import { type NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceMember, WorkspaceAccessDeniedError } from '@/lib/workspace/workspace-access';
import { projectService } from '@/lib/services/tenants/projectService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/switch
 * Securely switches the user's active workspace context.
 * Strictly verifies membership server-side before updating the workspace cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'Workspace ID is required.' },
        { status: 400 },
      );
    }

    // Server-side authorization: verify user is an active member of target workspace
    const { workspace, membership } = await requireWorkspaceMember(workspaceId);

    // Ensure the target workspace has an active project
    let activeProjectId: string | undefined;
    try {
      const proj = await projectService.ensureDefaultProject(workspace.id);
      activeProjectId = proj.id;
    } catch {
      // Ignored
    }

    const response = NextResponse.json({
      status: 'ok',
      data: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        role: membership.role,
        projectId: activeProjectId,
      },
    });

    // Set cookie for active workspace
    response.cookies.set('wazzapp_workspace_id', workspace.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    if (activeProjectId) {
      response.cookies.set('wazzapp_project_id', activeProjectId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error: any) {
    if (error instanceof WorkspaceAccessDeniedError || error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 },
      );
    }

    console.error('Error switching workspace:', error);
    return NextResponse.json(
      { error: 'Failed to switch workspace' },
      { status: 500 },
    );
  }
}
