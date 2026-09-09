import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { inboxService } from '@/lib/services/inbox/inboxService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/inbox/conversations/[conversationId]/messages/[messageId]/retry
 * Retries a failed outbound message by re-queueing to BullMQ.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string; messageId: string }> },
) {
  try {
    const { id: projectId, conversationId, messageId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, undefined, user.id);

    const result = await inboxService.retryFailedMessage({
      workspaceId: workspace.id,
      projectId,
      conversationId,
      messageId,
    });

    return NextResponse.json({
      status: 'ok',
      data: result,
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

    console.error('[InboxAPI] Error retrying message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry message' },
      { status: 500 },
    );
  }
}
