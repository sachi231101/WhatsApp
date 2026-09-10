import { type NextRequest, NextResponse } from 'next/server';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/automations/[automationId]/pause
 * Pauses an active automation.
 * Required role: MANAGER or higher.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  try {
    const { id: projectId, automationId } = await params;
    const { workspace, user } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.MANAGER,
      automationId,
    });

    const paused = await automationService.pauseAutomation(
      workspace.id,
      projectId,
      automationId,
      user.id
    );

    return NextResponse.json({
      status: 'ok',
      data: paused,
      message: 'Automation paused successfully',
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
