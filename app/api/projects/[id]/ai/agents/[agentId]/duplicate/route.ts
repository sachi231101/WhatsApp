import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { agentService, AgentNotFoundError } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/ai/agents/[agentId]/duplicate
 * Duplicates an existing agent into a new draft agent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json().catch(() => ({}));
    const newName = body.name ? String(body.name).trim() : undefined;

    const duplicated = await agentService.duplicateAgent({
      workspaceId: workspace.id,
      projectId,
      agentId,
      newName,
      userId: user.id,
    });

    return NextResponse.json({ status: 'ok', data: duplicated }, { status: 201 });
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
    console.error('POST /api/projects/[id]/ai/agents/[agentId]/duplicate error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to duplicate agent' }, { status: 400 });
  }
}
