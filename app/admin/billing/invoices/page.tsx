'use client';

import { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function InvoicesPage() {
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
      const r = await fetch(`/api/admin/billing/invoices?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status]);

  const exportCsv = () => {
    const header = 'id,invoice_number,amount,total,status,tenant,created_at\n';
    const rows = data.map((r) => `${r.id},${r.invoice_number},${r.amount},${r.total_amount},${r.status},${r.tenant_name || r.tenant_id},${r.created_at}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-400" /> Invoices</h1>
          <p className="text-xs text-white/40 mt-1">All • Paid • Pending • Overdue • Cancelled</p>
        </div>
        <button onClick={exportCsv} className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" /> Export</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'paid', 'pending', 'overdue', 'cancelled', 'refunded'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${status === s ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{s || 'All'}</button>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'invoice_number', header: 'Invoice', render: (r) => <span className="font-mono text-xs text-white">{r.invoice_number}</span> },
          { key: 'tenant_name', header: 'Tenant', render: (r) => <span className="text-white text-xs">{r.tenant_name || r.tenant_id?.slice(0, 8) || '—'}</span> },
          { key: 'amount', header: 'Amount', render: (r) => <span className="font-bold text-white">{r.total_amount || r.amount} {r.currency}</span> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'paid' ? 'success' : r.status === 'pending' ? 'warning' : r.status === 'overdue' ? 'danger' : 'default'}>{r.status}</AdminBadge> },
          { key: 'due_date', header: 'Due', render: (r) => <span className="text-white/40 text-[11px]">{r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</span> },
          { key: 'created_at', header: 'Created', render: (r) => <span className="text-white/30 text-[11px]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span> },
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
