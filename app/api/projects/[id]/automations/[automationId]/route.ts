import { type NextRequest, NextResponse } from 'next/server';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';
import { validateUpdateAutomation } from '@/lib/services/automation/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/automations/[automationId]
 * Retrieves an automation by ID.
 * Required role: VIEWER or higher.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  try {
    const { id: projectId, automationId } = await params;
    const { workspace } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.VIEWER,
      automationId,
    });

    const automation = await automationService.getAutomation(
      workspace.id,
      projectId,
      automationId
    );

    return NextResponse.json({
      status: 'ok',
      data: automation,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/projects/[id]/automations/[automationId]
 * Updates an automation's name or description.
 * Required role: MANAGER or higher.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  try {
    const { id: projectId, automationId } = await params;
    const body = await request.json();
    const updates = validateUpdateAutomation(body);

    const { workspace, user } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.MANAGER,
      automationId,
    });

    const updated = await automationService.updateAutomation(
      workspace.id,
      projectId,
      automationId,
      updates,
      user.id
    );

    return NextResponse.json({
      status: 'ok',
      data: updated,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/projects/[id]/automations/[automationId]
 * Archives an automation.
 * Required role: MANAGER or higher.
 */
export async function DELETE(
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

    const archived = await automationService.archiveAutomation(
      workspace.id,
      projectId,
      automationId,
      user.id
    );

    return NextResponse.json({
      status: 'ok',
      data: archived,
      message: 'Automation archived successfully',
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
