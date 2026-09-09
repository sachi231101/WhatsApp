import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import publicConfig from '@/app/publicConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/whatsapp
 * Returns current WhatsApp Business connection for the project.
 * Enforces strict tenant isolation: user must belong to project's workspace.
 * Cryptographic tokens are strictly excluded from the payload.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const { project, workspace, membership } = await requireProjectAccess(projectId);

    const connection = await projectConnectionService.getProjectConnection(projectId);

    return NextResponse.json({
      status: 'ok',
      data: connection,
      appId: publicConfig.appId || '',
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
      },
      workspaceId: workspace.id,
      userRole: membership.role,
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden', message: error.message }, { status: 403 });
    }

    console.error('Error fetching project WhatsApp connection:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve WhatsApp connection' },
      { status: 500 },
    );
  }
}
