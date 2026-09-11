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
  const eventType = sp.get('eventType')?.trim() || '';
  try {
    let total: number, rows: any[];
    if (status && eventType) {
      const c = await sql`SELECT COUNT(*)::int as c FROM webhook_events WHERE processing_status=${status} AND event_type=${eventType}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT id,workspace_id,project_id,provider,event_type,field,processing_status,status,attempts,retry_count,received_at,processed_at,meta_waba_id FROM webhook_events WHERE processing_status=${status} AND event_type=${eventType} ORDER BY received_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (status) {
      const c = await sql`SELECT COUNT(*)::int as c FROM webhook_events WHERE processing_status=${status}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT id,workspace_id,project_id,provider,event_type,field,processing_status,status,attempts,retry_count,received_at,processed_at,meta_waba_id FROM webhook_events WHERE processing_status=${status} ORDER BY received_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else if (eventType) {
      const c = await sql`SELECT COUNT(*)::int as c FROM webhook_events WHERE event_type=${eventType}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT id,workspace_id,project_id,provider,event_type,field,processing_status,status,attempts,retry_count,received_at,processed_at,meta_waba_id FROM webhook_events WHERE event_type=${eventType} ORDER BY received_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM webhook_events`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT id,workspace_id,project_id,provider,event_type,field,processing_status,status,attempts,retry_count,received_at,processed_at,meta_waba_id FROM webhook_events ORDER BY received_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }
    // enrich workspace
    const enriched = await Promise.all(rows.map(async (r: any) => {
      if (!r.workspace_id) return r;
      try {
        const { rows: ws } = await sql`SELECT w.name as workspace_name, t.name as tenant_name FROM workspaces w LEFT JOIN tenants t ON w.tenant_id=t.id WHERE w.id=${r.workspace_id} LIMIT 1`;
        return { ...r, workspace_name: ws[0]?.workspace_name, tenant_name: ws[0]?.tenant_name };
      } catch { return r; }
    }));
    return NextResponse.json({ status: 'ok', data: enriched, total, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize });
  }
}
