import { type NextRequest, NextResponse } from 'next/server';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/automations/[automationId]/versions
 * Lists all versions of an automation.
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

    const versions = await automationService.getVersions(
      workspace.id,
      projectId,
      automationId
    );

    return NextResponse.json({
      status: 'ok',
      data: versions,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

/**
 * POST /api/projects/[id]/automations/[automationId]/versions
 * Creates a new draft version for the automation.
 * Required role: MANAGER or higher.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; automationId: string }> }
) {
  try {
    const { id: projectId, automationId } = await params;
    const { workspace, user } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.MANAGER,
      automationId,
    });

    let cloneFromVersionId: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === 'object' && body.cloneFromVersionId) {
        cloneFromVersionId = String(body.cloneFromVersionId).trim();
      }
    } catch {
      // Body is optional
    }

    const version = await automationService.createDraftVersion(
      workspace.id,
      projectId,
      automationId,
      { cloneFromVersionId },
      user.id
    );

    return NextResponse.json(
      {
        status: 'ok',
        data: version,
        message: 'Draft version created successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return handleApiError(err);
  }
}
