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
  const search = sp.get('search')?.trim() || '';
  const like = search ? `%${search}%` : null;
  try {
    let total: number, rows: any[];
    if (search) {
      const c = await sql`SELECT COUNT(*)::int as c FROM whatsapp_accounts WHERE waba_id ILIKE ${like} OR name ILIKE ${like}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT wa.*, w.name as workspace_name, w.slug as workspace_slug, t.name as tenant_name FROM whatsapp_accounts wa LEFT JOIN workspaces w ON wa.workspace_id=w.id LEFT JOIN tenants t ON w.tenant_id=t.id WHERE wa.waba_id ILIKE ${like} OR wa.name ILIKE ${like} ORDER BY wa.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows.map((r: any) => ({ ...r, encryptedAccessToken: r.encrypted_access_token ? '••••••••' : null }));
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM whatsapp_accounts`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT wa.*, w.name as workspace_name, w.slug as workspace_slug, t.name as tenant_name FROM whatsapp_accounts wa LEFT JOIN workspaces w ON wa.workspace_id=w.id LEFT JOIN tenants t ON w.tenant_id=t.id ORDER BY wa.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows.map((r: any) => ({ ...r, encryptedAccessToken: r.encrypted_access_token ? '••••••••' : null }));
    }
    return NextResponse.json({ status: 'ok', data: rows, total, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize });
  }
}
