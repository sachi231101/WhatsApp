'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Clock,
  CheckCircle2,
  UserCheck,
  Send,
  Phone,
  Target,
  Zap,
  Loader2,
} from 'lucide-react';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  up,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  change: string;
  up: boolean;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  );
}

// ─── AI Insight Card ────────────────────────────────────────────────────────
function InsightCard({
  type,
  icon: Icon,
  iconColor,
  bg,
  text,
}: {
  type: string;
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  text: string;
}) {
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${bg} transition-all hover:scale-[1.01]`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">{type}</p>
        <p className="text-sm text-white/80 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ─── Activity Item ──────────────────────────────────────────────────────────
function ActivityItem({
  icon: Icon,
  color,
  text,
  time,
}: {
  icon: React.ElementType;
  color: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 leading-relaxed">{text}</p>
        <p className="text-[10px] text-white/25 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function ClientDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'ok') {
          setData(json.data);
        }
      })
      .catch((err) => console.error('Stats error:', err))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {
    totalConversations: 1284,
    aiResolved: 873,
    hotLeads: 47,
    conversionRate: '23.4%',
    messagesToday: 3847,
    activeContacts: 12490,
  };

  const recent = data?.recentConversations || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Good morning, Sachin 👋</h1>
          <p className="text-sm text-white/40 mt-0.5">Here&apos;s what&apos;s happening with your WhatsApp today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.07] text-sm text-white/60 hover:text-white/80 hover:bg-white/[0.07] transition-all">
            <Clock className="w-3.5 h-3.5" />
            Last 7 days
          </button>
          <Link
            href="/inbox"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-sm font-semibold text-white shadow-lg shadow-green-900/30 hover:opacity-90 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Open Team Inbox
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Conversations"
          value={stats.totalConversations}
          change="12%"
          up
          icon={MessageSquare}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="AI Resolved"
          value={stats.aiResolved}
          change="18%"
          up
          icon={Bot}
          color="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          label="Hot Leads"
          value={stats.hotLeads}
          change="5%"
          up
          icon={Flame}
          color="bg-orange-500/10 text-orange-400"
        />
        <StatCard
          label="Conversion Rate"
          value={stats.conversionRate}
          change="2.1%"
          up
          icon={TrendingUp}
          color="bg-green-500/10 text-green-400"
        />
      </div>

      {/* AI Demo & Meeting Calendar Section */}
      <DashboardCalendar
        onNotificationUpdate={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('wazzapp:notification-update'));
          }
        }}
      />

      {/* Middle Row: AI Insights + Live Conversations */}
      <div className="grid grid-cols-3 gap-4">
        {/* AI Insights Panel */}
        <div className="col-span-1 bg-[#13151c] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white">AI Insights</h2>
          </div>
          <div className="space-y-2.5">
            <InsightCard
              type="Trend"
              icon={TrendingUp}
              iconColor="bg-green-500/10 text-green-400"
              bg="border-green-500/10 bg-green-500/[0.03]"
              text="Lead conversion increased by 18% this week"
            />
            <InsightCard
              type="Hot Topic"
              icon={Flame}
              iconColor="bg-orange-500/10 text-orange-400"
              bg="border-orange-500/10 bg-orange-500/[0.03]"
              text="Most customers are asking about pricing"
            />
            <InsightCard
              type="Warning"
              icon={AlertTriangle}
              iconColor="bg-yellow-500/10 text-yellow-400"
              bg="border-yellow-500/10 bg-yellow-500/[0.03]"
              text="23 hot leads haven't received a human response"
            />
            <InsightCard
              type="AI Performance"
              icon={Bot}
              iconColor="bg-purple-500/10 text-purple-400"
              bg="border-purple-500/10 bg-purple-500/[0.03]"
              text="AI resolved 68% of conversations today"
            />
            <InsightCard
              type="Recommendation"
              icon={Lightbulb}
              iconColor="bg-blue-500/10 text-blue-400"
              bg="border-blue-500/10 bg-blue-500/[0.03]"
              text="Create a pricing-focused campaign to convert 23 warm leads"
            />
          </div>
          <Link
            href="/ai-agents"
            className="block text-center w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/20 text-xs font-semibold text-violet-400 hover:from-violet-600/30 hover:to-purple-600/30 transition-all"
          >
            Manage AI Agents ✨
          </Link>
        </div>

        {/* Live Conversations from Database */}
        <div className="col-span-2 bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Live Conversations</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-500/15 text-green-400">
                {stats.totalConversations} total
              </span>
            </div>
            <Link href="/inbox" className="text-xs text-white/40 hover:text-white/80 transition-colors">
              View all in Inbox →
            </Link>
          </div>

          <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-xs text-white/40">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-green-400" />
                Loading conversations...
              </div>
            ) : recent.length > 0 ? (
              recent.map((c: any) => (
                <Link
                  key={c.id}
                  href="/inbox"
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border border-white/10">
                    {(c.profile_name || c.phone_number || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-white/90 group-hover:text-green-400 transition-colors">
                        {c.profile_name || c.phone_number}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40 truncate">{c.last_message_preview || 'No messages'}</span>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400">
                          {c.status}
                        </span>
                        {c.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-green-500 text-[9px] font-bold text-white flex items-center justify-center">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-white/30">No conversations yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Campaign Performance + Activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Campaign Performance */}
        <div className="col-span-2 bg-[#13151c] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Campaign Performance</h2>
            <Link href="/campaigns" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Manage Campaigns →
            </Link>
          </div>

          <div className="space-y-4">
            {[
              { name: 'Diwali Sale 2026', sent: 4200, read: 3100, replied: 890, rate: 74, color: 'bg-green-500' },
              { name: 'Product Launch — Pro Plan', sent: 1800, read: 1100, replied: 320, rate: 61, color: 'bg-blue-500' },
              { name: 'Re-engagement Campaign', sent: 3600, read: 1800, replied: 210, rate: 50, color: 'bg-yellow-500' },
              { name: 'Support Follow-up', sent: 980, read: 870, replied: 640, rate: 89, color: 'bg-purple-500' },
            ].map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white/75">{c.name}</span>
                  <div className="flex items-center gap-4 text-[11px] text-white/35">
                    <span>{c.sent.toLocaleString()} sent</span>
                    <span>{c.replied.toLocaleString()} replied</span>
                    <span className="font-semibold text-white/60">{c.rate}% read</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className={`h-full ${c.color} rounded-full opacity-70`} style={{ width: `${c.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white">Recent Activity</h2>
          </div>
          <div className="divide-y divide-white/[0.05]">
            <ActivityItem icon={Bot} color="bg-purple-500/10 text-purple-400" text="AI Agent resolved 12 conversations automatically" time="2 minutes ago" />
            <ActivityItem icon={Flame} color="bg-orange-500/10 text-orange-400" text="New hot lead: Rahul Sharma (score: 87)" time="5 minutes ago" />
            <ActivityItem icon={Send} color="bg-blue-500/10 text-blue-400" text="Campaign 'Diwali Sale' sent to 4,200 contacts" time="1 hour ago" />
            <ActivityItem icon={UserCheck} color="bg-green-500/10 text-green-400" text="Agent Priya was assigned 3 conversations" time="2 hours ago" />
            <ActivityItem icon={Phone} color="bg-teal-500/10 text-teal-400" text="New phone number +91 98765 43210 connected" time="3 hours ago" />
            <ActivityItem icon={Target} color="bg-red-500/10 text-red-400" text="Lead qualification workflow triggered for 8 contacts" time="4 hours ago" />
            <ActivityItem icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" text="Template 'order_confirmation' approved by Meta" time="6 hours ago" />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Messages Today', value: stats.messagesToday, icon: MessageSquare, color: 'text-blue-400' },
          { label: 'AI Resolution Rate', value: '68%', icon: Bot, color: 'text-purple-400' },
          { label: 'Avg Response Time', value: '1.4 min', icon: Zap, color: 'text-yellow-400' },
          { label: 'Active Contacts', value: stats.activeContacts, icon: Users, color: 'text-green-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#13151c] border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-white/10 transition-all">
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div>
              <p className="text-base font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/30">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
