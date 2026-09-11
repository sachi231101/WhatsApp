'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, Pencil, Crown, Check, X } from 'lucide-react';
import { AdminBadge } from '@/components/admin/AdminTable';
import { AdminModal, ConfirmDialog } from '@/components/admin/AdminModal';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', price: '0', currency: 'USD', billingCycle: 'monthly', trialDays: '14', isPopular: false, status: 'active', visibility: 'public', limitsJson: '{"whatsapp_numbers":1,"messages":1000,"contacts":500,"ai_agents":1,"campaigns":5,"workflows":2,"team_members":3}' });

  const load = async () => {
    setLoading(true);
    try { const r = await fetch('/api/admin/billing/plans'); const j = await r.json(); if (j.status === 'ok') setPlans(j.data); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let limits = {};
      try { limits = JSON.parse(form.limitsJson); } catch {}
      const payload: any = { name: form.name, slug: form.slug, description: form.description, price: form.price, currency: form.currency, billingCycle: form.billingCycle, trialDays: parseInt(form.trialDays) || 0, isPopular: form.isPopular, status: form.status, visibility: form.visibility, limits };
      if (editing) {
        const res = await fetch(`/api/admin/billing/plans/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json(); if (json.status !== 'ok') throw new Error(json.error);
      } else {
        const res = await fetch('/api/admin/billing/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json(); if (json.status !== 'ok') throw new Error(json.error);
      }
      setShowCreate(false); setEditing(null); setForm({ name: '', slug: '', description: '', price: '0', currency: 'USD', billingCycle: 'monthly', trialDays: '14', isPopular: false, status: 'active', visibility: 'public', limitsJson: form.limitsJson }); load();
    } catch (e: any) { alert(e.message); }
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, slug: p.slug, description: p.description || '', price: String(p.price), currency: p.currency, billingCycle: p.billing_cycle || 'monthly', trialDays: String(p.trial_days ?? 14), isPopular: p.is_popular, status: p.status, visibility: p.visibility || 'public', limitsJson: JSON.stringify(p.limits || p.features || {}, null, 2) });
    setShowCreate(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-indigo-400" /> Plan Management</h1>
          <p className="text-xs text-white/40 mt-1">Flexible plan engine • Boolean / numeric / unlimited entitlements • WhatsApp • AI • Campaigns • Automation • Commerce</p>
        </div>
        <button onClick={() => { setEditing(null); setShowCreate(true); }} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Create Plan</button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-64 bg-[#11141f] border border-white/[0.06] rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className={`bg-[#11141f] border rounded-2xl p-6 flex flex-col ${p.is_popular ? 'border-indigo-500/30 shadow-xl shadow-indigo-500/10' : 'border-white/[0.06]'}`}>
              {p.is_popular && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold mb-3 w-fit"><Crown className="w-3 h-3" /> POPULAR</span>}
              <div className="flex items-start justify-between">
                <div><h3 className="text-lg font-extrabold text-white">{p.name}</h3><p className="text-xs text-white/40">{p.slug} • {p.billing_cycle} • {p.currency}</p></div>
                <AdminBadge variant={p.status === 'active' ? 'success' : 'default'}>{p.status}</AdminBadge>
              </div>
              <p className="text-xs text-white/50 mt-2 line-clamp-2">{p.description || 'No description'}</p>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-extrabold text-white">${p.price}</span><span className="text-xs text-white/40">/{p.billing_cycle}</span></div>
              <p className="text-[11px] text-white/30 mt-1">{p.trial_days ? `${p.trial_days}-day trial` : 'No trial'} • {p.subscriberCount ?? 0} subscribers</p>

              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-1.5">
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Entitlements</p>
                {Object.entries((p.limits || p.features || {}) as Record<string, any>).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs"><span className="text-white/60">{k.replaceAll('_', ' ')}</span><span className="font-bold text-white">{String(v)}</span></div>
                ))}
                {Object.keys(p.limits || {}).length === 0 && <p className="text-xs text-white/30">No limits configured</p>}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(p)} className="flex-1 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white hover:bg-white/[0.10] flex items-center justify-center gap-1.5 cursor-pointer"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/40 cursor-not-allowed" title="Delete (archive instead)"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-2">Plan Templates / Snippets</h3>
        <p className="text-xs text-white/40">Copy limits JSON to create new plans quickly. Supports boolean (feature_enabled=true), numeric (feature_limit=10000), and unlimited.</p>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
          {[
            '{"whatsapp_numbers":1,"messages":1000,"support":"email"}',
            '{"whatsapp_numbers":3,"messages":10000,"ai_agents":5,"support":"priority"}',
            '{"whatsapp_numbers":10,"messages":100000,"ai_agents":50,"support":"dedicated","unlimited_contacts":true}',
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] font-mono text-[11px] text-white/60">{s}</div>
          ))}
        </div>
      </div>

      <AdminModal open={showCreate} onClose={() => { setShowCreate(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : 'Create Plan'} maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/60">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Starter" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
            <div><label className="text-xs text-white/60">Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required placeholder="starter" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          </div>
          <div><label className="text-xs text-white/60">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Perfect for small teams…" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-white/60">Price</label><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
            <div><label className="text-xs text-white/60">Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option>USD</option><option>INR</option><option>EUR</option></select></div>
            <div><label className="text-xs text-white/60">Cycle</label><select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="monthly">monthly</option><option value="yearly">yearly</option><option value="lifetime">lifetime</option></select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-white/60">Trial days</label><input value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} type="number" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
            <div><label className="text-xs text-white/60">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select></div>
            <label className="flex items-center gap-2 text-xs text-white/60 mt-6 cursor-pointer"><input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="rounded" /> Popular</label>
          </div>
          <div><label className="text-xs text-white/60">Limits JSON (numeric/boolean/unlimited)</label><textarea value={form.limitsJson} onChange={(e) => setForm({ ...form, limitsJson: e.target.value })} rows={4} className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none font-mono" /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer">{editing ? 'Update' : 'Create'}</button></div>
        </form>
      </AdminModal>
    </div>
  );
}
