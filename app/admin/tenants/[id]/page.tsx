'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Users, CreditCard, MessageSquare, Activity, ShieldCheck, Loader2, ExternalLink, Ban, CheckCircle2, Pencil } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminTable';
import { AdminModal } from '@/components/admin/AdminModal';

export default function TenantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: '', plan: '', status: '' });
  const [plans, setPlans] = useState<any[]>([]);
  const [assignPlan, setAssignPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      const json = await res.json();
      if (json.status === 'ok') { setData(json.data); setForm({ name: json.data.tenant.name, plan: json.data.tenant.plan, status: json.data.tenant.status }); }
    } catch {} finally { setLoading(false); }
  };
  const loadPlans = async () => {
    try { const r = await fetch('/api/admin/billing/plans'); const j = await r.json(); if (j.status === 'ok') setPlans(j.data); } catch {}
  };
  useEffect(() => { load(); loadPlans(); }, [id]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.status === 'ok') { setEdit(false); load(); }
    } catch {}
  };
  const handleAssignPlan = async () => {
    if (!selectedPlanId) return;
    try {
      const res = await fetch('/api/admin/billing/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: id, planId: selectedPlanId, status: 'active' }) });
      const json = await res.json();
      if (json.status === 'ok') { setAssignPlan(false); load(); }
    } catch {}
  };
  const handleSwitch = async () => {
    try { const res = await fetch('/api/admin/switch-tenant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: id }) }); const json = await res.json(); if (json.status === 'ok') window.location.href = '/dashboard'; } catch {}
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  if (!data) return <div className="p-6 text-white/40 text-sm">Tenant not found.</div>;
  const t = data.tenant;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <Link href="/admin/tenants" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Back to tenants</Link>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-6 h-6 text-indigo-400" /></div>
            <div>
              <h1 className="text-xl font-extrabold text-white">{t.name}</h1>
              <p className="text-xs text-white/40">{t.slug} • {t.plan} • <AdminBadge variant={t.status === 'active' ? 'success' : 'warning'}>{t.status}</AdminBadge></p>
              <p className="text-[11px] text-white/30 mt-1">ID {t.id} • Created {new Date(t.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEdit(true)} className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => setAssignPlan(true)} className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white hover:bg-white/[0.10] flex items-center gap-1.5 cursor-pointer"><CreditCard className="w-3.5 h-3.5" /> Assign Plan</button>
            <button onClick={handleSwitch} className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Switch to Tenant</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Workspaces</p>
            <p className="text-2xl font-extrabold text-white mt-1">{data.workspaces?.length ?? 0}</p>
            <div className="mt-2 space-y-1">
              {(data.workspaces || []).slice(0, 3).map((w: any) => <p key={w.id} className="text-[11px] text-white/50">{w.name} • {w.slug}</p>)}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Members</p>
            <p className="text-2xl font-extrabold text-white mt-1">{data.members?.length ?? 0}</p>
            <div className="mt-2 space-y-1">
              {(data.members || []).slice(0, 3).map((m: any) => <p key={m.id} className="text-[11px] text-white/50">{m.email} • {m.role}</p>)}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Subscription</p>
            {data.subscriptions?.[0] ? (
              <><p className="text-sm font-bold text-white mt-1">{data.subscriptions[0].plan_name || data.subscriptions[0].plan_id}</p><p className="text-xs text-white/40">{data.subscriptions[0].status}</p></>
            ) : <p className="text-xs text-white/40 mt-2">No subscription</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /> Recent Activity / Audit</h3>
          <div className="space-y-2">
            {(data.audit || []).length === 0 ? <p className="text-xs text-white/30">No audit logs.</p> : (data.audit || []).map((a: any) => (
              <div key={a.id} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] flex justify-between">
                <div><p className="text-xs text-white">{a.action}</p><p className="text-[11px] text-white/40">{a.admin_email || a.admin_user_id}</p></div>
                <span className="text-[11px] text-white/30">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp</h3>
          <p className="text-xs text-white/40">View tenant WhatsApp connections from the WhatsApp section, or switch to tenant to manage directly.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/admin/whatsapp" className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold">Open WhatsApp Overview</Link>
            <Link href={`/admin/whatsapp/wabas?tenant=${id}`} className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white">View WABAs</Link>
          </div>
        </div>
      </div>

      <AdminModal open={edit} onClose={() => setEdit(false)} title={`Edit ${t.name}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-white/60">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/60">Plan</label><select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none">
              <option value="starter">starter</option><option value="pro">pro</option><option value="enterprise">enterprise</option>
            </select></div>
            <div><label className="text-xs text-white/60">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none">
              <option value="active">active</option><option value="trial">trial</option><option value="suspended">suspended</option><option value="pending">pending</option>
            </select></div>
          </div>
          <div className="flex justify-end gap-2"><button onClick={() => setEdit(false)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 cursor-pointer">Cancel</button><button onClick={handleSave} className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer">Save</button></div>
        </div>
      </AdminModal>

      <AdminModal open={assignPlan} onClose={() => setAssignPlan(false)} title="Assign Plan">
        <div className="space-y-4">
          <p className="text-xs text-white/50">Select a plan to assign to tenant <strong className="text-white">{t.name}</strong></p>
          <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none">
            <option value="">Select plan…</option>
            {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} — ${p.price}/{p.billing_cycle}</option>)}
          </select>
          <div className="flex justify-end gap-2"><button onClick={() => setAssignPlan(false)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 cursor-pointer">Cancel</button><button onClick={handleAssignPlan} disabled={!selectedPlanId} className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold disabled:opacity-50 cursor-pointer">Assign</button></div>
        </div>
      </AdminModal>
    </div>
  );
}
