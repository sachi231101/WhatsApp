import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { contactService, ContactNotFoundError } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/contacts/[contactId]
 * Fetches Customer 360 profile for a single contact.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { id: projectId, contactId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const contact = await contactService.getContactById(workspace.id, projectId, contactId);

    return NextResponse.json({
      status: 'ok',
      data: contact,
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

    console.error('[ContactsAPI] Error fetching contact details:', error);
    return NextResponse.json({ error: 'Failed to fetch contact details' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/contacts/[contactId]
 * Updates contact information. Strictly enforces tenant/project boundaries.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { id: projectId, contactId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    const { firstName, lastName, displayName, phone, email, company, leadScore, status } = body;

    const updated = await contactService.updateContact({
      workspaceId: workspace.id,
      projectId,
      contactId,
      firstName,
      lastName,
      displayName,
      phone,
      email,
      company,
      leadScore,
      status,
      actorId: user.id,
      actorName: user.name || user.email,
    });

    return NextResponse.json({
      status: 'ok',
      data: updated,
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

    if (error.message && (error.message.includes('valid') || error.message.includes('already exists') || error.message.includes('between 0 and 100'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[ContactsAPI] Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
