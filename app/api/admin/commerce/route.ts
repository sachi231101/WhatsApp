import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Commerce tables may not exist — return zeroed mock
  try {
    // try to detect commerce tables
    const { rows: a } = await sql`SELECT COUNT(*)::int as c FROM campaigns`;
    const campaigns = a[0]?.c ?? 0;
    const { rows: b } = await sql`SELECT COUNT(*)::int as c FROM automation_executions`;
    const execs = b[0]?.c ?? 0;
    return NextResponse.json({ status: 'ok', data: { totalProducts: 0, totalOrders: 0, totalBookings: 0, revenue: 0, campaigns, execs } });
  } catch { return NextResponse.json({ status: 'ok', data: { totalProducts: 0, totalOrders: 0, totalBookings: 0, revenue: 0 } }); }
}
