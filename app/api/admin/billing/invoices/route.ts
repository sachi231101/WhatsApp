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
      const c = await sql`SELECT COUNT(*)::int as c FROM invoices WHERE status=${status}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT i.*, t.name as tenant_name FROM invoices i LEFT JOIN tenants t ON i.tenant_id=t.id WHERE i.status=${status} ORDER BY i.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM invoices`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT i.*, t.name as tenant_name FROM invoices i LEFT JOIN tenants t ON i.tenant_id=t.id ORDER BY i.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }
    return NextResponse.json({ status: 'ok', data: rows, total, page, pageSize });
  } catch {
    return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize });
  }
}
