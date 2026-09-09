import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { contactService } from '@/lib/services/contacts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/contacts
 * Lists contacts for the authorized project with search, filters, and pagination.
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
    const search = searchParams.get('search') || undefined;
    const filter = (searchParams.get('filter') || 'all') as any;
    const tagId = searchParams.get('tagId') || undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const result = await contactService.getContacts({
      workspaceId: workspace.id,
      projectId,
      search,
      filter,
      tagId,
      limit,
      offset,
      cursor,
    });

    return NextResponse.json({
      status: 'ok',
      data: result.contacts,
      totalCount: result.totalCount,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
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

    console.error('[ContactsAPI] Error listing contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/contacts
 * Creates a new contact under the authorized project.
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
    const { firstName, lastName, displayName, phone, email, company, leadScore, status, tagIds } = body;

    if (!phone || !String(phone).trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const newContact = await contactService.createContact({
      workspaceId: workspace.id,
      projectId,
      firstName,
      lastName,
      displayName,
      phone: String(phone).trim(),
      email: email ? String(email).trim() : undefined,
      company: company ? String(company).trim() : undefined,
      leadScore: leadScore !== undefined ? Number(leadScore) : 50,
      status: status || 'ACTIVE',
      tagIds: Array.isArray(tagIds) ? tagIds : [],
      actorId: user.id,
      actorName: user.name || user.email,
    });

    return NextResponse.json({
      status: 'ok',
      data: newContact,
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

    // Validation or duplicate errors
    if (error.message && (error.message.includes('already exists') || error.message.includes('valid phone') || error.message.includes('valid email'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[ContactsAPI] Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
