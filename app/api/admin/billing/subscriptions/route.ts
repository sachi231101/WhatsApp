import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
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
  const status = sp.get('status')?.trim() || '';

  try {
    let total: number, rows: any[];
    if (status) {
      const c = await sql`SELECT COUNT(*)::int as c FROM subscriptions WHERE status=${status}`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT s.*, t.name as tenant_name, t.slug as tenant_slug, p.name as plan_name, p.slug as plan_slug, w.name as workspace_name FROM subscriptions s LEFT JOIN tenants t ON s.tenant_id=t.id LEFT JOIN plans p ON s.plan_id=p.id LEFT JOIN workspaces w ON s.workspace_id=w.id WHERE s.status=${status} ORDER BY s.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    } else {
      const c = await sql`SELECT COUNT(*)::int as c FROM subscriptions`;
      total = c.rows[0]?.c ?? 0;
      const d = await sql`SELECT s.*, t.name as tenant_name, t.slug as tenant_slug, p.name as plan_name, p.slug as plan_slug, w.name as workspace_name FROM subscriptions s LEFT JOIN tenants t ON s.tenant_id=t.id LEFT JOIN plans p ON s.plan_id=p.id LEFT JOIN workspaces w ON s.workspace_id=w.id ORDER BY s.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      rows = d.rows;
    }
    return NextResponse.json({ status: 'ok', data: rows, total, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json();
  const { tenantId, planId, status, billingCycle, trialDays, overrideLimits } = body;
  if (!tenantId || !planId) return NextResponse.json({ error: 'tenantId and planId required' }, { status: 400 });
  try {
    const now = new Date();
    const trialEnd = trialDays ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;
    // get workspace for tenant
    let workspaceId: string | null = null;
    try {
      const { rows: ws } = await sql`SELECT id FROM workspaces WHERE tenant_id=${tenantId} LIMIT 1`;
      workspaceId = ws[0]?.id || null;
    } catch {}
    const { rows } = await sql`
      INSERT INTO subscriptions (tenant_id, workspace_id, plan_id, status, billing_cycle, trial_start, trial_end, current_period_start, current_period_end, override_limits)
      VALUES (${tenantId}, ${workspaceId}, ${planId}, ${status || 'active'}, ${billingCycle || 'monthly'}, ${now.toISOString()}, ${trialEnd ? trialEnd.toISOString() : null}, ${now.toISOString()}, ${trialEnd ? trialEnd.toISOString() : null}, ${JSON.stringify(overrideLimits || {})}::jsonb)
      RETURNING *
    `;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.SUBSCRIPTION_ASSIGN, entityType: 'subscription', entityId: rows[0].id, tenantId, newValues: rows[0] }, request);
    return NextResponse.json({ status: 'ok', data: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
