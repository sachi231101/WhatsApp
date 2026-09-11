import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { rows: agents } = await sql`SELECT COUNT(*)::int as total FROM ai_agents`;
    const { rows: activeAgents } = await sql`SELECT COUNT(*)::int as c FROM ai_agents WHERE status='ACTIVE' OR status='active'`;
    const { rows: kbs } = await sql`SELECT COUNT(*)::int as c FROM knowledge_bases`;
    const { rows: usage } = await sql`SELECT COUNT(*)::int as conversations, COALESCE(SUM(input_tokens),0)::int as inputTokens, COALESCE(SUM(output_tokens),0)::int as outputTokens, COALESCE(SUM(total_tokens),0)::int as totalTokens FROM ai_usage`;
    const { rows: providers } = await sql`SELECT provider, COUNT(*)::int as cnt FROM ai_provider_settings GROUP BY provider`;
    const { rows: recentAgents } = await sql`SELECT a.id,a.name,a.status,a.model_name,a.workspace_id, w.name as workspace_name FROM ai_agents a LEFT JOIN workspaces w ON a.workspace_id=w.id ORDER BY a.created_at DESC LIMIT 5`;
    const totalTokens = usage[0]?.totaltokens ?? usage[0]?.totalTokens ?? 0;
    const cost = ((Number(totalTokens) / 1000) * 0.002).toFixed(2);
    return NextResponse.json({ status: 'ok', data: {
      totalAgents: agents[0]?.total ?? 0,
      activeAgents: activeAgents[0]?.c ?? 0,
      knowledgeBases: kbs[0]?.c ?? 0,
      conversations: usage[0]?.conversations ?? 0,
      inputTokens: usage[0]?.inputtokens ?? usage[0]?.inputTokens ?? 0,
      outputTokens: usage[0]?.outputtokens ?? usage[0]?.outputTokens ?? 0,
      totalTokens,
      estimatedCost: cost,
      providers,
      recentAgents,
    }});
  } catch (e: any) {
    return NextResponse.json({ status: 'ok', data: { totalAgents: 0, activeAgents: 0, conversations: 0, totalTokens: 0, estimatedCost: '0.00', providers: [], recentAgents: [] } });
  }
}
