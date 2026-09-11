'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function AdminCampaignsPage() {
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
      const r = await fetch(`/api/admin/campaigns?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status]);
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Megaphone className="w-6 h-6 text-orange-400" /> Campaigns — Platform</h1>
        <p className="text-xs text-white/40 mt-1">All • Running • Scheduled • Completed • Failed • Broadcasts • Analytics  —  Recipients • Sent • Delivered • Read • Failed • Replies • Conversions</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {['', 'draft', 'scheduled', 'processing', 'completed', 'failed', 'canceled'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${status === s ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{s || 'All'}</button>
        ))}
      </div>
      <AdminTable
        columns={[
          { key: 'name', header: 'Campaign', render: (r) => <div><p className="font-semibold text-white text-xs">{r.name}</p><p className="text-[11px] text-white/30">{r.workspace_name || r.workspace_id?.slice(0, 8)} • {r.tenant_name || ''}</p></div> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'completed' ? 'success' : r.status === 'processing' || r.status === 'scheduled' ? 'warning' : r.status === 'failed' ? 'danger' : 'default'}>{r.status}</AdminBadge> },
          { key: 'total_recipients', header: 'Recipients', render: (r) => <span className="text-white text-xs">{r.total_recipients ?? 0}</span> },
          { key: 'sent_count', header: 'Sent', render: (r) => <span className="text-white/70 text-xs">{r.sent_count ?? 0}</span> },
          { key: 'delivered_count', header: 'Delivered', render: (r) => <span className="text-white/70 text-xs">{r.delivered_count ?? 0}</span> },
          { key: 'read_count', header: 'Read', render: (r) => <span className="text-white/70 text-xs">{r.read_count ?? 0}</span> },
          { key: 'failed_count', header: 'Failed', render: (r) => <span className={`${(r.failed_count ?? 0) > 0 ? 'text-red-400' : 'text-white/40'} text-xs`}>{r.failed_count ?? 0}</span> },
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
    </div>
  );
}
