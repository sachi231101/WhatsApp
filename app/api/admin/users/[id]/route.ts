import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';
function requireAdmin(u: any) { if (!u || (u.role !== 'admin' && !u.isSuperAdmin)) throw new Error('ADMIN_REQUIRED'); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  try {
    const { rows } = await sql`SELECT id,email,name,role,is_super_admin as isSuperAdmin,status,company_name,phone_number,created_at,updated_at,last_login_at FROM users WHERE id=${id} LIMIT 1`;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const u = rows[0];
    const { rows: wss } = await sql`SELECT w.id,w.name,w.slug,t.name as tenant_name, wm.role, wm.status FROM workspace_memberships wm JOIN workspaces w ON wm.workspace_id=w.id LEFT JOIN tenants t ON w.tenant_id=t.id WHERE wm.user_id=${id}`;
    const { rows: audit } = await sql`SELECT * FROM admin_audit_logs WHERE entity_id=${id} OR admin_user_id=${id} ORDER BY created_at DESC LIMIT 10`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.USER_VIEW, entityType: 'user', entityId: id }, _req);
    return NextResponse.json({ status: 'ok', data: { user: u, workspaces: wss, audit } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  const body = await request.json();
  const { name, role, status, companyName, isSuperAdmin, password, reason } = body;
  try {
    const { rows: old } = await sql`SELECT * FROM users WHERE id=${id} LIMIT 1`;
    if (!old.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const oldUser = old[0];
    let pwHash = null;
    if (password) pwHash = hashPassword(password);

    // Build update
    if (pwHash) {
      await sql`UPDATE users SET name=COALESCE(${name || null}, name), role=COALESCE(${role || null}, role), status=COALESCE(${status || null}, status), company_name=COALESCE(${companyName || null}, company_name), is_super_admin=COALESCE(${isSuperAdmin ?? null}, is_super_admin), password_hash=${pwHash}, updated_at=now() WHERE id=${id}`;
    } else if (isSuperAdmin !== undefined) {
      await sql`UPDATE users SET name=COALESCE(${name || null}, name), role=COALESCE(${role || null}, role), status=COALESCE(${status || null}, status), company_name=COALESCE(${companyName || null}, company_name), is_super_admin=${Boolean(isSuperAdmin)}, updated_at=now() WHERE id=${id}`;
    } else {
      await sql`UPDATE users SET name=COALESCE(${name || null}, name), role=COALESCE(${role || null}, role), status=COALESCE(${status || null}, status), company_name=COALESCE(${companyName || null}, company_name), updated_at=now() WHERE id=${id}`;
    }
    const { rows } = await sql`SELECT id,email,name,role,is_super_admin,status,company_name,updated_at FROM users WHERE id=${id} LIMIT 1`;
    const action = status === 'suspended' ? AUDIT_ACTIONS.USER_SUSPEND : status === 'active' ? AUDIT_ACTIONS.USER_ACTIVATE : password ? AUDIT_ACTIONS.USER_RESET_PASSWORD : role ? AUDIT_ACTIONS.USER_ASSIGN_ROLE : AUDIT_ACTIONS.USER_UPDATE;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action, entityType: 'user', entityId: id, oldValues: oldUser, newValues: rows[0], reason }, request);
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
    await sql`UPDATE users SET status='deleted', updated_at=now() WHERE id=${id}`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.USER_DELETE, entityType: 'user', entityId: id }, request);
    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
