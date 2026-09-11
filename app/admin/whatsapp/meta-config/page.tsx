'use client';

import { useEffect, useState } from 'react';
import { Settings, EyeOff, Save, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

export default function MetaConfigPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ appId: '', appSecret: '', embeddedSignupConfigId: '', webhookUrl: '', verifyToken: '', systemUserId: '', systemUserToken: '', apiVersion: 'v22.0', environment: 'production', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/whatsapp/meta-config');
      const j = await r.json();
      if (j.status === 'ok') {
        setData(j.data);
        const s = j.data.stored || {};
        setForm((f) => ({ ...f, appId: s.app_id || j.data.env?.appId || '', apiVersion: s.api_version || j.data.env?.apiVersion || 'v22.0', environment: s.environment || 'production', webhookUrl: s.webhook_url || j.data.env?.webhookUrl || '', embeddedSignupConfigId: s.embedded_signup_config_id || '', systemUserId: s.system_user_id || '' }));
      }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { appId: form.appId, apiVersion: form.apiVersion, environment: form.environment, webhookUrl: form.webhookUrl, embeddedSignupConfigId: form.embeddedSignupConfigId, systemUserId: form.systemUserId, reason: form.reason };
      if (form.appSecret) payload.appSecret = form.appSecret;
      if (form.verifyToken) payload.verifyToken = form.verifyToken;
      if (form.systemUserToken) payload.systemUserToken = form.systemUserToken;
      const res = await fetch('/api/admin/whatsapp/meta-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.status === 'ok') { alert('Meta configuration saved'); load(); setForm((f) => ({ ...f, appSecret: '', verifyToken: '', systemUserToken: '', reason: '' })); } else alert(json.error || 'Failed');
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Settings className="w-6 h-6 text-indigo-400" /> Meta Configuration</h1>
        <p className="text-xs text-white/40 mt-1">Tech Provider infrastructure • App ID • App Secret • Embedded Signup Config • Webhook • System User • API Version • Environment — secrets encrypted & masked</p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
        <EyeOff className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div><p className="text-sm font-bold text-amber-400">Secrets are encrypted at rest</p><p className="text-xs text-white/60">App Secret, Verify Token, System User Token are stored as AES-256-GCM ciphertext + iv/tag. They are displayed as <span className="font-mono text-white/80">••••••••</span> and never returned raw. Rotation is audit-logged.</p></div>
      </div>

      <form onSubmit={handleSave} className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-white/70">App ID</label><input value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} placeholder="1234567890" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div><label className="text-xs font-semibold text-white/70">API Version</label><select value={form.apiVersion} onChange={(e) => setForm({ ...form, apiVersion: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="v22.0">v22.0</option><option value="v21.0">v21.0</option><option value="v20.0">v20.0</option></select></div>
        </div>

        <div><label className="text-xs font-semibold text-white/70 flex items-center gap-2">App Secret <span className="text-[11px] text-white/30 font-normal">(leave blank to keep existing • {data?.stored?.appSecretMasked || 'not set'})</span></label><input value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value })} type="password" placeholder="••••••••••••" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>

        <div><label className="text-xs font-semibold text-white/70">Embedded Signup Configuration ID</label><input value={form.embeddedSignupConfigId} onChange={(e) => setForm({ ...form, embeddedSignupConfigId: e.target.value })} placeholder="123456789012345" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-white/70">Webhook URL</label><input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://wazzi.app/api/webhooks" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div><label className="text-xs font-semibold text-white/70">Webhook Verify Token <span className="text-[11px] text-white/30 font-normal">({data?.stored?.verifyTokenMasked || 'env'})</span></label><input value={form.verifyToken} onChange={(e) => setForm({ ...form, verifyToken: e.target.value })} type="password" placeholder="••••••••••••" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-white/70">System User ID</label><input value={form.systemUserId} onChange={(e) => setForm({ ...form, systemUserId: e.target.value })} placeholder="123456789" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div><label className="text-xs font-semibold text-white/70">System User Token <span className="text-[11px] text-white/30 font-normal">({data?.stored?.systemUserTokenMasked || 'not set'})</span></label><input value={form.systemUserToken} onChange={(e) => setForm({ ...form, systemUserToken: e.target.value })} type="password" placeholder="••••••••••••" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
        </div>

        <div>
          <label className="text-xs font-semibold text-white/70">Environment</label>
          <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="production">production</option><option value="staging">staging</option><option value="development">development</option></select>
        </div>

        <div><label className="text-xs font-semibold text-white/70">Reason for change (audit log)</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Rotation due to security policy" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Configuration'}</button>
          <span className="text-[11px] text-white/30 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Every change is audit-logged</span>
        </div>
      </form>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white">Environment Fallback</h3>
        <div className="mt-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between"><span className="text-white/40">FB_APP_ID</span><span className="text-white/80">{data?.env?.appId || 'not set'}</span></div>
          <div className="flex justify-between"><span className="text-white/40">FB_VERIFY_TOKEN</span><span className="text-white/80">{data?.env?.verifyToken || 'not set'}</span></div>
          <div className="flex justify-between"><span className="text-white/40">FB_GRAPH_API_VERSION</span><span className="text-white/80">{data?.env?.apiVersion}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Webhook URL</span><span className="text-white/80 text-[11px]">{data?.env?.webhookUrl || '—'}</span></div>
        </div>
      </div>
    </div>
  );
}
