import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';
import {
  validateUpdateAutomation,
  validateUuid,
} from '@/lib/services/automation/validation';
import { AutomationNotFoundError } from '@/lib/services/automation/types';

export const dynamic = 'force-dynamic';

async function resolveProjectId(automationId: string): Promise<string> {
  validateUuid(automationId, 'Automation ID');
  const { rows } = await sql`
    SELECT project_id FROM automations WHERE id = ${automationId};
  `;
  if (!rows || rows.length === 0) {
    throw new AutomationNotFoundError();
  }
  return rows[0].project_id;
}

/**
 * GET /api/automations/[automationId]
 * Retrieves an automation by ID.
 * Required role: VIEWER or higher.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const { automationId } = await params;
    const projectId = await resolveProjectId(automationId);

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
 * PATCH /api/automations/[automationId]
 * Updates an automation.
 * Required role: MANAGER or higher.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const { automationId } = await params;
    const body = await request.json();
    const updates = validateUpdateAutomation(body);

    const projectId = await resolveProjectId(automationId);
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
 * DELETE /api/automations/[automationId]
 * Archives an automation.
 * Required role: MANAGER or higher.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> }
) {
  try {
    const { automationId } = await params;
    const projectId = await resolveProjectId(automationId);

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
