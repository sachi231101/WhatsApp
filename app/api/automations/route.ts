import { type NextRequest, NextResponse } from 'next/server';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { automationService } from '@/lib/services/automation';
import {
  authorizeAutomationAccess,
  handleApiError,
} from '@/lib/services/automation/authorization';
import {
  validateCreateAutomation,
  validateListQuery,
  validateUuid,
  ValidationError,
} from '@/lib/services/automation/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/automations?projectId=...
 * Lists automations for the authorized project.
 * Required role: VIEWER or higher.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('projectId');
    if (!projectIdParam) {
      throw new ValidationError('Query parameter "projectId" is required.');
    }
    const projectId = validateUuid(projectIdParam, 'Project ID');

    const { workspace } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.VIEWER,
    });

    const { status, search, limit, offset } = validateListQuery(searchParams);

    const result = await automationService.listAutomations({
      workspaceId: workspace.id,
      projectId,
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      status: 'ok',
      data: result.automations,
      totalCount: result.totalCount,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

/**
 * POST /api/automations
 * Creates a new automation.
 * Required body: { projectId, name, description? }
 * Required role: MANAGER or higher.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !body.projectId) {
      throw new ValidationError('Field "projectId" is required in request body.');
    }
    const projectId = validateUuid(body.projectId, 'Project ID');

    const { workspace, user } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.MANAGER,
    });

    const { name, description } = validateCreateAutomation(body);

    const result = await automationService.createAutomation({
      workspaceId: workspace.id,
      projectId,
      name,
      description,
      userId: user.id,
    });

    return NextResponse.json(
      {
        status: 'ok',
        data: {
          automation: result.automation,
          draftVersion: result.draftVersion,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return handleApiError(err);
  }
}
