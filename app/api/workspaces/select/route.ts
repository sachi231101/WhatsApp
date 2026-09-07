import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { resolveWorkspaceContext } from '@/lib/auth/context';
import { memberService } from '@/lib/services/tenants/memberService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/select
 * Switches the active workspace for the user and sets the HTTP-only cookie.
 */
export const POST = withAuth(async function selectWorkspace(request: NextRequest, session) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Verify user is an active member or super admin
    const member = await memberService.getMember(workspaceId, session.workspace.userId);
    if (!member && !session.workspace.isSuperAdmin) {
      return NextResponse.json(
        { error: 'You do not have access to this workspace', code: 'WORKSPACE_ACCESS_DENIED' },
        { status: 403 },
      );
    }

    // Resolve context for the selected workspace
    const newContext = await resolveWorkspaceContext(
      session.user.email!,
      session.user.name,
      workspaceId,
    );

    const response = NextResponse.json({
      status: 'ok',
      data: newContext,
    });

    // Set HTTP-only cookie persisting the active workspace
    response.cookies.set('wazzapp_workspace_id', workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Failed to switch workspace:', error);
    return NextResponse.json(
      { error: 'Failed to switch workspace' },
      { status: 500 },
    );
  }
});
