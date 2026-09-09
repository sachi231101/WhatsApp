import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { contactService, ContactNotFoundError } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/contacts/[contactId]/score
 * Updates the contact lead score (range 0–100).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { id: projectId, contactId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    const { score } = body;

    if (score === undefined || score === null) {
      return NextResponse.json({ error: 'Score is required.' }, { status: 400 });
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      return NextResponse.json({ error: 'Score must be an integer between 0 and 100.' }, { status: 400 });
    }

    const updated = await contactService.updateContact({
      workspaceId: workspace.id,
      projectId,
      contactId,
      leadScore: numScore,
      actorId: user.id,
      actorName: user.name || user.email,
    });

    return NextResponse.json({
      status: 'ok',
      data: {
        contactId,
        leadScore: updated.leadScore,
      },
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

    console.error('[ContactsAPI] Error updating lead score:', error);
    return NextResponse.json({ error: 'Failed to update lead score' }, { status: 500 });
  }
}
