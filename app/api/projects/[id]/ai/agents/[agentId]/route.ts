import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { agentService, AgentNotFoundError } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/agents/[agentId]
 * Retrieves agent details with current published and draft versions.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const agent = await agentService.getAgentById(workspace.id, projectId, agentId);

    return NextResponse.json({ status: 'ok', data: agent });
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
    console.error('GET /api/projects/[id]/ai/agents/[agentId] error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to fetch agent' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/ai/agents/[agentId]
 * Updates agent details and active draft configuration.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();

    const updated = await agentService.updateDraft({
      workspaceId: workspace.id,
      projectId,
      agentId,
      ...body,
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
    console.error('PATCH /api/projects/[id]/ai/agents/[agentId] error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to update agent' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/ai/agents/[agentId]
 * Archives an AI agent.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.ADMIN, user.id);

    await agentService.archiveAgent(workspace.id, projectId, agentId, user.id);

    return NextResponse.json({ status: 'ok', message: 'Agent archived successfully.' });
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
    console.error('DELETE /api/projects/[id]/ai/agents/[agentId] error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to archive agent' }, { status: 500 });
  }
}
