'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function PaymentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (status) qs.set('status', status);
      if (gateway) qs.set('gateway', gateway);
      if (search) qs.set('search', search);
      const r = await fetch(`/api/admin/billing/payments?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status, gateway, search]);
  useEffect(() => { setPage(1); }, [status, gateway, search]);

  const exportCsv = () => {
    const header = 'id,amount,currency,gateway,status,tenant,created_at\n';
    const rows = data.map((r) => `${r.id},${r.amount},${r.currency},${r.gateway},${r.status},${r.tenant_name || r.tenant_id},${r.created_at}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-indigo-400" /> Payments</h1>
          <p className="text-xs text-white/40 mt-1">Payment history • Successful / Pending / Failed / Refunds / Disputes • Razorpay / Stripe abstraction</p>
        </div>
        <button onClick={exportCsv} className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'successful', 'pending', 'failed', 'refunded', 'disputed'].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${status === s ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{s || 'All'}</button>
        ))}
        <span className="mx-2 h-6 w-px bg-white/[0.08] hidden sm:block" />
        {['', 'razorpay', 'stripe'].map((g) => (
          <button key={g || 'all-g'} onClick={() => setGateway(g)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${gateway === g ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{g || 'All gateways'}</button>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'id', header: 'Payment ID', render: (r) => <span className="font-mono text-[11px] text-white/60">{r.id.slice(0, 12)}…</span> },
          { key: 'tenant_name', header: 'Tenant', render: (r) => <span className="text-white text-xs">{r.tenant_name || r.tenant_id?.slice(0, 8) || '—'}</span> },
          { key: 'amount', header: 'Amount', render: (r) => <span className="font-bold text-white">{r.amount} {r.currency}</span> },
          { key: 'gateway', header: 'Gateway', render: (r) => <span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${r.gateway === 'stripe' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{r.gateway}</span> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'successful' ? 'success' : r.status === 'failed' ? 'danger' : r.status === 'pending' ? 'warning' : 'default'}>{r.status}</AdminBadge> },
          { key: 'created_at', header: 'Date', render: (r) => <span className="text-white/40 text-[11px]">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</span> },
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payment, gateway…"
        onRefresh={load}
      />

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white">Payment Providers</h3>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            { name: 'Razorpay', key: 'RAZORPAY_KEY_ID', desc: 'Primary for INR • UPI • Cards • NetBanking' },
            { name: 'Stripe', key: 'STRIPE_SECRET_KEY', desc: 'Global • Cards • International' },
          ].map((p) => (
            <div key={p.name} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-sm font-bold text-white">{p.name}</p>
              <p className="text-xs text-white/40">{p.desc}</p>
              <p className="text-[11px] text-white/30 mt-2 font-mono">{p.key} {process.env[p.key] ? '• configured' : '• not set (mock mode)'}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/30 mt-3">Configure gateway keys in environment to enable live payments. Without keys, billing runs in mock mode.</p>
      </div>
    </div>
  );
}
