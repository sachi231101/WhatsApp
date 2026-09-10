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
} from '@/lib/services/automation/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/automations
 * Lists automations for the authorized project.
 * Required role: VIEWER or higher.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.VIEWER,
    });

    const { searchParams } = new URL(request.url);
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
 * POST /api/projects/[id]/automations
 * Creates a new automation with an initial draft Version 1.
 * Required role: MANAGER or higher.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { workspace, user } = await authorizeAutomationAccess({
      projectId,
      minRole: WORKSPACE_ROLES.MANAGER,
    });

    const body = await request.json();
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
