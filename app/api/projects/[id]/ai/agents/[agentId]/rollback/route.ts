import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { agentService, AgentNotFoundError } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/ai/agents/[agentId]/rollback
 * Rolls back the agent to a previous version without mutating history.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.ADMIN, user.id);

    const body = await request.json();
    const versionNumber = Number(body.versionNumber);

    if (!versionNumber || isNaN(versionNumber) || versionNumber <= 0) {
      return NextResponse.json({ status: 'error', error: 'Valid versionNumber is required for rollback' }, { status: 400 });
    }

    const updated = await agentService.rollbackVersion({
      workspaceId: workspace.id,
      projectId,
      agentId,
      targetVersionNumber: versionNumber,
      userId: user.id,
    });

    return NextResponse.json({ status: 'ok', data: updated });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    if (err instanceof AgentNotFoundError) {
      return NextResponse.json({ status: 'error', error: 'Agent not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/agents/[agentId]/rollback error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to rollback agent version' }, { status: 400 });
  }
}
