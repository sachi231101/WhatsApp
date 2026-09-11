import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { workspaceId, tenantId } = body;
  if (!workspaceId && !tenantId) return NextResponse.json({ error: 'workspaceId or tenantId required' }, { status: 400 });

  try {
    let targetWorkspace: any = null;
    if (workspaceId) {
      const { rows } = await sql`SELECT w.id,w.name,w.slug,w.tenant_id, t.name as tenant_name FROM workspaces w LEFT JOIN tenants t ON w.tenant_id=t.id WHERE w.id=${workspaceId} LIMIT 1`;
      targetWorkspace = rows[0] || null;
    } else if (tenantId) {
      const { rows } = await sql`SELECT w.id,w.name,w.slug,w.tenant_id, t.name as tenant_name FROM workspaces w LEFT JOIN tenants t ON w.tenant_id=t.id WHERE w.tenant_id=${tenantId} ORDER BY w.created_at ASC LIMIT 1`;
      targetWorkspace = rows[0] || null;
    }
    if (!targetWorkspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    // Also fetch a project for this workspace
    let projectId: string | null = null;
    try {
      const { rows: proj } = await sql`SELECT id FROM projects WHERE workspace_id=${targetWorkspace.id} AND status='ACTIVE' LIMIT 1`;
      projectId = proj[0]?.id || null;
      if (!projectId) {
        const { rows: anyProj } = await sql`SELECT id FROM projects WHERE workspace_id=${targetWorkspace.id} LIMIT 1`;
        projectId = anyProj[0]?.id || null;
      }
    } catch {}

    await logAdminAudit({
      adminUserId: user.userId,
      adminEmail: user.email,
      action: AUDIT_ACTIONS.TENANT_SWITCH,
      entityType: 'workspace',
      entityId: targetWorkspace.id,
      workspaceId: targetWorkspace.id,
      tenantId: targetWorkspace.tenant_id,
      newValues: { workspaceName: targetWorkspace.name },
      metadata: { via: 'switch-tenant' },
    }, request);

    const response = NextResponse.json({
      status: 'ok',
      data: { workspaceId: targetWorkspace.id, workspaceName: targetWorkspace.name, tenantId: targetWorkspace.tenant_id, tenantName: targetWorkspace.tenant_name, projectId },
    });

    const viewAsPayload = Buffer.from(JSON.stringify({ workspaceId: targetWorkspace.id, workspaceName: targetWorkspace.name })).toString('base64');
    response.cookies.set('wazzapp_view_as', viewAsPayload, { path: '/', sameSite: 'lax', maxAge: 8 * 60 * 60 });
    response.cookies.set('wazzapp_workspace_id', targetWorkspace.id, { path: '/', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 });
    if (projectId) response.cookies.set('wazzapp_project_id', projectId, { path: '/', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 });

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
