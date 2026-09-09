import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { customFieldService, ContactNotFoundError } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/contacts/[contactId]/custom-fields
 * Retrieves defined custom fields and their current values for this contact.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { id: projectId, contactId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const values = await customFieldService.getFieldValuesForContact(workspace.id, projectId, contactId);

    return NextResponse.json({
      status: 'ok',
      data: values,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError || error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ProjectNotFoundError || error instanceof ContactNotFoundError || error.code === 'PROJECT_NOT_FOUND' || error.code === 'CONTACT_NOT_FOUND') {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[CustomFieldsAPI] Error fetching contact field values:', error);
    return NextResponse.json({ error: 'Failed to fetch custom field values' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/contacts/[contactId]/custom-fields
 * Updates custom field values for this contact.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { id: projectId, contactId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    const { values } = body; // Array of { definitionId, value }

    if (!Array.isArray(values)) {
      return NextResponse.json({ error: 'values must be an array of { definitionId, value }.' }, { status: 400 });
    }

    for (const item of values) {
      if (item && item.definitionId) {
        await customFieldService.setFieldValueForContact(
          workspace.id,
          projectId,
          contactId,
          item.definitionId,
          item.value,
        );
      }
    }

    const updatedValues = await customFieldService.getFieldValuesForContact(workspace.id, projectId, contactId);

    return NextResponse.json({
      status: 'ok',
      data: updatedValues,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError || error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ProjectNotFoundError || error instanceof ContactNotFoundError || error.code === 'PROJECT_NOT_FOUND' || error.code === 'CONTACT_NOT_FOUND') {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[CustomFieldsAPI] Error updating contact custom fields:', error);
    return NextResponse.json({ error: error.message || 'Failed to update custom fields' }, { status: 400 });
  }
}
