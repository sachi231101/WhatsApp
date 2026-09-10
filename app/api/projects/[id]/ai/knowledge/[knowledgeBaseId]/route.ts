import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeService } from '@/lib/services/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/knowledge/[knowledgeBaseId]
 * Retrieves details of a specific knowledge base.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const kb = await KnowledgeService.getKnowledgeBase(workspace.id, projectId, knowledgeBaseId);
    if (!kb) {
      return NextResponse.json({ status: 'error', error: 'Knowledge base not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'ok',
      data: kb,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('GET /api/projects/[id]/ai/knowledge/[knowledgeBaseId] error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to get knowledge base' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/ai/knowledge/[knowledgeBaseId]
 * Updates a knowledge base (name, description, status).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const body = await request.json();
    const updated = await KnowledgeService.updateKnowledgeBase(
      workspace.id,
      projectId,
      knowledgeBaseId,
      user.id,
      body
    );

    return NextResponse.json({
      status: 'ok',
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('PATCH /api/projects/[id]/ai/knowledge/[knowledgeBaseId] error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to update knowledge base' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/ai/knowledge/[knowledgeBaseId]
 * Archives a knowledge base.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    await KnowledgeService.archiveKnowledgeBase(workspace.id, projectId, knowledgeBaseId, user.id);

    return NextResponse.json({
      status: 'ok',
      data: { archived: true },
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('DELETE /api/projects/[id]/ai/knowledge/[knowledgeBaseId] error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to archive knowledge base' },
      { status: 500 }
    );
  }
}
