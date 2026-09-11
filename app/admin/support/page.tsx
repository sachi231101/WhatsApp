'use client';

import { useEffect, useState } from 'react';
import { Headset, Plus } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';
import { AdminModal } from '@/components/admin/AdminModal';

export default function SupportPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', status: 'new' });
  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (status) qs.set('status', status);
      const r = await fetch(`/api/admin/support?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await res.json();
      if (j.status === 'ok') { setShow(false); setForm({ subject: '', description: '', status: 'new' }); load(); }
    } catch {}
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Headset className="w-6 h-6 text-indigo-400" /> Support — Tickets & Inquiries</h1>
          <p className="text-xs text-white/40 mt-1">New • Open • In Progress • Resolved • Closed • Tenant Guide</p>
        </div>
        <button onClick={() => setShow(true)} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> New Ticket</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'new', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${status === s ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{s || 'All'}</button>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'subject', header: 'Subject', render: (r) => <div><p className="font-semibold text-white text-xs">{r.subject}</p><p className="text-[11px] text-white/40 line-clamp-1">{r.description}</p></div> },
          { key: 'tenant_name', header: 'Tenant', render: (r) => <span className="text-xs text-white/60">{r.tenant_name || r.tenant_id?.slice(0, 8) || '—'}</span> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'resolved' || r.status === 'closed' ? 'success' : r.status === 'new' ? 'info' : r.status === 'in_progress' ? 'warning' : 'default'}>{r.status}</AdminBadge> },
          { key: 'priority', header: 'Priority', render: (r) => <span className="text-xs text-white/60">{r.priority}</span> },
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
        <h3 className="text-sm font-bold text-white">Tenant Guide</h3>
        <p className="text-xs text-white/40 mt-1">Quick resolution steps: verify workspace membership → check subscription status → inspect WABA connection → review webhook events → escalate.</p>
      </div>

      <AdminModal open={show} onClose={() => setShow(false)} title="New Support Ticket">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="text-xs text-white/60">Subject</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="Issue title" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div><label className="text-xs text-white/60">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe…" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div><label className="text-xs text-white/60">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="new">new</option><option value="open">open</option><option value="in_progress">in_progress</option><option value="resolved">resolved</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer">Create</button></div>
        </form>
      </AdminModal>
    </div>
  );
}
