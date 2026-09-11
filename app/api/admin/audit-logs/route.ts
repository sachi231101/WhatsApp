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
  const pageSize = Math.min(100, parseInt(sp.get('pageSize') || '20'));
  const offset = (page - 1) * pageSize;
  const action = sp.get('action')?.trim() || '';
  const entityType = sp.get('entityType')?.trim() || '';
  const search = sp.get('search')?.trim() || '';
  const like = search ? `%${search}%` : null;

  try {
    let rows: any[], total: number;
    // Build query combinations - use fallback to platform audit logs + workspace audit logs union?
    // Primary source: admin_audit_logs, fallback: audit_logs
    if (action && search) {
      const c = await sql`SELECT COUNT(*)::int as c FROM admin_audit_logs WHERE action=${action} AND (admin_email ILIKE ${like} OR entity_type ILIKE ${like})`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT * FROM admin_audit_logs WHERE action=${action} AND (admin_email ILIKE ${like} OR entity_type ILIKE ${like}) ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (action) {
      const c = await sql`SELECT COUNT(*)::int as c FROM admin_audit_logs WHERE action=${action}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT * FROM admin_audit_logs WHERE action=${action} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (entityType) {
      const c = await sql`SELECT COUNT(*)::int as c FROM admin_audit_logs WHERE entity_type=${entityType}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT * FROM admin_audit_logs WHERE entity_type=${entityType} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (search) {
      const c = await sql`SELECT COUNT(*)::int as c FROM admin_audit_logs WHERE admin_email ILIKE ${like} OR entity_type ILIKE ${like} OR action ILIKE ${like}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT * FROM admin_audit_logs WHERE admin_email ILIKE ${like} OR entity_type ILIKE ${like} OR action ILIKE ${like} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM admin_audit_logs`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;

      // If empty, fallback to legacy audit_logs
      if (total === 0) {
        const c2 = await sql`SELECT COUNT(*)::int as c FROM audit_logs`;
        total = c2.rows[0]?.c ?? 0;
        const d2 = await sql`SELECT id, user_id as admin_user_id, action, entity_type, entity_id, workspace_id, diff, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
        rows = d2.rows;
      }
    }

    return NextResponse.json({ status: 'ok', data: rows, total, page, pageSize });
  } catch (e: any) {
    // If admin_audit_logs doesn't exist yet
    try {
      const c = await sql`SELECT COUNT(*)::int as c FROM audit_logs`;
      const total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT id, user_id as admin_user_id, action, entity_type, entity_id, workspace_id, diff, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      return NextResponse.json({ status: 'ok', data: d.rows, total, page, pageSize });
    } catch {
      return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize });
    }
  }
}
