import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { customFieldService } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/custom-fields
 * Lists all custom field definitions for this project.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const definitions = await customFieldService.getFieldDefinitions(workspace.id, projectId);

    return NextResponse.json({
      status: 'ok',
      data: definitions,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError || error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[CustomFieldsAPI] Error fetching field definitions:', error);
    return NextResponse.json({ error: 'Failed to fetch custom field definitions' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/custom-fields
 * Creates a new custom field definition in this project.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.ADMIN, user.id);

    const body = await request.json();
    const { name, key, type, required = false, options = [] } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Field name is required.' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: 'Field type is required.' }, { status: 400 });
    }

    const definition = await customFieldService.createFieldDefinition({
      workspaceId: workspace.id,
      projectId,
      name: String(name).trim(),
      key: key ? String(key).trim() : undefined,
      type,
      required: Boolean(required),
      options: Array.isArray(options) ? options : [],
    });

    return NextResponse.json({
      status: 'ok',
      data: definition,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError || error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[CustomFieldsAPI] Error creating field definition:', error);
    return NextResponse.json({ error: error.message || 'Failed to create field definition' }, { status: 400 });
  }
}
