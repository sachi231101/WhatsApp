import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { agentService, AgentNotFoundError } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/agents/[agentId]/usage
 * Retrieves usage metrics summary for an agent.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const usage = await agentService.getAgentUsageSummary(workspace.id, projectId, agentId);

    return NextResponse.json({ status: 'ok', data: usage });
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
    console.error('GET /api/projects/[id]/ai/agents/[agentId]/usage error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to fetch agent usage' }, { status: 500 });
  }
}
