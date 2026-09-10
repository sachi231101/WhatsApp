import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { workspaceService } from '@/lib/services/tenants/workspaceService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/onboarding
 * Creates a workspace for a newly registered or onboarding user.
 * Assigns OWNER membership transactionally.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'We couldn’t sign you in. Please try again.' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, slug, projectName } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Workspace name is required.' },
        { status: 400 },
      );
    }

    const cleanName = name.trim();
    const cleanSlug = typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
    const cleanProjectName = typeof projectName === 'string' && projectName.trim() ? projectName.trim() : undefined;

    // Transactional workspace creation + OWNER membership + default project
    const workspace = await workspaceService.createWorkspace({
      name: cleanName,
      slug: cleanSlug,
      projectName: cleanProjectName,
      createdByUserId: user.id,
    });

    const response = NextResponse.json(
      {
        status: 'ok',
        data: workspace,
      },
      { status: 201 },
    );

    // Set cookie for active workspace
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
  } catch (error: any) {
    console.error('Workspace onboarding error:', error);
    return NextResponse.json(
      { error: 'We couldn’t create your workspace. Try again.' },
      { status: 500 },
    );
  }
}
