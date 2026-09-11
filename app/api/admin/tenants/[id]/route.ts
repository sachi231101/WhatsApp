import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';

function requireAdmin(user: any) {
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) throw new Error('ADMIN_REQUIRED');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  try {
    const { rows } = await sql`SELECT id,name,slug,plan,status,stripe_customer_id,max_workspaces,created_at,updated_at FROM tenants WHERE id=${id} LIMIT 1`;
    if (!rows.length) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    const tenant = rows[0];
    const { rows: workspaces } = await sql`SELECT id,name,slug,status,created_at FROM workspaces WHERE tenant_id=${id} ORDER BY created_at DESC`;
    const { rows: members } = await sql`SELECT u.id,u.email,u.name,wm.role,wm.status FROM workspace_memberships wm JOIN workspaces w ON wm.workspace_id=w.id JOIN users u ON wm.user_id=u.id WHERE w.tenant_id=${id} LIMIT 20`;
    const { rows: subs } = await sql`SELECT s.*, p.name as plan_name, p.slug as plan_slug FROM subscriptions s LEFT JOIN plans p ON s.plan_id=p.id WHERE s.tenant_id=${id} ORDER BY s.created_at DESC LIMIT 5`;
    const { rows: usage } = await sql`SELECT metric_type, quantity, timestamp FROM usage_events WHERE tenant_id=${id} ORDER BY timestamp DESC LIMIT 20`;
    const { rows: audit } = await sql`SELECT * FROM admin_audit_logs WHERE tenant_id=${id} OR entity_id=${id} ORDER BY created_at DESC LIMIT 10`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.TENANT_VIEW, entityType: 'tenant', entityId: id }, _req);
    return NextResponse.json({ status: 'ok', data: { tenant, workspaces, members, subscriptions: subs, usage, audit } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  const body = await request.json();
  const { name, plan, status, reason } = body;
  try {
    const { rows: old } = await sql`SELECT * FROM tenants WHERE id=${id} LIMIT 1`;
    if (!old.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await sql`UPDATE tenants SET name = COALESCE(${name || null}, name), plan = COALESCE(${plan || null}, plan), status = COALESCE(${status || null}, status), updated_at = now() WHERE id=${id}`;
    const { rows } = await sql`SELECT * FROM tenants WHERE id=${id} LIMIT 1`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: status === 'suspended' ? AUDIT_ACTIONS.TENANT_SUSPEND : status === 'active' ? AUDIT_ACTIONS.TENANT_ACTIVATE : AUDIT_ACTIONS.TENANT_UPDATE, entityType: 'tenant', entityId: id, tenantId: id, oldValues: old[0], newValues: rows[0], reason }, request);
    return NextResponse.json({ status: 'ok', data: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  try {
    await sql`UPDATE tenants SET status='deleted', updated_at=now() WHERE id=${id}`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.TENANT_DELETE, entityType: 'tenant', entityId: id, tenantId: id }, request);
    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
