'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';
import { AdminModal } from '@/components/admin/AdminModal';

export default function SubscriptionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState({ tenantId: '', planId: '', status: 'active', billingCycle: 'monthly', trialDays: '14' });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (status) qs.set('status', status);
      const r = await fetch(`/api/admin/billing/subscriptions?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  const loadMeta = async () => {
    try {
      const t = await fetch('/api/admin/tenants?page=1&pageSize=100'); const tj = await t.json(); if (tj.status === 'ok') setTenants(tj.data);
      const p = await fetch('/api/admin/billing/plans'); const pj = await p.json(); if (pj.status === 'ok') setPlans(pj.data);
    } catch {}
  };
  useEffect(() => { load(); }, [page, status]);
  useEffect(() => { loadMeta(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/billing/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: form.tenantId, planId: form.planId, status: form.status, billingCycle: form.billingCycle, trialDays: parseInt(form.trialDays) || 0 }) });
      const json = await res.json();
      if (json.status === 'ok') { setShowCreate(false); load(); } else alert(json.error);
    } catch {}
  };

  const handleAction = async (id: string, newStatus: string) => {
    await fetch(`/api/admin/tenants/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus === 'cancelled' ? 'cancelled' : newStatus }) });
    // Direct subscription update via patch if we build endpoint later; for now reload
    load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-indigo-400" /> Subscriptions</h1>
          <p className="text-xs text-white/40 mt-1">Trial • Active • Past Due • Cancelled • Suspended • Expired • Paused  —  Assign / Upgrade / Downgrade / Extend Trial / Cancel / Pause / Resume</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Assign Plan</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'trial', 'active', 'past_due', 'cancelled', 'suspended', 'expired', 'paused'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${status === s ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{s || 'All'}</button>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'tenant_name', header: 'Tenant', render: (r) => <div><p className="font-semibold text-white">{r.tenant_name || '—'}</p><p className="text-[11px] text-white/30">{r.tenant_slug || r.tenant_id?.slice(0, 8)}</p></div> },
          { key: 'plan_name', header: 'Plan', render: (r) => <span className="text-white/80">{r.plan_name || r.plan_slug || '—'}</span> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'active' ? 'success' : r.status === 'trial' ? 'warning' : r.status === 'cancelled' || r.status === 'suspended' ? 'danger' : 'default'}>{r.status}</AdminBadge> },
          { key: 'billing_cycle', header: 'Cycle', render: (r) => <span className="text-white/60 text-xs">{r.billing_cycle}</span> },
          { key: 'current_period_end', header: 'Period End', render: (r) => <span className="text-white/40 text-[11px]">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : r.trial_end ? new Date(r.trial_end).toLocaleDateString() : '—'}</span> },
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

      <AdminModal open={showCreate} onClose={() => setShowCreate(false)} title="Assign Plan to Tenant">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="text-xs text-white/60">Tenant</label><select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="">Select…</option>{tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name} — {t.slug}</option>)}</select></div>
          <div><label className="text-xs text-white/60">Plan</label><select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} required className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="">Select…</option>{plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}</select></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-white/60">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="trial">trial</option><option value="active">active</option><option value="suspended">suspended</option><option value="cancelled">cancelled</option></select></div>
            <div><label className="text-xs text-white/60">Cycle</label><select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="monthly">monthly</option><option value="yearly">yearly</option></select></div>
            <div><label className="text-xs text-white/60">Trial days</label><input value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} type="number" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer">Assign</button></div>
        </form>
      </AdminModal>
    </div>
  );
}
