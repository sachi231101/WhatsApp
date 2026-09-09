import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { inboxService } from '@/lib/services/inbox/inboxService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/inbox/conversations/[conversationId]
 * Retrieves conversation details along with full customer context.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  try {
    const { id: projectId, conversationId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, undefined, user.id);

    const conversation = await inboxService.getConversationDetails(
      workspace.id,
      projectId,
      conversationId,
    );

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'ok',
      data: conversation,
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

    console.error('[InboxAPI] Error fetching conversation details:', error);
    return NextResponse.json({ error: 'Failed to retrieve conversation details' }, { status: 500 });
  }
}
