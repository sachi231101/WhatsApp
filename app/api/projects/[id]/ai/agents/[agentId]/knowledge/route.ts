import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeService } from '@/lib/services/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/agents/[agentId]/knowledge
 * Lists all knowledge bases attached to this AI Agent.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const attached = await KnowledgeService.getAgentKnowledgeBases(workspace.id, projectId, agentId);

    return NextResponse.json({
      status: 'ok',
      data: attached,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('GET /api/projects/[id]/ai/agents/[agentId]/knowledge error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to get agent knowledge bases' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/ai/agents/[agentId]/knowledge
 * Attaches a knowledge base to this agent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    const knowledgeBaseId = body.knowledgeBaseId;
    if (!knowledgeBaseId) {
      return NextResponse.json({ status: 'error', error: 'knowledgeBaseId is required' }, { status: 400 });
    }

    await KnowledgeService.attachAgent(workspace.id, projectId, agentId, knowledgeBaseId, user.id);

    return NextResponse.json({
      status: 'ok',
      data: { attached: true },
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/agents/[agentId]/knowledge error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to attach knowledge base' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/ai/agents/[agentId]/knowledge
 * Detaches a knowledge base from this agent.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const { id: projectId, agentId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const { searchParams } = new URL(request.url);
    const knowledgeBaseId = searchParams.get('knowledgeBaseId');
    if (!knowledgeBaseId) {
      return NextResponse.json({ status: 'error', error: 'knowledgeBaseId query param is required' }, { status: 400 });
    }

    await KnowledgeService.detachAgent(workspace.id, projectId, agentId, knowledgeBaseId, user.id);

    return NextResponse.json({
      status: 'ok',
      data: { detached: true },
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('DELETE /api/projects/[id]/ai/agents/[agentId]/knowledge error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to detach knowledge base' },
      { status: 500 }
    );
  }
}
