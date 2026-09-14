import { type NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/authWrapper';
import { whatsappConnectionService } from '@/lib/services/whatsapp/connectionService';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import { resolveDefaultWorkspaceProject } from '@/lib/services/whatsapp/resolveDefaultProject';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/whatsapp/disconnect
 * Soft-disconnects the default project's WhatsApp connection (and optional WABA account).
 * Body: { wabaId?: string } — if omitted, disconnects the default project connection only.
 */
export const POST = withPermission(
  PERMISSIONS.WHATSAPP_MANAGE,
  async function disconnectWorkspaceWhatsApp(request: NextRequest, session) {
    try {
      const workspaceId = session.workspace.workspaceId;
      let wabaId: string | undefined;
      try {
        const body = await request.json();
        if (body?.wabaId && typeof body.wabaId === 'string') {
          wabaId = body.wabaId;
        }
      } catch {
        // empty body is fine — disconnect default project connection
      }

      const project = await resolveDefaultWorkspaceProject(workspaceId);
      const projectDisconnected = await projectConnectionService.disconnectProject(
        project.id,
        workspaceId,
      );

      let wabaDisconnected = false;
      if (wabaId) {
        wabaDisconnected = await whatsappConnectionService.disconnectWaba(workspaceId, wabaId);
      }

      if (!projectDisconnected && !wabaDisconnected) {
        return NextResponse.json(
          { error: 'No WhatsApp connection found to disconnect' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        status: 'ok',
        message: 'WhatsApp disconnected successfully',
        data: {
          projectId: project.id,
          projectDisconnected,
          wabaDisconnected,
        },
      });
    } catch (error) {
      console.error('Failed to disconnect WhatsApp:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect WhatsApp' },
        { status: 500 },
      );
    }
  },
);
