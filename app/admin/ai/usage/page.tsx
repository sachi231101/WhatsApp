'use client';

import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { AdminTable } from '@/components/admin/AdminTable';

export default function AIUsagePage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [agg, setAgg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/ai/usage?page=${page}&pageSize=15`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); setAgg(j.aggregated); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Coins className="w-6 h-6 text-emerald-400" /> AI Usage & Costs</h1>
          <p className="text-xs text-white/40 mt-1">Track input tokens • output tokens • total • requests • conversations • est. cost per workspace/agent</p>
        </div>
        {agg && <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs"><span className="text-white/60">Page cost est.</span> <span className="font-bold text-emerald-400">${agg.estimatedCost}</span> <span className="text-white/40">• {agg.totalTokens?.toLocaleString()} tokens</span></div>}
      </div>

      <AdminTable
        columns={[
          { key: 'workspace_name', header: 'Workspace', render: (r) => <div><p className="text-xs text-white">{r.workspace_name || r.workspace_id?.slice(0, 8) || '—'}</p><p className="text-[11px] text-white/40">{r.tenant_name || ''}</p></div> },
          { key: 'agent_name', header: 'Agent', render: (r) => <span className="text-xs text-white/80">{r.agent_name || r.agent_id?.slice(0, 8) || '—'}</span> },
          { key: 'model', header: 'Model', render: (r) => <span className="text-[11px] font-mono text-white/60">{r.model || r.provider}</span> },
          { key: 'input_tokens', header: 'Input', render: (r) => <span className="text-xs text-white">{r.input_tokens ?? 0}</span> },
          { key: 'output_tokens', header: 'Output', render: (r) => <span className="text-xs text-white">{r.output_tokens ?? 0}</span> },
          { key: 'total_tokens', header: 'Total', render: (r) => <span className="font-bold text-white text-xs">{r.total_tokens ?? 0}</span> },
          { key: 'created_at', header: 'Date', render: (r) => <span className="text-[11px] text-white/40">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span> },
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={15}
        total={total}
        onPageChange={setPage}
        onRefresh={load}
      />

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <p className="text-xs text-white/40">API keys are encrypted and never exposed. Cost is estimated from token counts. Limits & guardrails can be managed per workspace via Limits.</p>
      </div>
    </div>
  );
}
