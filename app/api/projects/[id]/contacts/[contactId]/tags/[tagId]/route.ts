import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { tagService, ContactNotFoundError } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/projects/[id]/contacts/[contactId]/tags/[tagId]
 * Removes a tag from this contact.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string; tagId: string }> },
) {
  try {
    const { id: projectId, contactId, tagId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    await tagService.removeTagFromContact(
      workspace.id,
      projectId,
      contactId,
      tagId,
      user.id,
      user.name || user.email,
    );

    return NextResponse.json({
      status: 'ok',
      message: 'Tag removed successfully.',
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

    console.error('[ContactsAPI] Error removing tag from contact:', error);
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
  }
}
