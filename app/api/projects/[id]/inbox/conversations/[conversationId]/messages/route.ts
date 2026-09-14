import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { inboxService, WhatsAppNotConnectedError } from '@/lib/services/inbox/inboxService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/inbox/conversations/[conversationId]/messages
 * Retrieves messages and internal notes for a conversation with cursor pagination.
 * Marks unread messages as read.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  try {
    const { id: projectId, conversationId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, undefined, user.id);

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

    const result = await inboxService.getMessages(
      workspace.id,
      projectId,
      conversationId,
      cursor,
      limit,
    );

    if (!result) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Automatically mark conversation as read upon viewing
    await inboxService.markConversationRead(workspace.id, projectId, conversationId);

    return NextResponse.json({
      status: 'ok',
      data: result.messages,
      windowExpiresAt: result.windowExpiresAt,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
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
    if (error.message?.includes('Conversation not found') || error.message?.includes('access denied')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('[InboxAPI] Error retrieving messages:', error);
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/inbox/conversations/[conversationId]/messages
 * Dispatches an outbound customer message with status QUEUED and BullMQ processing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  try {
    const { id: projectId, conversationId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, undefined, user.id);

    const body = await request.json();
    const { content, type = 'text', idempotencyKey, replyToMessageId } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const result = await inboxService.sendOutboundMessage({
      workspaceId: workspace.id,
      projectId,
      conversationId,
      userId: user.id,
      content,
      type,
      idempotencyKey,
      replyToMessageId,
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          windowExpired: Boolean(result.windowExpired),
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      status: 'ok',
      data: result.message,
      jobId: result.jobId,
      deduplicated: result.deduplicated,
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
    if (error instanceof WhatsAppNotConnectedError || error.code === 'WHATSAPP_NOT_CONNECTED') {
      return NextResponse.json(
        {
          error: error.message || 'WhatsApp is not connected',
          code: 'WHATSAPP_NOT_CONNECTED',
        },
        { status: 409 },
      );
    }
    if (error.message?.includes('Conversation not found') || error.message?.includes('access denied')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('[InboxAPI] Error dispatching message:', error);
    return NextResponse.json(
      { error: 'Unable to send message. Please try again.' },
      { status: 500 },
    );
  }
}
