import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';

function requireAdmin(user: any) {
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
    throw new Error('ADMIN_REQUIRED');
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));
  const offset = (page - 1) * pageSize;
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status')?.trim() || '';

  const like = search ? `%${search}%` : null;

  try {
    let countRows: any, rows: any;
    if (search && status) {
      const r = await sql`SELECT COUNT(*)::int as c FROM tenants WHERE (name ILIKE ${like} OR slug ILIKE ${like}) AND status=${status}`;
      countRows = r.rows;
      const d = await sql`SELECT id,name,slug,plan,status,max_workspaces,created_at,updated_at FROM tenants WHERE (name ILIKE ${like} OR slug ILIKE ${like}) AND status=${status} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (search) {
      const r = await sql`SELECT COUNT(*)::int as c FROM tenants WHERE name ILIKE ${like} OR slug ILIKE ${like}`;
      countRows = r.rows;
      const d = await sql`SELECT id,name,slug,plan,status,max_workspaces,created_at,updated_at FROM tenants WHERE name ILIKE ${like} OR slug ILIKE ${like} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (status) {
      const r = await sql`SELECT COUNT(*)::int as c FROM tenants WHERE status=${status}`;
      countRows = r.rows;
      const d = await sql`SELECT id,name,slug,plan,status,max_workspaces,created_at,updated_at FROM tenants WHERE status=${status} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const r = await sql`SELECT COUNT(*)::int as c FROM tenants`;
      countRows = r.rows;
      const d = await sql`SELECT id,name,slug,plan,status,max_workspaces,created_at,updated_at FROM tenants ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }

    // enrich with workspace count and tenant activity
    const enriched = await Promise.all(rows.map(async (t: any) => {
      try {
        const { rows: ws } = await sql`SELECT COUNT(*)::int as c FROM workspaces WHERE tenant_id=${t.id}`;
        const { rows: usersCount } = await sql`SELECT COUNT(*)::int as c FROM workspace_memberships wm JOIN workspaces w ON wm.workspace_id=w.id WHERE w.tenant_id=${t.id}`;
        const { rows: sub } = await sql`SELECT id,plan_id,status,trial_end,current_period_end FROM subscriptions WHERE tenant_id=${t.id} ORDER BY created_at DESC LIMIT 1`;
        return { ...t, workspaceCount: ws[0]?.c ?? 0, members: usersCount[0]?.c ?? 0, subscription: sub[0] || null };
      } catch { return { ...t, workspaceCount: 0, members: 0, subscription: null }; }
    }));

    return NextResponse.json({ status: 'ok', data: enriched, total: countRows[0]?.c ?? 0, page, pageSize });
  } catch (e: any) {
    console.error('[admin tenants]', e);
    return NextResponse.json({ error: 'Failed to fetch tenants', details: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json();
  const { name, slug, plan, status } = body;
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
  try {
    const { rows } = await sql`INSERT INTO tenants (name, slug, plan, status) VALUES (${name}, ${slug}, ${plan || 'starter'}, ${status || 'active'}) RETURNING id,name,slug,plan,status,created_at`;
    const tenant = rows[0];
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.TENANT_CREATE, entityType: 'tenant', entityId: tenant.id, newValues: tenant }, request);
    return NextResponse.json({ status: 'ok', data: tenant });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
