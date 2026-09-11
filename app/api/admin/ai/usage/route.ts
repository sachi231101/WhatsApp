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
  try {
    const c = await sql`SELECT COUNT(*)::int as cnt FROM ai_usage`;
    const total = c.rows[0]?.cnt ?? 0;
    const { rows } = await sql`
      SELECT u.*, a.name as agent_name, w.name as workspace_name, t.name as tenant_name
      FROM ai_usage u
      LEFT JOIN ai_agents a ON u.agent_id=a.id
      LEFT JOIN workspaces w ON u.workspace_id=w.id
      LEFT JOIN tenants t ON w.tenant_id=t.id
      ORDER BY u.created_at DESC LIMIT ${pageSize} OFFSET ${offset}
    `;
    const aggregated = {
      totalTokens: rows.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0),
      inputTokens: rows.reduce((s: number, r: any) => s + (r.input_tokens || 0), 0),
      outputTokens: rows.reduce((s: number, r: any) => s + (r.output_tokens || 0), 0),
      estimatedCost: (rows.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) / 1000 * 0.002).toFixed(2),
    };
    return NextResponse.json({ status: 'ok', data: rows, total, page, pageSize, aggregated });
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: [], total: 0, page, pageSize, aggregated: { totalTokens: 0, estimatedCost: '0.00' } });
  }
}
