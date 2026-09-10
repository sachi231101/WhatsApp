import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeSearchService } from '@/lib/services/knowledge/knowledgeSearchService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/search
 * Test semantic vector search against a specific knowledge base.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const body = await request.json();
    const query = (body.query || '').trim();

    if (!query) {
      return NextResponse.json({ status: 'error', error: 'Search query is required' }, { status: 400 });
    }

    const topK = body.topK ? Number(body.topK) : 5;
    const results = await KnowledgeSearchService.searchKnowledge({
      workspaceId: workspace.id,
      projectId,
      knowledgeBaseId,
      query,
      topK,
      minScore: 0.1, // Show broader results in test sandbox
    });

    return NextResponse.json({
      status: 'ok',
      data: results,
      totalCount: results.length,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/search error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to search knowledge base' },
      { status: 500 }
    );
  }
}
