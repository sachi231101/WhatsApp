import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { workspaceService } from '@/lib/services/tenants/workspaceService';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces
 * Lists all projects (workspaces) available to the authenticated user.
 * Auto-provisions a default project if the user currently has none.
 */
export const GET = withAuth(async function listWorkspaces(_request: NextRequest, session) {
  try {
    const userId = session.workspace.userId;
    let workspaces = await workspaceService.getUserWorkspaces(userId);

    // If no workspaces exist yet, auto-provision a default project
    if (workspaces.length === 0) {
      const defaultWs = await workspaceService.createWorkspace({
        tenantId: session.workspace.tenantId,
        name: 'Default Project',
        slug: 'default-project',
        createdByUserId: userId,
      });
      workspaces = [defaultWs];
    }

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
    });
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve workspaces' },
      { status: 500 },
    );
  }
});

/**
 * POST /api/workspaces
 * Creates a new project (workspace) for the user.
 */
export const POST = withAuth(async function createWorkspace(request: NextRequest, session) {
  try {
    const body = await request.json();
    const { name, slug, timezone, defaultLocale } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required.' },
        { status: 400 },
      );
    }

    const cleanName = name.trim();
    const cleanSlug =
      typeof slug === 'string' && slug.trim()
        ? slug.trim()
        : cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36).slice(-4);

    const workspace = await workspaceService.createWorkspace({
      tenantId: session.workspace.tenantId,
      name: cleanName,
      slug: cleanSlug,
      timezone: typeof timezone === 'string' ? timezone.trim() : undefined,
      defaultLocale: typeof defaultLocale === 'string' ? defaultLocale.trim() : undefined,
      createdByUserId: session.workspace.userId,
    });

    return NextResponse.json(
      {
        status: 'ok',
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          status: 'Created',
          activePlan: 'FREE FOREVER',
          connectedNumber: 'N/A',
          createdAt: workspace.createdAt,
          isActive: false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 },
    );
  }
});
