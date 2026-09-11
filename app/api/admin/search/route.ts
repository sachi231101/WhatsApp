import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (!q || q.length < 2) return NextResponse.json({ status: 'ok', data: [] });

  const like = `%${q}%`;
  const results: any[] = [];
  const push = (arr: any[], type: string) => {
    for (const r of arr) results.push({ type, ...r, label: r.name || r.email || r.invoice_number || r.waba_id || r.display_phone_number || r.id });
  };

  try {
    const { rows: tenants } = await sql`SELECT id,name,slug,plan,status FROM tenants WHERE name ILIKE ${like} OR slug ILIKE ${like} LIMIT 5`;
    push(tenants, 'Business');
  } catch {}
  try {
    const { rows: users } = await sql`SELECT id,email,name,role FROM users WHERE email ILIKE ${like} OR name ILIKE ${like} LIMIT 5`;
    push(users, 'User');
  } catch {}
  try {
    const { rows: ws } = await sql`SELECT id,name,slug FROM workspaces WHERE name ILIKE ${like} OR slug ILIKE ${like} LIMIT 5`;
    push(ws, 'Workspace');
  } catch {}
  try {
    const { rows: waba } = await sql`SELECT id,waba_id as waba_id,name FROM whatsapp_accounts WHERE waba_id ILIKE ${like} OR name ILIKE ${like} LIMIT 5`;
    push(waba, 'WABA');
  } catch {}
  try {
    const { rows: phones } = await sql`SELECT id,phone_number_id,display_phone_number FROM whatsapp_phone_numbers WHERE display_phone_number ILIKE ${like} OR phone_number_id ILIKE ${like} LIMIT 5`;
    push(phones, 'Phone Number');
  } catch {}
  try {
    const { rows: subs } = await sql`SELECT s.id, s.status, t.name as tenant_name FROM subscriptions s LEFT JOIN tenants t ON s.tenant_id=t.id WHERE s.status ILIKE ${like} LIMIT 5`;
    push(subs, 'Subscription');
  } catch {}
  try {
    const { rows: pays } = await sql`SELECT id,amount,gateway,status FROM payments WHERE external_payment_id ILIKE ${like} OR gateway ILIKE ${like} LIMIT 5`;
    push(pays, 'Payment');
  } catch {}
  try {
    const { rows: inv } = await sql`SELECT id,invoice_number,status FROM invoices WHERE invoice_number ILIKE ${like} LIMIT 5`;
    push(inv, 'Invoice');
  } catch {}
  try {
    const { rows: camps } = await sql`SELECT id,name,status FROM campaigns WHERE name ILIKE ${like} LIMIT 5`;
    push(camps, 'Campaign');
  } catch {}
  try {
    const { rows: autom } = await sql`SELECT id,name,status FROM automations WHERE name ILIKE ${like} LIMIT 5`;
    push(autom, 'Automation');
  } catch {}

  return NextResponse.json({ status: 'ok', data: results.slice(0, 20) });
}
