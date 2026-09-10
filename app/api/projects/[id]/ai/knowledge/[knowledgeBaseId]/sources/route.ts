import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { KnowledgeService } from '@/lib/services/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources
 * Lists all sources belonging to the knowledge base.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const sources = await KnowledgeService.listSources(workspace.id, projectId, knowledgeBaseId);

    return NextResponse.json({
      status: 'ok',
      data: sources,
    });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('GET /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to list sources' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources
 * Adds a new source (file upload, URL, FAQ, or plain text).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeBaseId: string }> }
) {
  try {
    const { id: projectId, knowledgeBaseId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER, user.id);

    const contentType = request.headers.get('content-type') || '';

    let type = '';
    let name = '';
    let sourceUrl: string | undefined;
    let rawText: string | undefined;
    let fileBuffer: Buffer | undefined;
    let mimeType: string | undefined;
    let filename: string | undefined;
    let metadata: Record<string, any> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      type = String(formData.get('type') || '').toUpperCase();
      name = String(formData.get('name') || file?.name || 'Uploaded Document');
      sourceUrl = formData.get('sourceUrl') ? String(formData.get('sourceUrl')) : undefined;
      rawText = formData.get('rawText') ? String(formData.get('rawText')) : undefined;

      const rawMetadata = formData.get('metadata');
      if (rawMetadata) {
        try {
          metadata = JSON.parse(String(rawMetadata));
        } catch {
          // ignore malformed metadata
        }
      }

      if (file) {
        filename = file.name;
        mimeType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);

        // Auto-detect type from file extension if not provided
        if (!type) {
          const ext = filename.split('.').pop()?.toUpperCase() || '';
          if (['PDF', 'DOCX', 'TXT', 'CSV'].includes(ext)) {
            type = ext;
          } else {
            type = 'TXT';
          }
        }
      }
    } else {
      const body = await request.json();
      type = String(body.type || '').toUpperCase();
      name = String(body.name || '').trim();
      sourceUrl = body.sourceUrl ? String(body.sourceUrl).trim() : undefined;
      rawText = body.rawText ? String(body.rawText) : undefined;
      metadata = body.metadata || {};
    }

    if (!type) {
      return NextResponse.json({ status: 'error', error: 'Source type is required' }, { status: 400 });
    }

    if (!name) {
      name = sourceUrl || filename || `${type} Source`;
    }

    const source = await KnowledgeService.addSource(workspace.id, projectId, knowledgeBaseId, user.id, {
      type,
      name,
      sourceUrl,
      rawText,
      metadata,
      fileBuffer,
      mimeType,
      filename,
    });

    return NextResponse.json({
      status: 'ok',
      data: source,
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    console.error('POST /api/projects/[id]/ai/knowledge/[knowledgeBaseId]/sources error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to add knowledge source' },
      { status: 500 }
    );
  }
}
