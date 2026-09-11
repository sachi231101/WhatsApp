import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
function requireAdmin(u: any) { if (!u || (u.role !== 'admin' && !u.isSuperAdmin)) throw new Error('ADMIN_REQUIRED'); }
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const pageSize = Math.min(100, parseInt(sp.get('pageSize') || '10'));
  const offset = (page - 1) * pageSize;
  const status = sp.get('status')?.trim() || '';
  try {
    let total: number, rows: any[];
    if (status) {
      const c = await sql`SELECT COUNT(*)::int as c FROM automations WHERE status=${status}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT a.*, w.name as workspace_name FROM automations a LEFT JOIN workspaces w ON a.workspace_id=w.id WHERE a.status=${status} ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM automations`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT a.*, w.name as workspace_name FROM automations a LEFT JOIN workspaces w ON a.workspace_id=w.id ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }
    // also executions count
    const enriched = await Promise.all(rows.map(async (r: any) => {
      try { const { rows: e } = await sql`SELECT COUNT(*)::int as c FROM automation_executions WHERE automation_id=${r.id}`; return { ...r, executions: e[0]?.c ?? 0 }; } catch { return { ...r, executions: 0 }; }
    }));
    return NextResponse.json({ status: 'ok', data: enriched, total, page, pageSize });
  } catch { return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize }); }
}
