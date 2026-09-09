import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { inboxService } from '@/lib/services/inbox/inboxService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/inbox/conversations/[conversationId]/handling-mode
 * Updates AI vs Human handling mode (takeover / return to AI).
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
    const { handlingMode, reason } = body;

    if (!['AI_HANDLING', 'HUMAN_HANDLING', 'HYBRID'].includes(handlingMode)) {
      return NextResponse.json(
        { error: 'Invalid handling mode. Must be AI_HANDLING, HUMAN_HANDLING, or HYBRID.' },
        { status: 400 },
      );
    }

    const result = await inboxService.updateHandlingMode({
      workspaceId: workspace.id,
      projectId,
      conversationId,
      handlingMode,
      userId: user.id,
      reason,
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

    console.error('[InboxAPI] Error updating handling mode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update handling mode' },
      { status: 500 },
    );
  }
}
