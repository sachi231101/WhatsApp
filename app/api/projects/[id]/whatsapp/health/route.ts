import { type NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess, ProjectNotFoundError } from '@/lib/projects/project-access';
import { RoleAuthorizationError } from '@/lib/workspace/workspace-access';
import { projectConnectionService } from '@/lib/services/whatsapp/projectConnectionService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/whatsapp/health
 * Probes WhatsApp API, Phone Number, Webhook, and Access Token validity.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId);

    const health = await projectConnectionService.checkConnectionHealth(projectId);

    return NextResponse.json({
      status: 'ok',
      data: health,
    });
  } catch (error: any) {
    if (error instanceof ProjectNotFoundError || error.code === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof RoleAuthorizationError || error.statusCode === 403) {
      return NextResponse.json({ error: 'Forbidden', message: error.message }, { status: 403 });
    }

    console.error('Error checking project WhatsApp health:', error);
    return NextResponse.json(
      { error: 'Failed to verify connection health' },
      { status: 500 },
    );
  }
}
