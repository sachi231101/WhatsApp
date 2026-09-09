import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { inboxService } from '@/lib/services/inbox/inboxService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/inbox/conversations/[conversationId]/assign
 * Assigns a conversation to an authorized workspace team member or unassigns it.
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
    const { targetUserId } = body;

    const result = await inboxService.assignConversation({
      workspaceId: workspace.id,
      projectId,
      conversationId,
      targetUserId: targetUserId || null,
      assignedByUserId: user.id,
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

    if (error.message?.includes('Target user does not belong')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[InboxAPI] Error assigning conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign conversation' },
      { status: 500 },
    );
  }
}
