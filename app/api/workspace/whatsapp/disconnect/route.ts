import { type NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/authWrapper';
import { whatsappConnectionService } from '@/lib/services/whatsapp/connectionService';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/whatsapp/disconnect
 * Disconnects a WABA from the active workspace.
 */
export const POST = withPermission(
  PERMISSIONS.WHATSAPP_MANAGE,
  async function disconnectWorkspaceWaba(request: NextRequest, session) {
    try {
      const body = await request.json();
      const { wabaId } = body;

      if (!wabaId || typeof wabaId !== 'string') {
        return NextResponse.json(
          { error: 'wabaId is required' },
          { status: 400 },
        );
      }

      const workspaceId = session.workspace.workspaceId;
      const success = await whatsappConnectionService.disconnectWaba(workspaceId, wabaId);

      if (!success) {
        return NextResponse.json(
          { error: 'WABA not found in this workspace' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        status: 'ok',
        message: 'WABA disconnected successfully',
      });
    } catch (error) {
      console.error('Failed to disconnect WABA:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect WABA' },
        { status: 500 },
      );
    }
  },
);
