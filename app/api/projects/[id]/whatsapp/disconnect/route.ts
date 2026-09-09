import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/whatsapp/disconnect
 * Disconnects WhatsApp from project.
 * Requires OWNER or ADMIN role.
 * Preserves all conversations, messages, contacts, and historical analytics.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    // Strictly require ADMIN or OWNER role to disconnect
    const { project, workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.ADMIN);

    const success = await projectConnectionService.disconnectProject(project.id, workspace.id);

    if (!success) {
      return NextResponse.json(
        { error: 'WhatsApp connection not found or already disconnected.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'WhatsApp Business account disconnected. Historical messages and contacts have been preserved.',
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden', message: error.message }, { status: 403 });
    }

    console.error('Error disconnecting project WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect WhatsApp connection' },
      { status: 500 },
    );
  }
}
