'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function WabasPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search) qs.set('search', search);
      const r = await fetch(`/api/admin/whatsapp/wabas?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, search]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Building2 className="w-6 h-6 text-emerald-400" /> WABA Accounts</h1>
        <p className="text-xs text-white/40 mt-1">Platform view of all WABA accounts across workspaces • connection status • business • diagnostics</p>
      </div>
      <AdminTable
        columns={[
          { key: 'waba_id', header: 'WABA ID', render: (r) => <span className="font-mono text-xs text-white">{r.waba_id || '—'}</span> },
          { key: 'name', header: 'Name', render: (r) => <div><p className="font-semibold text-white text-xs">{r.name || '—'}</p><p className="text-[11px] text-white/40">{r.business_id || ''}</p></div> },
          { key: 'tenant_name', header: 'Tenant / Workspace', render: (r) => <div><p className="text-xs text-white">{r.tenant_name || '—'}</p><p className="text-[11px] text-white/40">{r.workspace_name || r.workspace_id?.slice(0, 8)}</p></div> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'connected' ? 'success' : 'warning'}>{r.status}</AdminBadge> },
          { key: 'currency', header: 'Currency', render: (r) => <span className="text-white/60 text-xs">{r.currency || '—'}</span> },
          { key: 'created_at', header: 'Created', render: (r) => <span className="text-white/30 text-[11px]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span> },
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search WABA ID, name…"
        onRefresh={load}
      />
      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <p className="text-xs text-white/40">Secrets (access tokens) are encrypted and masked as <span className="font-mono text-white/60">••••••••</span>. Never expose raw tokens to frontend.</p>
      </div>
    </div>
  );
}
