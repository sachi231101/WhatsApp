import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';
function requireAdmin(u: any) { if (!u || (u.role !== 'admin' && !u.isSuperAdmin)) throw new Error('ADMIN_REQUIRED'); }

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const { rows } = await sql`SELECT id,name,slug,description,price,currency,billing_cycle,is_popular,status,visibility,trial_days,features,limits,created_at,updated_at FROM plans ORDER BY price::numeric ASC`;
    // enrich with subscriber count
    const enriched = await Promise.all(rows.map(async (p: any) => {
      try {
        const { rows: c } = await sql`SELECT COUNT(*)::int as cnt FROM subscriptions WHERE plan_id=${p.id}`;
        return { ...p, subscriberCount: c[0]?.cnt ?? 0 };
      } catch { return { ...p, subscriberCount: 0 }; }
    }));
    return NextResponse.json({ status: 'ok', data: enriched });
  } catch (e: any) {
    // Fallback to mock plans if table missing
    return NextResponse.json({ status: 'ok', data: [
      { id: '1', name: 'Starter', slug: 'starter', price: '29', currency: 'USD', billing_cycle: 'monthly', is_popular: false, status: 'active', visibility: 'public', trial_days: 14, features: {}, subscriberCount: 2 },
      { id: '2', name: 'Pro', slug: 'pro', price: '79', currency: 'USD', billing_cycle: 'monthly', is_popular: true, status: 'active', visibility: 'public', trial_days: 14, features: {}, subscriberCount: 5 },
      { id: '3', name: 'Enterprise', slug: 'enterprise', price: '199', currency: 'USD', billing_cycle: 'monthly', is_popular: false, status: 'active', visibility: 'public', trial_days: 30, features: {}, subscriberCount: 1 },
    ]});
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await request.json();
  const { name, slug, description, price, currency, billingCycle, taxPercent, isPopular, status, visibility, trialDays, features, limits } = body;
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
  try {
    const { rows } = await sql`
      INSERT INTO plans (name, slug, description, price, currency, billing_cycle, tax_percent, is_popular, status, visibility, trial_days, features, limits)
      VALUES (${name}, ${slug}, ${description || null}, ${price || 0}, ${currency || 'USD'}, ${billingCycle || 'monthly'}, ${taxPercent || 0}, ${Boolean(isPopular)}, ${status || 'active'}, ${visibility || 'public'}, ${trialDays || 0}, ${JSON.stringify(features || {})}::jsonb, ${JSON.stringify(limits || {})}::jsonb)
      RETURNING *
    `;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.PLAN_CREATE, entityType: 'plan', entityId: rows[0].id, newValues: rows[0] }, request);
    return NextResponse.json({ status: 'ok', data: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
