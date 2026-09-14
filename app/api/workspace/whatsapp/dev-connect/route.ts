import { type NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/authWrapper';
import {
  projectConnectionService,
  DevWhatsAppConnectionError,
} from '@/lib/services/whatsapp/projectConnectionService';
import { resolveDefaultWorkspaceProject } from '@/lib/services/whatsapp/resolveDefaultProject';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/whatsapp/dev-connect
 * Binds server-side development WhatsApp credentials to the workspace's default project.
 * Does not accept tokens from the client. Does not use Embedded Signup.
 */
export const POST = withPermission(
  PERMISSIONS.WHATSAPP_CONNECT,
  async function connectDevWhatsApp(_request: NextRequest, session) {
    try {
      const workspaceId = session.workspace.workspaceId;
      const project = await resolveDefaultWorkspaceProject(workspaceId);

      const connection = await projectConnectionService.connectFromDevelopmentConfig({
        projectId: project.id,
        workspaceId,
      });

      return NextResponse.json({
        status: 'ok',
        data: {
          connection,
          projectId: project.id,
          reasonCode: connection.status === 'CONNECTED' ? 'CONNECTED' : 'META_API_ERROR',
          message:
            connection.status === 'CONNECTED'
              ? 'WhatsApp connected successfully.'
              : 'Connected with warnings. Webhook subscription may need attention.',
        },
      });
    } catch (error: unknown) {
      if (error instanceof DevWhatsAppConnectionError) {
        return NextResponse.json(
          {
            status: 'error',
            error: error.message,
            reasonCode: error.reasonCode,
          },
          { status: error.statusCode },
        );
      }

      console.error('Failed to connect development WhatsApp:', error);
      return NextResponse.json(
        {
          status: 'error',
          error: 'Failed to connect WhatsApp',
          reasonCode: 'META_API_ERROR',
        },
        { status: 500 },
      );
    }
  },
);
