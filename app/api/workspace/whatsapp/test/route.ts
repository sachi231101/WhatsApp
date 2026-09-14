import { type NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/authWrapper';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';
import { resolveDefaultWorkspaceProject } from '@/lib/services/whatsapp/resolveDefaultProject';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/whatsapp/test
 * Runs a real Meta Graph API health check against the workspace's default project connection.
 */
export const POST = withPermission(
  PERMISSIONS.WHATSAPP_VIEW,
  async function testWorkspaceWhatsApp(_request: NextRequest, session) {
    try {
      const workspaceId = session.workspace.workspaceId;
      const project = await resolveDefaultWorkspaceProject(workspaceId);
      const health = await projectConnectionService.checkConnectionHealth(project.id);
      const connection = await projectConnectionService.getProjectConnection(project.id);

      return NextResponse.json({
        status: health.healthy ? 'ok' : 'error',
        data: {
          health,
          connection,
          projectId: project.id,
          reasonCode: health.reasonCode,
          message: health.message,
        },
      });
    } catch (error) {
      console.error('Failed to test WhatsApp connection:', error);
      return NextResponse.json(
        {
          status: 'error',
          error: 'Failed to verify WhatsApp connection',
          reasonCode: 'META_API_ERROR',
        },
        { status: 500 },
      );
    }
  },
);
