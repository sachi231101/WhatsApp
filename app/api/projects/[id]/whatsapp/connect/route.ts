import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/whatsapp/connect
 * Receives Meta Embedded Signup code & sessionInfo, exchanges token,
 * discovers WABA/phone numbers, subscribes webhook, and persists connection.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    // Minimum role: MEMBER (MEMBER, ADMIN, OWNER can connect)
    const { project, workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.MEMBER);

    const body = await request.json();
    const { code, appId, sessionInfo, wabaId, phoneNumberId, isCallingEnabled } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: "We couldn't authenticate with Meta. Please try again." },
        { status: 400 },
      );
    }

    if (!appId || typeof appId !== 'string') {
      return NextResponse.json(
        { error: 'Meta App ID is required.' },
        { status: 400 },
      );
    }

    const connection = await projectConnectionService.connectProject({
      projectId: project.id,
      workspaceId: workspace.id,
      code,
      appId,
      sessionInfo: sessionInfo || null,
      directWabaId: wabaId,
      directPhoneId: phoneNumberId,
      isCallingEnabled: Boolean(isCallingEnabled),
    });

    return NextResponse.json({
      status: 'ok',
      data: connection,
      message: 'WhatsApp Business account connected successfully.',
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden', message: error.message }, { status: 403 });
    }

    const userMessage = error?.message || 'Failed to connect WhatsApp Business account.';
    console.error('Error connecting project WhatsApp:', error);

    return NextResponse.json(
      { error: userMessage },
      { status: 400 },
    );
  }
}
