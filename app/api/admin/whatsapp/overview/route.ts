import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result: any = {};
  try {
    const { rows: waba } = await sql`SELECT COUNT(*)::int as c FROM whatsapp_accounts`;
    result.totalWabas = waba[0]?.c ?? 0;
    const { rows: connected } = await sql`SELECT COUNT(*)::int as c FROM whatsapp_accounts WHERE status='connected'`;
    result.connectedWabas = connected[0]?.c ?? 0;
    const { rows: phones } = await sql`SELECT COUNT(*)::int as c FROM whatsapp_phone_numbers`;
    result.totalPhones = phones[0]?.c ?? 0;
    const { rows: conn } = await sql`SELECT COUNT(*)::int as c FROM whatsapp_connections WHERE status='CONNECTED'`;
    result.activeConnections = conn[0]?.c ?? 0;
    const { rows: tmpl } = await sql`SELECT COUNT(*)::int as c FROM whatsapp_templates`;
    result.totalTemplates = tmpl[0]?.c ?? 0;
    const { rows: approved } = await sql`SELECT COUNT(*)::int as c FROM whatsapp_templates WHERE status='APPROVED'`;
    result.approvedTemplates = approved[0]?.c ?? 0;
    const { rows: webhooks } = await sql`SELECT COUNT(*)::int as c FROM webhook_events`;
    result.totalWebhooks = webhooks[0]?.c ?? 0;
    const { rows: failed } = await sql`SELECT COUNT(*)::int as c FROM webhook_events WHERE status='failed' OR processing_status='failed'`;
    result.failedWebhooks = failed[0]?.c ?? 0;
    const { rows: recentWabas } = await sql`SELECT wa.*, w.name as workspace_name, t.name as tenant_name FROM whatsapp_accounts wa LEFT JOIN workspaces w ON wa.workspace_id=w.id LEFT JOIN tenants t ON w.tenant_id=t.id ORDER BY wa.created_at DESC LIMIT 5`;
    result.recentWabas = recentWabas;
    const { rows: recentPhones } = await sql`SELECT wp.*, wa.waba_id, w.name as workspace_name FROM whatsapp_phone_numbers wp LEFT JOIN whatsapp_accounts wa ON wp.whatsapp_account_id=wa.id LEFT JOIN workspaces w ON wp.workspace_id=w.id ORDER BY wp.created_at DESC LIMIT 5`;
    result.recentPhones = recentPhones;
    const { rows: recentEvents } = await sql`SELECT id,event_type,provider,processing_status,received_at,meta_waba_id FROM webhook_events ORDER BY received_at DESC LIMIT 5`;
    result.recentWebhooks = recentEvents;
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: { totalWabas: 0, totalPhones: 0, totalTemplates: 0, totalWebhooks: 0, recentWabas: [], recentPhones: [], recentWebhooks: [] } });
  }
  return NextResponse.json({ status: 'ok', data: result });
}
