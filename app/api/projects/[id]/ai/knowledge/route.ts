import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeService } from '@/lib/services/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/knowledge
 * Lists knowledge bases for the authorized project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const knowledgeBases = await KnowledgeService.listKnowledgeBases(workspace.id, projectId);

    return NextResponse.json({
      status: 'ok',
      data: knowledgeBases,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('GET /api/projects/[id]/ai/knowledge error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to list knowledge bases' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/ai/knowledge
 * Creates a new knowledge base.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ status: 'error', error: 'Name is required' }, { status: 400 });
    }

    const kb = await KnowledgeService.createKnowledgeBase(workspace.id, projectId, user.id, {
      name: String(body.name).trim(),
      description: body.description ? String(body.description).trim() : undefined,
    });

    return NextResponse.json({
      status: 'ok',
      data: kb,
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/knowledge error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to create knowledge base' },
      { status: 500 }
    );
  }
}
