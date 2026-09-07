import { type NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/authWrapper';
import { whatsappConnectionService } from '@/lib/services/whatsapp/connectionService';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/whatsapp
 * Returns connected WhatsApp accounts and phone numbers for the caller's active workspace.
 */
export const GET = withPermission(
  PERMISSIONS.WHATSAPP_VIEW,
  async function getWorkspaceConnections(_request: NextRequest, session) {
    try {
      const workspaceId = session.workspace.workspaceId;
      const connections = await whatsappConnectionService.getWorkspaceConnections(workspaceId);

      return NextResponse.json({
        status: 'ok',
        data: connections,
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
