import { type NextRequest, NextResponse } from 'next/server';
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

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/automations/[automationId]/versions/[versionId]
 * Retrieves a specific version with its full graph (nodes, edges).
 * Required role: VIEWER or higher.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string; versionId: string }> }
) {
  try {
    const { id: projectId, automationId, versionId } = await params;
    validateUuid(versionId, 'Version ID');

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
 * PATCH /api/projects/[id]/automations/[automationId]/versions/[versionId]
 * Updates a draft version (nodes, edges, configuration).
 * Rejects modifications if the version is PUBLISHED or ARCHIVED.
 * Required role: MANAGER or higher.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string; versionId: string }> }
) {
  try {
    const { id: projectId, automationId, versionId } = await params;
    validateUuid(versionId, 'Version ID');

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
