'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare, Brain, Megaphone, Zap } from 'lucide-react';
import { AdminStatCard } from '@/components/admin/AdminCard';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch('/api/admin/stats').then(r=>r.json()).then(j=>{ if(j.status==='ok') setData(j.data); }); }, []);
  if (!data) return <div className="p-6 text-white/40 text-sm">Loading analytics…</div>;
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-indigo-400" /> Platform Analytics</h1>
        <p className="text-xs text-white/40 mt-1">Tenant • Revenue • WhatsApp • AI • Campaign • Automation • Commerce — aggregates</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Revenue (Total)" value={`$${Number(data.totalRevenue ?? 0).toLocaleString()}`} icon={BarChart3} accent="text-emerald-400" iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
        <AdminStatCard label="Tenants" value={data.totalTenants ?? 0} icon={Users} iconBg="bg-indigo-500/10" iconColor="text-indigo-400" />
        <AdminStatCard label="WhatsApp Connections" value={data.activeConnections ?? data.connectedPhones ?? 0} icon={MessageSquare} iconBg="bg-green-500/10" iconColor="text-green-400" />
        <AdminStatCard label="AI Tokens" value={Number(data.totalTokens ?? 0).toLocaleString()} icon={Brain} iconBg="bg-purple-500/10" iconColor="text-purple-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Revenue Analytics</h3>
          <p className="text-xs text-white/40 mt-1">MRR ${Number(data.mrr ?? 0).toLocaleString()} • ARR ${Number(data.arr ?? 0).toLocaleString()}</p>
          <div className="mt-4 h-20 flex items-end gap-1">{[40, 65, 50, 80, 70, 90, 60].map((h, i) => <div key={i} className="flex-1 bg-indigo-500/30 rounded-t" style={{ height: `${h}%` }} />)}</div>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Megaphone className="w-4 h-4 text-orange-400" /> Campaign Analytics</h3>
          <p className="text-xs text-white/40 mt-1">{data.totalCampaigns ?? 0} campaigns • {data.runningCampaigns ?? 0} running</p>
          <div className="mt-4 h-20 flex items-end gap-1">{[30, 45, 60, 35, 80, 55, 70].map((h, i) => <div key={i} className="flex-1 bg-orange-500/30 rounded-t" style={{ height: `${h}%` }} />)}</div>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Automation Analytics</h3>
          <p className="text-xs text-white/40 mt-1">{data.automationExecutions ?? 0} executions • {data.failedExecutions ?? 0} failed</p>
          <div className="mt-4 h-20 flex items-end gap-1">{[20, 50, 30, 70, 40, 60, 45].map((h, i) => <div key={i} className="flex-1 bg-amber-500/30 rounded-t" style={{ height: `${h}%` }} />)}</div>
        </div>
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6 text-center">
        <p className="text-xs text-white/30">Per-tenant analytics available from tenant detail: <span className="text-white/60">/admin/tenants/[id]</span> • Workspace analytics • Revenue • WhatsApp • AI drill-down soon.</p>
      </div>
    </div>
  );
}
