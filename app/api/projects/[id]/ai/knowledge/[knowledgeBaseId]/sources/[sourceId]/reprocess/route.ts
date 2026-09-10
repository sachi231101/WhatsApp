import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeService } from '@/lib/services/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources/[sourceId]/reprocess
 * Triggers asynchronous reprocessing of a knowledge source.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string; sourceId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId, sourceId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    await KnowledgeService.reprocessSource(workspace.id, projectId, knowledgeBaseId, sourceId, user.id);

    return NextResponse.json({
      status: 'ok',
      data: { reprocessed: true },
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources/[sourceId]/reprocess error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to reprocess source' },
      { status: 500 }
    );
  }
}
