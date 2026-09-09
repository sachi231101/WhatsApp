import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { agentService } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/agents
 * Lists AI agents for the authorized project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const result = await agentService.getAgents({
      workspaceId: workspace.id,
      projectId,
      status,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      status: 'ok',
      data: result.agents,
      totalCount: result.totalCount,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('GET /api/projects/[id]/ai/agents error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to list agents' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/ai/agents
 * Creates a new AI Agent with initial Draft version.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    const {
      name,
      description,
      role,
      systemInstructions,
      tone,
      language,
      greetingMessage,
      fallbackMessage,
      responseBehavior,
      escalationEnabled,
      escalationMessage,
      escalationConditions,
      maxResponseLength,
      temperature,
      model,
      provider,
      handlingMode,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ status: 'error', error: 'Agent name is required' }, { status: 400 });
    }
    if (!role || typeof role !== 'string' || !role.trim()) {
      return NextResponse.json({ status: 'error', error: 'Agent role is required' }, { status: 400 });
    }
    if (!systemInstructions || typeof systemInstructions !== 'string' || !systemInstructions.trim()) {
      return NextResponse.json({ status: 'error', error: 'System instructions are required' }, { status: 400 });
    }

    const created = await agentService.createAgent({
      workspaceId: workspace.id,
      projectId,
      name: name.trim(),
      description,
      role: role.trim(),
      systemInstructions: systemInstructions.trim(),
      tone,
      language,
      greetingMessage,
      fallbackMessage,
      responseBehavior,
      escalationEnabled,
      escalationMessage,
      escalationConditions,
      maxResponseLength,
      temperature,
      model,
      provider,
      handlingMode,
      userId: user.id,
    });

    return NextResponse.json({ status: 'ok', data: created }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Permission denied' }, { status: 403 });
    }
    if (err instanceof ProjectNotFoundError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/agents error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'Failed to create agent' }, { status: 500 });
  }
}
