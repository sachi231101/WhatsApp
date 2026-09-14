import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { memberService } from '@/lib/services/tenants/memberService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team
 * Retrieves the team members belonging to the active workspace.
 */
export const GET = withAuth(async function listTeam(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const members = await memberService.getWorkspaceMembers(workspaceId);

    return NextResponse.json({
      status: 'ok',
      data: members,
    });
  } catch (error) {
    console.error('Failed to retrieve team members:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve team members' },
      { status: 500 }
    );
  }
});
