import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { workspaceService } from '@/lib/services/tenants/workspaceService';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces
 * Lists all workspaces available to the authenticated user.
 */
export const GET = withAuth(async function listWorkspaces(_request: NextRequest, session) {
  try {
    const userId = session.workspace.userId;
    const workspaces = await workspaceService.getUserWorkspaces(userId);

    // Enrich each workspace with its connected WhatsApp number and metadata
    const data = await Promise.all(
      workspaces.map(async (w) => {
        let connectedNumber = 'N/A';
        let status = 'Created';

        try {
          const { rows } = await sql`
            SELECT display_phone_number, status
            FROM whatsapp_phone_numbers
            WHERE workspace_id = ${w.id}
            LIMIT 1
          `;
          if (rows.length > 0 && rows[0].display_phone_number) {
            connectedNumber = rows[0].display_phone_number;
            status = rows[0].status === 'CONNECTED' ? 'Active' : 'Created';
          }
        } catch (dbErr) {
          console.warn(`Could not fetch phone for workspace ${w.id}:`, dbErr);
        }

        return {
          id: w.id,
          name: w.name,
          slug: w.slug,
          status,
          activePlan: 'FREE FOREVER',
          connectedNumber,
          role: w.role,
          createdAt: w.createdAt,
          isActive: w.id === session.workspace.workspaceId,
        };
      }),
    );

    return NextResponse.json({
      status: 'ok',
      data,
      userName: session.workspace.userName || session.user.name || 'User',
      userEmail: session.user.email,
      activeWorkspaceId: session.workspace.workspaceId,
      needsOnboarding: workspaces.length === 0,
    });
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    return NextResponse.json(
      { error: 'We couldn’t load your workspace. Try again.' },
      { status: 500 },
    );
  }
});

/**
 * POST /api/workspaces
 * Creates a new workspace for the authenticated user with transactional OWNER membership.
 */
export const POST = withAuth(async function createWorkspace(request: NextRequest, session) {
  try {
    const body = await request.json();
    const { name, slug, timezone, defaultLocale, projectName } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Workspace name is required.' },
        { status: 400 },
      );
    }

    const cleanName = name.trim();
    const cleanSlug = typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
    const cleanProjectName = typeof projectName === 'string' && projectName.trim() ? projectName.trim() : undefined;

    const workspace = await workspaceService.createWorkspace({
      tenantId: session.workspace.tenantId,
      name: cleanName,
      slug: cleanSlug,
      projectName: cleanProjectName,
      timezone: typeof timezone === 'string' ? timezone.trim() : undefined,
      defaultLocale: typeof defaultLocale === 'string' ? defaultLocale.trim() : undefined,
      createdByUserId: session.workspace.userId,
    });

    const response = NextResponse.json(
      {
        status: 'ok',
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          status: 'Created',
          activePlan: 'FREE FOREVER',
          connectedNumber: 'N/A',
          role: workspace.role,
          defaultProjectId: workspace.defaultProjectId,
          defaultProject: workspace.defaultProject,
          createdAt: workspace.createdAt,
          isActive: true,
        },
      },
      { status: 201 },
    );

    // Automatically set cookie for newly created workspace
    response.cookies.set('wazzapp_workspace_id', workspace.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    if (workspace.defaultProjectId) {
      response.cookies.set('wazzapp_project_id', workspace.defaultProjectId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 },
    );
  }
});
