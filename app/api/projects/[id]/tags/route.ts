import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { tagService } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/tags
 * Lists all tags defined for this project.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const tags = await tagService.getProjectTags(workspace.id, projectId);

    return NextResponse.json({
      status: 'ok',
      data: tags,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError || error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[TagsAPI] Error fetching project tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/tags
 * Creates a new tag for this project.
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
    const { name, color = '#1b59f8' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Tag name is required.' }, { status: 400 });
    }

    const tag = await tagService.createTag(workspace.id, projectId, String(name).trim(), color);

    return NextResponse.json({
      status: 'ok',
      data: tag,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthenticationRequiredError || error.statusCode === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[TagsAPI] Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
