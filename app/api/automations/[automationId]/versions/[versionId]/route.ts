import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';
import {
  validateUpdateDraftVersion,
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
 * GET /api/automations/[automationId]/versions/[versionId]
 * Retrieves a specific version with full graph.
 * Required role: VIEWER or higher.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ automationId: string; versionId: string }> }
) {
  try {
    const { automationId, versionId } = await params;
    validateUuid(versionId, 'Version ID');
    const projectId = await resolveProjectId(automationId);

    const { workspace } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.VIEWER,
      automationId,
    });

    const graph = await automationService.getVersion(
      workspace.id,
      projectId,
      automationId,
      versionId
    );

    return NextResponse.json({
      status: 'ok',
      data: graph,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/automations/[automationId]/versions/[versionId]
 * Updates a draft version (nodes, edges, configuration).
 * Required role: MANAGER or higher.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string; versionId: string }> }
) {
  try {
    const { automationId, versionId } = await params;
    validateUuid(versionId, 'Version ID');
    const projectId = await resolveProjectId(automationId);

    const { workspace, user } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.MANAGER,
      automationId,
    });

    const body = await request.json();
    const validated = validateUpdateDraftVersion(body);

    const updatedGraph = await automationService.updateDraftVersion(
      workspace.id,
      projectId,
      automationId,
      versionId,
      validated,
      user.id
    );

    return NextResponse.json({
      status: 'ok',
      data: updatedGraph,
      message: 'Draft version updated successfully',
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
