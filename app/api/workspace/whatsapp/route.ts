import { type NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/authWrapper';
import { whatsappConnectionService } from '@/lib/services/whatsapp/connectionService';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import { resolveDefaultWorkspaceProject } from '@/lib/services/whatsapp/resolveDefaultProject';
import { isWhatsAppDevConfigAvailable } from '@/lib/whatsapp/devConfig';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/whatsapp
 * Returns workspace WhatsApp accounts plus the default project's connection status.
 * Never returns secrets. Includes `devConfigAvailable` (boolean only).
 */
export const GET = withPermission(
  PERMISSIONS.WHATSAPP_VIEW,
  async function getWorkspaceConnections(_request: NextRequest, session) {
    try {
      const workspaceId = session.workspace.workspaceId;
      const accounts = await whatsappConnectionService.getWorkspaceConnections(workspaceId);

      let projectId: string | null = null;
      let projectConnection = null;
      try {
        const project = await resolveDefaultWorkspaceProject(workspaceId);
        projectId = project.id;
        projectConnection = await projectConnectionService.getProjectConnection(project.id);
      } catch (err) {
        console.warn('[workspace/whatsapp] Could not resolve default project connection:', err);
      }

      return NextResponse.json({
        status: 'ok',
        data: accounts,
        projectId,
        connection: projectConnection,
        devConfigAvailable: isWhatsAppDevConfigAvailable(),
        workspaceId,
      });
    } catch (error) {
      console.error('Failed to get workspace WhatsApp connections:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve WhatsApp connections' },
        { status: 500 },
      );
    }
  },
);
