import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { logAdminAudit, AUDIT_ACTIONS } from '@/lib/services/audit/adminAudit';

export const dynamic = 'force-dynamic';
function requireAdmin(u: any) { if (!u || (u.role !== 'admin' && !u.isSuperAdmin)) throw new Error('ADMIN_REQUIRED'); }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  const body = await request.json();
  const { name, description, price, currency, billingCycle, trialDays, isPopular, status, visibility, limits, features } = body;
  try {
    const { rows: old } = await sql`SELECT * FROM plans WHERE id=${id} LIMIT 1`;
    if (!old.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await sql`
      UPDATE plans SET
        name=COALESCE(${name || null}, name),
        description=COALESCE(${description || null}, description),
        price=COALESCE(${price ?? null}, price),
        currency=COALESCE(${currency || null}, currency),
        billing_cycle=COALESCE(${billingCycle || null}, billing_cycle),
        trial_days=COALESCE(${trialDays ?? null}, trial_days),
        is_popular=COALESCE(${isPopular ?? null}, is_popular),
        status=COALESCE(${status || null}, status),
        visibility=COALESCE(${visibility || null}, visibility),
        limits=COALESCE(${limits ? JSON.stringify(limits) : null}::jsonb, limits),
        features=COALESCE(${features ? JSON.stringify(features) : null}::jsonb, features),
        updated_at=now()
      WHERE id=${id}
    `;
    const { rows } = await sql`SELECT * FROM plans WHERE id=${id} LIMIT 1`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.PLAN_UPDATE, entityType: 'plan', entityId: id, oldValues: old[0], newValues: rows[0] }, request);
    return NextResponse.json({ status: 'ok', data: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  try { requireAdmin(user); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { id } = await params;
  try {
    await sql`UPDATE plans SET status='archived', updated_at=now() WHERE id=${id}`;
    await logAdminAudit({ adminUserId: user!.userId, adminEmail: user!.email, action: AUDIT_ACTIONS.PLAN_DELETE, entityType: 'plan', entityId: id }, request);
    return NextResponse.json({ status: 'ok' });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
