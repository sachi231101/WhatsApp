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
  const gateway = sp.get('gateway')?.trim() || '';
  const search = sp.get('search')?.trim() || '';
  const like = search ? `%${search}%` : null;

  try {
    let rows: any[], total: number;
    // Simplified branching — cover common filters
    if (status && gateway) {
      const c = await sql`SELECT COUNT(*)::int as c FROM payments WHERE status=${status} AND gateway=${gateway}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p LEFT JOIN tenants t ON p.tenant_id=t.id LEFT JOIN invoices i ON p.invoice_id=i.id WHERE p.status=${status} AND p.gateway=${gateway} ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (status) {
      const c = await sql`SELECT COUNT(*)::int as c FROM payments WHERE status=${status}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p LEFT JOIN tenants t ON p.tenant_id=t.id LEFT JOIN invoices i ON p.invoice_id=i.id WHERE p.status=${status} ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (gateway) {
      const c = await sql`SELECT COUNT(*)::int as c FROM payments WHERE gateway=${gateway}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p LEFT JOIN tenants t ON p.tenant_id=t.id LEFT JOIN invoices i ON p.invoice_id=i.id WHERE p.gateway=${gateway} ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (search) {
      const c = await sql`SELECT COUNT(*)::int as c FROM payments WHERE external_payment_id ILIKE ${like} OR gateway ILIKE ${like}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p LEFT JOIN tenants t ON p.tenant_id=t.id LEFT JOIN invoices i ON p.invoice_id=i.id WHERE p.external_payment_id ILIKE ${like} OR p.gateway ILIKE ${like} ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM payments`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT p.*, t.name as tenant_name, i.invoice_number FROM payments p LEFT JOIN tenants t ON p.tenant_id=t.id LEFT JOIN invoices i ON p.invoice_id=i.id ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }
    return NextResponse.json({ status: 'ok', data: rows, total, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize });
  }
}
