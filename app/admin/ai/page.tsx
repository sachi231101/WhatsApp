'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, Bot, Coins, AlertTriangle, Activity, BarChart3, Loader2, ExternalLink } from 'lucide-react';
import { AdminStatCard } from '@/components/admin/AdminCard';

export default function AIOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/admin/ai/overview').then(r=>r.json()).then(j=>{ if(j.status==='ok') setData(j.data); }).finally(()=>setLoading(false)); }, []);
  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  if (!data) return <div className="p-6 text-white/40">Failed to load AI data.</div>;
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-purple-400" /> AI Intelligence</h1>
        <p className="text-xs text-white/40 mt-1">Provider • Model • Usage • Cost • Limits • Errors — secrets never exposed</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Active Agents" value={data.activeAgents ?? 0} sub={`${data.totalAgents ?? 0} total • ${data.knowledgeBases ?? 0} KBs`} icon={Bot} iconBg="bg-purple-500/10" iconColor="text-purple-400" />
        <AdminStatCard label="Conversations" value={data.conversations ?? 0} sub="30-day AI usage" icon={Activity} iconBg="bg-indigo-500/10" iconColor="text-indigo-400" />
        <AdminStatCard label="Total Tokens" value={Number(data.totalTokens ?? 0).toLocaleString()} sub={`${Number(data.inputTokens ?? 0).toLocaleString()} in • ${Number(data.outputTokens ?? 0).toLocaleString()} out`} icon={BarChart3} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
        <AdminStatCard label="Est. Cost" value={`$${data.estimatedCost ?? '0.00'}`} sub="~$0.002/1k tokens" icon={Coins} accent="text-emerald-400" iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Providers</h3>
          {(data.providers || []).length === 0 ? <p className="text-xs text-white/30">No provider settings yet.</p> : (
            <div className="space-y-2">
              {(data.providers || []).map((p: any) => (
                <div key={p.provider} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-xs font-semibold text-white">{p.provider}</span>
                  <span className="text-xs text-white/60">{p.cnt} workspaces</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/ai/usage" className="mt-4 inline-flex text-xs text-indigo-400 hover:underline items-center gap-1">View detailed usage & costs <ExternalLink className="w-3 h-3" /></Link>
        </div>

        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Recent Agents</h3>
          {(data.recentAgents || []).length === 0 ? <p className="text-xs text-white/30">No agents.</p> : (
            <div className="space-y-2">
              {(data.recentAgents || []).map((a: any) => (
                <div key={a.id} className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <p className="text-xs font-semibold text-white">{a.name}</p>
                  <p className="text-[11px] text-white/40">{a.model_name} • {a.status} • {a.workspace_name || a.workspace_id?.slice(0, 8)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/admin/ai/usage" className="bg-[#11141f] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Coins className="w-5 h-5 text-emerald-400" /></div>
          <div><p className="text-sm font-bold text-white">AI Usage & Costs</p><p className="text-xs text-white/40">Input/output tokens • cost per workspace/agent</p></div>
        </Link>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5 opacity-60">
          <p className="text-sm font-bold text-white">Providers & Models</p><p className="text-xs text-white/40">OpenAI • Anthropic • Gemini • Groq — masked keys</p>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5 opacity-60">
          <p className="text-sm font-bold text-white">Guardrails</p><p className="text-xs text-white/40">System prompts • safety • escalation conditions</p>
        </div>
      </div>
    </div>
  );
}
