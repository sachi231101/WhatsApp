import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeService } from '@/lib/services/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources/[sourceId]
 * Retrieves source details with extracted document and chunk previews.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string; sourceId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId, sourceId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const source = await KnowledgeService.getSource(workspace.id, projectId, knowledgeBaseId, sourceId);
    if (!source) {
      return NextResponse.json({ status: 'error', error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'ok',
      data: source,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('GET /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources/[sourceId] error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to get source details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources/[sourceId]
 * Deletes a source, its chunks, and associated stored object files.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string; sourceId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId, sourceId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    await KnowledgeService.deleteSource(workspace.id, projectId, knowledgeBaseId, sourceId, user.id);

    return NextResponse.json({
      status: 'ok',
      data: { deleted: true },
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('DELETE /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources/[sourceId] error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to delete source' },
      { status: 500 }
    );
  }
}
