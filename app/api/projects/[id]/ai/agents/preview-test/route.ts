import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { requireAuthenticatedUser, AuthenticationRequiredError } from '@/lib/auth/user';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { WORKSPACE_ROLES } from '@/lib/auth/roles';
import { AIOrchestrator } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/ai/agents/preview-test
 * Tests an unsaved agent draft in Step 5 of the creation wizard without persisting to the database.
 * Never sends WhatsApp messages or touches real customer conversations.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthenticatedUser();
    const { workspace } = await requireProjectAccess(projectId, WORKSPACE_ROLES.VIEWER, user.id);

    const body = await request.json();
    const rawMessages =
      body.messages ||
      body.conversationHistory ||
      (body.message ? [{ role: 'user', content: body.message }] : []);
    const messages = Array.isArray(rawMessages) ? rawMessages : [];
    const draftOverride = body.draftOverride && typeof body.draftOverride === 'object' ? body.draftOverride : undefined;

    if (messages.length === 0) {
      return NextResponse.json({ status: 'error', error: 'At least one message is required to test' }, { status: 400 });
    }

    const result = await AIOrchestrator.testAgent({
      workspaceId: workspace.id,
      projectId,
      agentId: 'preview',
      messages,
      draftOverride,
    });

    return NextResponse.json({ status: 'ok', data: result });
  } catch (err: any) {
    if (err instanceof AuthenticationRequiredError) {
      return NextResponse.json({ status: 'error', error: 'Authentication required' }, { status: 401 });
    }
    if (err instanceof ProjectNotFoundError || err instanceof RoleAuthorizationError) {
      return NextResponse.json({ status: 'error', error: 'Project not found' }, { status: 404 });
    }
    if (err?.message === 'AI provider is not configured.') {
      return NextResponse.json({ status: 'error', error: 'AI provider is not configured.' }, { status: 400 });
    }
    console.error('POST /api/projects/[id]/ai/agents/preview-test error:', err);
    return NextResponse.json({ status: 'error', error: err.message || 'AI preview test failed' }, { status: 500 });
  }
}
