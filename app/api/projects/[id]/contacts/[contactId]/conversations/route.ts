import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { contactService, ContactNotFoundError } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/contacts/[contactId]/conversations
 * Retrieves all conversations for this contact within the project.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { id: projectId, contactId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const conversations = await contactService.getContactConversations(workspace.id, projectId, contactId);

    return NextResponse.json({
      status: 'ok',
      data: conversations,
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

    console.error('[ContactsAPI] Error fetching contact conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
