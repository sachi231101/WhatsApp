'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Building2, CreditCard, MessageSquare, Brain, Megaphone, Zap, ShoppingBag,
  TrendingUp, AlertTriangle, CheckCircle2, Activity, ArrowUpRight, RefreshCw, Loader2, Sparkles, DollarSign, FileText
} from 'lucide-react';
import { AdminStatCard, AdminSectionTitle } from '@/components/admin/AdminCard';

function formatNumber(n: number) { return new Intl.NumberFormat('en-US').format(n); }
function formatCurrency(n: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); }

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json.status === 'ok') setData(json.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!data) return <div className="p-6 text-white/40 text-sm">Failed to load platform stats.</div>;

  const kpi = [
    { label: 'Total Users', value: formatNumber(data.totalUsers ?? 0), sub: `${data.activeUsers ?? 0} active • ${data.admins ?? 0} admins`, icon: Users, accent: 'text-white', iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400' },
    { label: 'Total Businesses', value: formatNumber(data.totalTenants ?? 0), sub: `${data.activeBusinesses ?? 0} active • ${data.trialAccounts ?? 0} trial`, icon: Building2, accent: 'text-white', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
    { label: 'Active Subscriptions', value: formatNumber(data.activeSubscriptions ?? 0), sub: `${data.availablePlans ?? 3} plans • ${data.trialSubs ?? 0} trial subs`, icon: CreditCard, accent: 'text-white', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
    { label: 'Monthly Revenue (MRR)', value: formatCurrency(data.mrr ?? 0), sub: `ARR ${formatCurrency(data.arr ?? 0)} • total ${formatCurrency(data.totalRevenue ?? 0)}`, icon: DollarSign, accent: 'text-emerald-400', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
    { label: 'Connected WABAs', value: formatNumber(data.connectedWabas ?? 0), sub: `${data.totalPhones ?? data.connectedPhones ?? 0} phone numbers`, icon: MessageSquare, accent: 'text-white', iconBg: 'bg-green-500/10', iconColor: 'text-green-400' },
    { label: 'Active AI Agents', value: formatNumber(data.activeAgents ?? 0), sub: `${formatNumber(data.aiConversations ?? 0)} conversations • ${formatNumber(data.totalTokens ?? 0)} tokens`, icon: Brain, accent: 'text-white', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400' },
    { label: 'Campaigns', value: formatNumber(data.totalCampaigns ?? 0), sub: `${data.runningCampaigns ?? 0} running`, icon: Megaphone, accent: 'text-white', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400' },
    { label: 'Automation Executions', value: formatNumber(data.automationExecutions ?? 0), sub: `${data.failedExecutions ?? 0} failed`, icon: Zap, accent: 'text-white', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
  ];

  const actionRequired = data.actionRequired || {};

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Platform Performance Insights
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Platform Overview</h1>
          <p className="text-xs text-white/40 mt-1">Real-time SaaS metrics across tenants, billing, WhatsApp, AI, campaigns & automations.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={load} className="p-2 rounded-xl bg-white text-black hover:bg-white/90 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map((k) => (
          <AdminStatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} accent={k.accent} iconBg={k.iconBg} iconColor={k.iconColor} />
        ))}
      </div>

      {/* Extra KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl px-5 py-4">
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Workspaces</p>
          <p className="text-xl font-extrabold text-white mt-1">{formatNumber(data.totalWorkspaces ?? 0)}</p>
          <p className="text-[11px] text-white/30 mt-1">{formatNumber(data.activeWorkspaces ?? 0)} active</p>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl px-5 py-4">
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Failed Payments</p>
          <p className="text-xl font-extrabold text-red-400 mt-1">{formatNumber(data.failedPayments ?? 0)}</p>
          <p className="text-[11px] text-white/30 mt-1">Successful {formatNumber(data.successfulPayments ?? 0)}</p>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl px-5 py-4">
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">AI Usage</p>
          <p className="text-xl font-extrabold text-purple-400 mt-1">{formatNumber(data.totalTokens ?? 0)} tokens</p>
          <p className="text-[11px] text-white/30 mt-1">Est. ${data.estimatedCost ?? '0.00'}</p>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl px-5 py-4">
          <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Commerce Orders</p>
          <p className="text-xl font-extrabold text-amber-400 mt-1">{formatNumber(data.commerceOrders ?? 0)}</p>
          <p className="text-[11px] text-white/30 mt-1">{formatNumber(data.openTickets ?? 0)} open tickets</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Action Required */}
        <div className="lg:col-span-1 bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Action Required</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Failed payments', count: actionRequired.failedPayments ?? 0, color: (actionRequired.failedPayments ?? 0) > 0 ? 'text-red-400' : 'text-white/40' },
              { label: 'WhatsApp connection problems', count: actionRequired.whatsappProblems ?? 0, color: (actionRequired.whatsappProblems ?? 0) > 0 ? 'text-amber-400' : 'text-white/40' },
              { label: 'Webhook failures', count: actionRequired.webhookFailures ?? 0, color: (actionRequired.webhookFailures ?? 0) > 0 ? 'text-amber-400' : 'text-white/40' },
              { label: 'Meta configuration problems', count: actionRequired.metaConfigProblems ?? 0, color: 'text-white/40' },
              { label: 'AI errors', count: actionRequired.aiErrors ?? 0, color: 'text-white/40' },
            ].map((it) => (
              <div key={it.label} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <span className="text-xs text-white/70">{it.label}</span>
                <span className={`text-xs font-bold ${it.count > 0 ? it.color : 'text-white/30'}`}>{it.count}</span>
              </div>
            ))}
            {Object.values(actionRequired).every((v: any) => v === 0) && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4" /> All systems operational
              </div>
            )}
          </div>
        </div>

        {/* Recent signups/payments/activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">Recent Tenants</h3>
              <Link href="/admin/tenants" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {(data.recentTenants || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-white/30">No tenants yet.</div>
              ) : (
                (data.recentTenants || []).map((t: any) => (
                  <div key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div>
                      <p className="text-xs font-semibold text-white">{t.name}</p>
                      <p className="text-[11px] text-white/40">{t.slug} • {t.plan} • {t.status}</p>
                    </div>
                    <span className="text-[11px] text-white/30">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white">Recent Payments</h3>
              <Link href="/admin/billing/payments" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {(data.recentPayments || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-white/30">No payments yet.</div>
              ) : (
                (data.recentPayments || []).map((p: any) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div>
                      <p className="text-xs font-semibold text-white">{p.gateway} • {p.amount} {p.currency}</p>
                      <p className="text-[11px] text-white/40">{p.status}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${p.status === 'successful' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : p.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{p.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <AdminSectionTitle title="System Health" subtitle="Real-time subsystem status" action={<Link href="/admin/monitoring" className="text-xs text-indigo-400 hover:underline">View monitoring →</Link>} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          {(data.systemHealth || []).map((s: any) => (
            <div key={s.name} className="rounded-2xl border px-3 py-3 text-center" style={{ background: s.color === 'emerald' ? 'rgba(16,185,129,0.08)' : s.color === 'amber' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)', borderColor: s.color === 'emerald' ? 'rgba(16,185,129,0.15)' : s.color === 'amber' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }}>
              <p className="text-[11px] text-white/50 font-semibold">{s.name}</p>
              <p className={`text-xs font-bold mt-1 ${s.color === 'emerald' ? 'text-emerald-400' : s.color === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>{s.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Manage Tenants', href: '/admin/tenants', icon: Building2, desc: 'View & moderate all businesses' },
          { label: 'Billing Overview', href: '/admin/billing/plans', icon: CreditCard, desc: 'Plans, subscriptions, invoices' },
          { label: 'WhatsApp Infra', href: '/admin/whatsapp', icon: MessageSquare, desc: 'WABA, phones, webhooks, Meta' },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="bg-[#11141f] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 flex gap-4 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0"><c.icon className="w-5 h-5 text-indigo-400" /></div>
            <div>
              <p className="text-sm font-bold text-white">{c.label}</p>
              <p className="text-xs text-white/40">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
