'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Smartphone, FileText, Webhook, Settings, Activity, Building2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { AdminStatCard } from '@/components/admin/AdminCard';

export default function WhatsappOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/admin/whatsapp/overview').then((r) => r.json()).then((j) => { if (j.status === 'ok') setData(j.data); }).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  if (!data) return <div className="p-6 text-white/40">Failed to load WhatsApp overview.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><MessageSquare className="w-6 h-6 text-emerald-400" /> WhatsApp / Meta Tech Provider</h1>
        <p className="text-xs text-white/40 mt-1">Client → WAZZI Dashboard → Embedded Signup → WABA → Phone Number → Webhook → Backend → Workspace</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="WABA Accounts" value={data.totalWabas ?? 0} sub={`${data.connectedWabas ?? 0} connected`} icon={Building2} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
        <AdminStatCard label="Phone Numbers" value={data.totalPhones ?? 0} sub={`${data.activeConnections ?? 0} active connections`} icon={Smartphone} iconBg="bg-blue-500/10" iconColor="text-blue-400" />
        <AdminStatCard label="Templates" value={data.totalTemplates ?? 0} sub={`${data.approvedTemplates ?? 0} approved`} icon={FileText} iconBg="bg-purple-500/10" iconColor="text-purple-400" />
        <AdminStatCard label="Webhook Events" value={data.totalWebhooks ?? 0} sub={`${data.failedWebhooks ?? 0} failed`} icon={Webhook} accent={data.failedWebhooks > 3 ? 'text-amber-400' : 'text-white'} iconBg={data.failedWebhooks > 3 ? 'bg-amber-500/10' : 'bg-indigo-500/10'} iconColor={data.failedWebhooks > 3 ? 'text-amber-400' : 'text-indigo-400'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /> Recent Webhook Events</h3>
          <div className="space-y-2">
            {(data.recentWebhooks || []).length === 0 ? <p className="text-xs text-white/30">No webhook events.</p> : (data.recentWebhooks || []).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <div><p className="text-xs font-semibold text-white">{w.event_type} • {w.field || 'messages'}</p><p className="text-[11px] text-white/40">{w.meta_waba_id || '—'} • {w.provider}</p></div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${w.processing_status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : w.processing_status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{w.processing_status}</span>
              </div>
            ))}
          </div>
          <Link href="/admin/whatsapp/webhooks" className="mt-4 inline-flex text-xs text-indigo-400 hover:underline items-center gap-1">View all webhooks <ExternalLink className="w-3 h-3" /></Link>
        </div>

        <div className="space-y-4">
          <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Meta Configuration</h3>
            <p className="text-xs text-white/40">App ID • App Secret • Embedded Signup Config • Webhook URL • Verify Token • System User • API Version • Environment</p>
            <Link href="/admin/whatsapp/meta-config" className="mt-3 inline-flex px-3 py-2 rounded-xl bg-white text-black text-xs font-bold items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Manage Meta Config</Link>
            <p className="text-[11px] text-white/30 mt-2">Secrets encrypted at rest, masked in UI. Rotation is audit-logged.</p>
          </div>
          <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/admin/whatsapp/wabas" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-white"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-400" /> WABA Accounts</span><ExternalLink className="w-3 h-3 text-white/30" /></Link>
              <Link href="/admin/whatsapp/webhooks" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-white"><span className="flex items-center gap-2"><Webhook className="w-4 h-4 text-indigo-400" /> Webhook Monitoring</span><ExternalLink className="w-3 h-3 text-white/30" /></Link>
              <Link href="/my-wabas" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 text-xs text-emerald-400"><span>Legacy: My WABAs</span><ExternalLink className="w-3 h-3" /></Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Architecture</h3>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {['Client', 'WAZZI Dashboard', 'Connect WhatsApp', 'Meta Embedded Signup', 'WABA', 'Phone Number', 'Webhook', 'Backend', 'Workspace', 'Queue', 'Worker', 'Database', 'AI/Automation'].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70">{s}</span>
              {i < 12 && <span className="text-white/20">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
