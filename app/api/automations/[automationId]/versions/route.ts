import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';
import { validateUuid } from '@/lib/services/automation/validation';
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
 * GET /api/automations/[automationId]/versions
 * Lists all versions of an automation.
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
 * POST /api/automations/[automationId]/versions
 * Creates a new draft version.
 * Required role: MANAGER or higher.
 */
export async function POST(
  request: NextRequest,
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
