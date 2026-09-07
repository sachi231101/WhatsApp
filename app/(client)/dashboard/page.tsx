'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  Users,
  Send,
  Calendar,
  ChevronDown,
  TrendingUp,
  Clock,
  MessageCircle,
  Trophy,
  Zap,
  Plus,
  Brain,
  Megaphone,
  ArrowRight,
  MoreVertical,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ color, up }: { color: string; up?: boolean }) {
  const paths = [
    'M0,30 C10,28 15,15 25,18 C35,21 40,10 50,8 C60,6 65,12 75,8 C85,4 90,10 100,5',
    'M0,25 C10,22 18,30 28,20 C38,10 45,18 55,12 C65,6 72,15 82,10 C92,5 96,8 100,4',
    'M0,28 C12,20 20,25 30,15 C40,5 48,18 58,10 C68,2 75,12 85,7 C92,4 97,6 100,3',
    'M0,20 C8,25 15,12 25,18 C35,24 42,10 52,14 C62,18 70,8 80,12 C90,6 95,10 100,7',
  ];
  const path = paths[Math.floor(Math.random() * 4)];
  return (
    <svg width="100" height="36" viewBox="0 0 100 36" fill="none" className="flex-shrink-0">
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  up,
  icon: Icon,
  iconBg,
  iconColor,
  sparkColor,
  badge,
}: {
  label: string;
  value: string | number;
  change: string;
  up: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600">{badge}</span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
          <p className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-green-500' : 'text-red-500'}`}>
            <ArrowUpRight className={`w-3 h-3 ${up ? '' : 'rotate-180'}`} />
            {change} vs last week
          </p>
        </div>
        <Sparkline color={sparkColor} up={up} />
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-32 pt-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full flex items-end justify-center" style={{ height: 96 }}>
            <div
              className="w-full bg-blue-500 rounded-t-md opacity-80 hover:opacity-100 transition-all cursor-pointer"
              style={{ height: `${(d.value / max) * 96}px`, minHeight: 4 }}
            />
          </div>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ aiPct, humanPct, unassignedPct, total }: { aiPct: number; humanPct: number; unassignedPct: number; total: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const aiDash = (aiPct / 100) * circ;
  const humanDash = (humanPct / 100) * circ;
  const unassignedDash = (unassignedPct / 100) * circ;
  const aiOffset = 0;
  const humanOffset = -aiDash;
  const unassignedOffset = -(aiDash + humanDash);

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          {/* AI Handled */}
          <circle cx="64" cy="64" r={r} fill="none" stroke="#4F6EF7" strokeWidth="18"
            strokeDasharray={`${aiDash} ${circ - aiDash}`}
            strokeDashoffset={-aiOffset + circ / 4}
            strokeLinecap="butt"
          />
          {/* Human Handled */}
          <circle cx="64" cy="64" r={r} fill="none" stroke="#a855f7" strokeWidth="18"
            strokeDasharray={`${humanDash} ${circ - humanDash}`}
            strokeDashoffset={humanOffset + circ / 4}
            strokeLinecap="butt"
          />
          {/* Unassigned */}
          <circle cx="64" cy="64" r={r} fill="none" stroke="#d1d5db" strokeWidth="18"
            strokeDasharray={`${unassignedDash} ${circ - unassignedDash}`}
            strokeDashoffset={unassignedOffset + circ / 4}
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{total.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: 'AI Handled', pct: aiPct, color: 'bg-[#4F6EF7]' },
          { label: 'Human Handled', pct: humanPct, color: 'bg-purple-500' },
          { label: 'Unassigned', pct: unassignedPct, color: 'bg-gray-300' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
            <span className="text-gray-600">{item.label}</span>
            <span className="font-semibold text-gray-900 ml-auto">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    resolved: 'bg-gray-100 text-gray-500',
    pending: 'bg-orange-100 text-orange-600',
    'ai handling': 'bg-blue-100 text-blue-600',
  };
  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${styles[status.toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => {
      if (j.authenticated) setUserName(j.user.name?.split(' ')[0] || 'there');
    }).catch(() => {});

    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((j) => { if (j.status === 'ok') setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {
    activeConversations: 124,
    aiResolutionRate: 68,
    newLeads: 42,
    messagesToday: 1284,
  };

  const recent: any[] = data?.recentConversations || [
    { id: '1', profile_name: 'Rahul Sharma', last_message_preview: 'Can you tell me the course price?', assigned_to: 'Priya', status: 'open', last_message_at: new Date(Date.now() - 2 * 60000).toISOString() },
    { id: '2', profile_name: 'Priya Patel', last_message_preview: 'Thank you! 🙏', assigned_to: 'AI Agent', status: 'ai handling', last_message_at: new Date(Date.now() - 10 * 60000).toISOString() },
    { id: '3', profile_name: 'Amit Kumar', last_message_preview: 'Do you have a demo class?', assigned_to: 'Vikram', status: 'open', last_message_at: new Date(Date.now() - 25 * 60000).toISOString() },
    { id: '4', profile_name: 'Sneha Reddy', last_message_preview: 'What are the batch timings?', assigned_to: 'AI Agent', status: 'open', last_message_at: new Date(Date.now() - 60 * 60000).toISOString() },
    { id: '5', profile_name: 'Vikrant Tiwari', last_message_preview: 'I want to enroll in this course', assigned_to: 'Neha', status: 'pending', last_message_at: new Date(Date.now() - 120 * 60000).toISOString() },
  ];

  const barData = [
    { label: 'Apr 24', value: 95 },
    { label: 'Apr 25', value: 60 },
    { label: 'Apr 26', value: 45 },
    { label: 'Apr 27', value: 80 },
    { label: 'Apr 28', value: 110 },
    { label: 'Apr 29', value: 140 },
    { label: 'Apr 30', value: 165 },
  ];

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const avatarInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const avatarColors = ['bg-red-400', 'bg-purple-400', 'bg-blue-400', 'bg-pink-400', 'bg-emerald-400', 'bg-orange-400'];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {userName || 'Sachin'}! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition-all shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          Apr 1, 2025 – Apr 30, 2025
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Active Conversations"
          value={stats.activeConversations || 124}
          change="12%"
          up
          icon={MessageSquare}
          iconBg="bg-green-100"
          iconColor="text-green-500"
          sparkColor="#22c55e"
        />
        <StatCard
          label="AI Resolution Rate"
          value={`${stats.aiResolutionRate || 68}%`}
          change="8%"
          up
          icon={Bot}
          iconBg="bg-purple-100"
          iconColor="text-purple-500"
          sparkColor="#a855f7"
        />
        <StatCard
          label="New Leads"
          value={stats.newLeads || 42}
          change="15%"
          up
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-500"
          sparkColor="#4F6EF7"
        />
        <StatCard
          label="Messages Today"
          value={(stats.messagesToday || 1284).toLocaleString()}
          change="20%"
          up
          icon={Send}
          iconBg="bg-orange-100"
          iconColor="text-orange-500"
          sparkColor="#f97316"
          badge="AI"
        />
      </div>

      {/* Charts + Right Panel */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Charts column */}
        <div className="col-span-2 space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Conversation Activity</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Total conversations over the last 7 days</p>
                </div>
                <button className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium">
                  Last 7 days <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              {/* Y axis labels */}
              <div className="flex gap-2 mt-3">
                <div className="flex flex-col justify-between text-[10px] text-gray-300 h-32 text-right pr-1" style={{ paddingTop: 4, paddingBottom: 20 }}>
                  {[200, 150, 100, 50, 0].map(v => <span key={v}>{v}</span>)}
                </div>
                <div className="flex-1">
                  <BarChart data={barData} />
                </div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <h2 className="text-sm font-bold text-gray-800">AI vs Human Handling</h2>
              </div>
              <DonutChart
                aiPct={68}
                humanPct={24}
                unassignedPct={8}
                total={stats.messagesToday || 1284}
              />
            </div>
          </div>

          {/* Recent Conversations Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Recent Conversations</h2>
                  <p className="text-[11px] text-gray-400">Your latest customer conversations</p>
                </div>
              </div>
              <Link href="/inbox" className="text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors">
                View all
              </Link>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
              <div className="col-span-3">Customer</div>
              <div className="col-span-4">Last Message</div>
              <div className="col-span-2">Assigned To</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Time</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Rows */}
            {loading ? (
              <div className="py-10 flex items-center justify-center text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-400" />
                Loading...
              </div>
            ) : (
              recent.map((conv: any, i: number) => (
                <Link
                  key={conv.id}
                  href="/inbox"
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-gray-50 hover:bg-blue-50/40 transition-all items-center last:border-0"
                >
                  {/* Customer */}
                  <div className="col-span-3 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                      {avatarInitials(conv.profile_name || 'U')}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 truncate">{conv.profile_name || conv.phone_number}</span>
                  </div>
                  {/* Last message */}
                  <div className="col-span-4 text-xs text-gray-500 truncate">{conv.last_message_preview}</div>
                  {/* Assigned */}
                  <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-600">
                    {conv.assigned_to === 'AI Agent' ? (
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-purple-500" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                        {(conv.assigned_to || 'U')[0]}
                      </div>
                    )}
                    <span className="truncate">{conv.assigned_to || 'Unassigned'}</span>
                  </div>
                  {/* Status */}
                  <div className="col-span-1">
                    <StatusPill status={conv.status || 'open'} />
                  </div>
                  {/* Time */}
                  <div className="col-span-1 text-xs text-gray-400 text-right">{timeAgo(conv.last_message_at)}</div>
                  {/* Menu */}
                  <div className="col-span-1 flex justify-end">
                    <button className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all" onClick={e => e.preventDefault()}>
                      <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: AI Insights + Quick Actions */}
        <div className="space-y-4">
          {/* AI Insights */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-yellow-100 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                </div>
                <h2 className="text-sm font-bold text-gray-800">Wazzi AI Insights</h2>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600">AI</span>
            </div>

            {/* Main insight */}
            <div className="bg-blue-50 rounded-xl p-3 mb-3">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 leading-snug">Pricing-related questions increased by 32% this week.</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">More customers are asking about course pricing and payment options.</p>
                </div>
              </div>
              <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all">
                Create Pricing Automation
              </button>
            </div>

            {/* More insights */}
            <div className="space-y-3">
              {[
                {
                  icon: Clock,
                  bg: 'bg-gray-100',
                  color: 'text-gray-500',
                  label: 'Best time for engagement',
                  value: '10:00 AM – 12:00 PM',
                  sub: 'Most customers respond during this time.',
                },
                {
                  icon: MessageSquare,
                  bg: 'bg-blue-100',
                  color: 'text-blue-500',
                  label: 'Top conversation category',
                  value: 'Course Information',
                  sub: '42% of all conversations',
                },
                {
                  icon: Trophy,
                  bg: 'bg-yellow-100',
                  color: 'text-yellow-500',
                  label: 'High-value opportunities',
                  value: '12 hot leads this week',
                  sub: 'Estimated revenue: ₹2,40,000',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">{item.label}</p>
                    <p className="text-xs font-bold text-gray-800">{item.value}</p>
                    <p className="text-[11px] text-gray-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h2 className="text-sm font-bold text-gray-800">Quick Actions</h2>
            </div>
            <div className="space-y-1.5">
              {[
                { icon: Plus, iconBg: 'bg-green-100', iconColor: 'text-green-500', label: 'Connect WhatsApp Number', sub: 'Add another WhatsApp number', href: '/settings' },
                { icon: Bot, iconBg: 'bg-purple-100', iconColor: 'text-purple-500', label: 'Create AI Agent', sub: 'Set up an AI assistant', href: '/ai-agents' },
                { icon: Brain, iconBg: 'bg-blue-100', iconColor: 'text-blue-500', label: 'Upload Knowledge Base', sub: 'Give AI your business information', href: '/knowledge-base' },
                { icon: Megaphone, iconBg: 'bg-orange-100', iconColor: 'text-orange-500', label: 'Create Campaign', sub: 'Send WhatsApp broadcasts', href: '/campaigns' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all group"
                >
                  <div className={`w-8 h-8 rounded-lg ${action.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <action.icon className={`w-4 h-4 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{action.label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{action.sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
