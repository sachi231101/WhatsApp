'use client';

import { useEffect, useState } from 'react';
import { Zap, Activity } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function AdminAutomationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (status) qs.set('status', status);
      const r = await fetch(`/api/admin/automations?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status]);
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-amber-400" /> Automations — Platform</h1>
        <p className="text-xs text-white/40 mt-1">Workflows • Active • Paused • Executions • Failed Executions • Logs</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {['', 'DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${status === s ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{s || 'All'}</button>
        ))}
      </div>
      <AdminTable
        columns={[
          { key: 'name', header: 'Workflow', render: (r) => <div><p className="font-semibold text-white text-xs">{r.name}</p><p className="text-[11px] text-white/30">{r.workspace_name || r.workspace_id?.slice(0, 8)}</p></div> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'ACTIVE' ? 'success' : r.status === 'PAUSED' ? 'warning' : 'default'}>{r.status}</AdminBadge> },
          { key: 'executions', header: 'Executions', render: (r) => <span className="text-white text-xs">{r.executions ?? 0}</span> },
          { key: 'created_at', header: 'Created', render: (r) => <span className="text-[11px] text-white/30">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span> },
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPageChange={setPage}
        onRefresh={load}
      />

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /> Executions & Logs</h3>
        <p className="text-xs text-white/40 mt-1">Platform-level execution monitoring is available via per-workspace automation execution tables. Drill down from workspace view.</p>
      </div>
    </div>
  );
}
