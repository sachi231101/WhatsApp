import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';
function requireAdmin(u: any) { if (!u || (u.role !== 'admin' && !u.isSuperAdmin)) throw new Error('ADMIN_REQUIRED'); }

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(sp.get('pageSize') || '10'));
  const offset = (page - 1) * pageSize;
  const search = sp.get('search')?.trim() || '';
  const role = sp.get('role')?.trim() || '';
  const status = sp.get('status')?.trim() || '';
  const like = search ? `%${search}%` : null;

  try {
    let where = '';
    // Build dynamic query via sql template branching
    let countRows: any, rows: any;
    if (search && role) {
      const r = await sql`SELECT COUNT(*)::int as c FROM users WHERE (email ILIKE ${like} OR name ILIKE ${like}) AND role=${role}`;
      countRows = r.rows;
      const d = await sql`SELECT id,email,name,role,is_super_admin as isSuperAdmin,status,company_name,phone_number,created_at,last_login_at FROM users WHERE (email ILIKE ${like} OR name ILIKE ${like}) AND role=${role} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (search) {
      const r = await sql`SELECT COUNT(*)::int as c FROM users WHERE email ILIKE ${like} OR name ILIKE ${like}`;
      countRows = r.rows;
      const d = await sql`SELECT id,email,name,role,is_super_admin as isSuperAdmin,status,company_name,phone_number,created_at,last_login_at FROM users WHERE email ILIKE ${like} OR name ILIKE ${like} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (role) {
      const r = await sql`SELECT COUNT(*)::int as c FROM users WHERE role=${role}`;
      countRows = r.rows;
      const d = await sql`SELECT id,email,name,role,is_super_admin as isSuperAdmin,status,company_name,phone_number,created_at,last_login_at FROM users WHERE role=${role} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const r = await sql`SELECT COUNT(*)::int as c FROM users`;
      countRows = r.rows;
      const d = await sql`SELECT id,email,name,role,is_super_admin as isSuperAdmin,status,company_name,phone_number,created_at,last_login_at FROM users ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }

    // Enrich with workspace membership count
    const enriched = await Promise.all(rows.map(async (u: any) => {
      try {
        const { rows: wm } = await sql`SELECT w.id,w.name,w.slug,wm.role FROM workspace_memberships wm JOIN workspaces w ON wm.workspace_id=w.id WHERE wm.user_id=${u.id} LIMIT 5`;
        return { ...u, workspaces: wm };
      } catch { return { ...u, workspaces: [] }; }
    }));

    let filtered = enriched;
    if (status) filtered = enriched.filter((x: any) => x.status === status);

    return NextResponse.json({ status: 'ok', data: filtered, total: countRows[0]?.c ?? 0, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json();
  const { email, name, password, role, companyName, isSuperAdmin, workspaceId, tenantId } = body;
  if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const pwHash = hashPassword(password);
    const { rows } = await sql`
      INSERT INTO users (auth0_sub, email, name, role, is_super_admin, password_hash, company_name, status)
      VALUES (${'local|' + cleanEmail}, ${cleanEmail}, ${name || cleanEmail.split('@')[0]}, ${role || 'client'}, ${Boolean(isSuperAdmin)}, ${pwHash}, ${companyName || null}, 'active')
      RETURNING id,email,name,role,is_super_admin,status,created_at
    `;
    const created = rows[0];

    // Optional: assign to workspace
    if (workspaceId) {
      try {
        await sql`INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (${workspaceId}, ${created.id}, 'member') ON CONFLICT DO NOTHING`;
      } catch {}
    } else if (tenantId) {
      try {
        const { rows: ws } = await sql`SELECT id FROM workspaces WHERE tenant_id=${tenantId} LIMIT 1`;
        if (ws[0]) await sql`INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (${ws[0].id}, ${created.id}, 'member') ON CONFLICT DO NOTHING`;
      } catch {}
    }

    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.USER_CREATE, entityType: 'user', entityId: created.id, newValues: created }, request);
    return NextResponse.json({ status: 'ok', data: created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
