'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Users,
  FileText,
  Calendar,
  BarChart2,
  Zap,
  ChevronDown,
  Bell,
  FlaskConical,
  Tag,
  Sparkles,
  BookOpen,
  CreditCard,
  Award,
  Megaphone,
  RotateCcw,
  ArrowUpRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CampaignType = 'Promotional' | 'Transactional' | 'Reminder' | 'Follow Up';
type CampaignStatus = 'Completed' | 'Running' | 'Scheduled' | 'Draft' | 'Paused';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  recipients: number;
  delivered: number;
  deliveredPct: number;
  read: number;
  readPct: number;
  replied: number;
  repliedPct: number;
  status: CampaignStatus;
  scheduledAt: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1', name: 'Data Science Course Launch', description: 'New batch enrollment',
    type: 'Promotional', recipients: 2845, delivered: 2790, deliveredPct: 98,
    read: 1985, readPct: 71, replied: 642, repliedPct: 23,
    status: 'Completed', scheduledAt: '12 Jan 2025\n10:00 AM',
  },
  {
    id: 'c2', name: 'Course Completion Certificate', description: 'Send certificates to students',
    type: 'Transactional', recipients: 1204, delivered: 1198, deliveredPct: 99,
    read: 842, readPct: 70, replied: 210, repliedPct: 17,
    status: 'Completed', scheduledAt: '10 Jan 2025\n02:00 PM',
  },
  {
    id: 'c3', name: 'Upcoming Webinar Reminder', description: 'AI in Education',
    type: 'Reminder', recipients: 3560, delivered: 3512, deliveredPct: 99,
    read: 2401, readPct: 68, replied: 890, repliedPct: 25,
    status: 'Completed', scheduledAt: '08 Jan 2025\n11:00 AM',
  },
  {
    id: 'c4', name: 'New Year Special Offer', description: 'Flat 30% off on all courses',
    type: 'Promotional', recipients: 5120, delivered: 4998, deliveredPct: 98,
    read: 3210, readPct: 64, replied: 1032, repliedPct: 21,
    status: 'Completed', scheduledAt: '05 Jan 2025\n09:00 AM',
  },
  {
    id: 'c5', name: 'Follow-up with Interested Leads', description: 'Nurture campaign',
    type: 'Follow Up', recipients: 892, delivered: 864, deliveredPct: 97,
    read: 521, readPct: 60, replied: 198, repliedPct: 23,
    status: 'Running', scheduledAt: 'In Progress',
  },
  {
    id: 'c6', name: 'Demo Class Invitation', description: 'For new signups',
    type: 'Promotional', recipients: 1425, delivered: 1390, deliveredPct: 98,
    read: 980, readPct: 69, replied: 321, repliedPct: 23,
    status: 'Scheduled', scheduledAt: '15 Jan 2025\n04:00 PM',
  },
  {
    id: 'c7', name: 'Payment Reminder', description: 'Fee due reminder',
    type: 'Transactional', recipients: 654, delivered: 642, deliveredPct: 98,
    read: 410, readPct: 64, replied: 96, repliedPct: 15,
    status: 'Draft', scheduledAt: '—',
  },
  {
    id: 'c8', name: 'Re-engagement Campaign', description: 'We miss you!',
    type: 'Promotional', recipients: 2320, delivered: 2210, deliveredPct: 95,
    read: 1102, readPct: 47, replied: 340, repliedPct: 15,
    status: 'Paused', scheduledAt: '—',
  },
];

const TEMPLATES = [
  { id: 't1', name: 'course_invitation', desc: 'Start your learning journey...', icon: BookOpen, iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
  { id: 't2', name: 'payment_reminder', desc: 'Your fee is due...', icon: CreditCard, iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
  { id: 't3', name: 'certificate_ready', desc: 'Your certificate is ready...', icon: Award, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50' },
  { id: 't4', name: 'webinar_reminder', desc: "Don't miss our webinar...", icon: Bell, iconColor: 'text-purple-500', iconBg: 'bg-purple-50' },
];

const CAMPAIGN_TIPS = [
  'Use personalized variables (e.g. {{name}})',
  'Send at the right time (10 AM – 6 PM)',
  'Keep messages short and clear',
  'Use rich media (images, PDFs)',
  'Track and optimize based on results',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: CampaignType }) {
  const map: Record<CampaignType, string> = {
    Promotional: 'bg-blue-50 text-blue-600',
    Transactional: 'bg-emerald-50 text-emerald-700',
    Reminder: 'bg-amber-50 text-amber-600',
    'Follow Up': 'bg-purple-50 text-purple-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${map[type]}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const map: Record<CampaignStatus, { cls: string; dot: string }> = {
    Completed: { cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
    Running: { cls: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
    Scheduled: { cls: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-400' },
    Draft: { cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
    Paused: { cls: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'Running' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

function CampaignIcon({ type }: { type: CampaignType }) {
  const map: Record<CampaignType, { icon: React.ElementType; bg: string; color: string }> = {
    Promotional: { icon: Megaphone, bg: 'bg-blue-50', color: 'text-blue-500' },
    Transactional: { icon: CreditCard, bg: 'bg-emerald-50', color: 'text-emerald-500' },
    Reminder: { icon: Bell, bg: 'bg-amber-50', color: 'text-amber-500' },
    'Follow Up': { icon: RotateCcw, bg: 'bg-purple-50', color: 'text-purple-500' },
  };
  const s = map[type];
  const Icon = s.icon;
  return (
    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-4 h-4 ${s.color}`} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'templates' | 'scheduled' | 'drafts' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [dateFilter, setDateFilter] = useState('Last 30 days');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const filtered = CAMPAIGNS.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All Status' || c.status === statusFilter;
    const matchType = typeFilter === 'All Types' || c.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      <div className="flex h-full">
        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Page Header */}
          <div className="px-8 pt-7 pb-4 flex items-start justify-between gap-4 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Send personalized WhatsApp messages at scale and track results.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 mt-1">
              <button
                onClick={() => router.push('/campaigns/create?step=2')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                Message Templates
              </button>
              <button
                onClick={() => router.push('/campaigns/create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Campaign
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 flex-shrink-0">
            <div className="flex items-center gap-6 text-xs font-semibold border-b border-gray-200">
              {[
                { key: 'all', label: 'All Campaigns' },
                { key: 'templates', label: 'Message Templates' },
                { key: 'scheduled', label: 'Scheduled' },
                { key: 'drafts', label: 'Drafts' },
                { key: 'archived', label: 'Archived' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`pb-3 relative transition-all ${
                    activeTab === tab.key ? 'text-[#1b59f8]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b59f8] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── 4 Stat Cards ───────────────────────────────────────────────── */}
          <div className="px-8 py-5 grid grid-cols-4 gap-4 flex-shrink-0">
            {[
              {
                label: 'Total Campaigns', value: '28', trend: '↑ 5 this month',
                trendColor: 'text-emerald-600', icon: Megaphone, bg: 'bg-blue-50', iconColor: 'text-blue-500',
              },
              {
                label: 'Total Recipients', value: '12,486', trend: '↑ 32% vs last month',
                trendColor: 'text-emerald-600', icon: Users, bg: 'bg-purple-50', iconColor: 'text-purple-500',
              },
              {
                label: 'Delivery Rate', value: '98%', trend: '↑ 2% vs last month',
                trendColor: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50', iconColor: 'text-emerald-500',
              },
              {
                label: 'Response Rate', value: '24%', trend: '↑ 6% vs last month',
                trendColor: 'text-emerald-600', icon: BarChart2, bg: 'bg-amber-50', iconColor: 'text-amber-500',
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${s.iconColor}`} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className={`text-[11px] font-semibold mt-1 ${s.trendColor}`}>{s.trend}</p>
                </div>
              );
            })}
          </div>

          {/* ── Filters Row ─────────────────────────────────────────────────── */}
          <div className="px-8 pb-3 flex items-center gap-3 flex-shrink-0">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-400"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-gray-700 font-medium"
              >
                {['All Status', 'Completed', 'Running', 'Scheduled', 'Draft', 'Paused'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-gray-700 font-medium"
              >
                {['All Types', 'Promotional', 'Transactional', 'Reminder', 'Follow Up'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Date filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none pl-7 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-gray-700 font-medium"
              >
                {['Last 30 days', 'Last 7 days', 'Last 90 days', 'All time'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter button */}
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>

          {/* ── Table ───────────────────────────────────────────────────────── */}
          <div className="px-8 flex-1 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="py-3 pl-4 pr-2 w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    {['Campaign Name', 'Type', 'Recipients', 'Delivered', 'Read', 'Replied', 'Status', 'Scheduled At', 'Actions'].map((h) => (
                      <th key={h} className="py-3 pr-4 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/20 transition-colors group">
                      {/* Checkbox */}
                      <td className="py-3 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-gray-300"
                        />
                      </td>

                      {/* Campaign Name */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <CampaignIcon type={c.type} />
                          <div>
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            <p className="text-[10px] text-gray-400">{c.description}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 pr-4"><TypeBadge type={c.type} /></td>

                      {/* Recipients */}
                      <td className="py-3 pr-4 text-gray-700 font-medium">
                        {c.recipients.toLocaleString()}
                      </td>

                      {/* Delivered */}
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-800">{c.delivered.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">({c.deliveredPct}%)</p>
                      </td>

                      {/* Read */}
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-800">{c.read.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">({c.readPct}%)</p>
                      </td>

                      {/* Replied */}
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-800">{c.replied.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">({c.repliedPct}%)</p>
                      </td>

                      {/* Status */}
                      <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>

                      {/* Scheduled At */}
                      <td className="py-3 pr-4">
                        {c.scheduledAt === '—' || c.scheduledAt === 'In Progress' ? (
                          <span className="text-gray-400">{c.scheduledAt}</span>
                        ) : (
                          <div>
                            {c.scheduledAt.split('\n').map((line, i) => (
                              <p key={i} className={i === 0 ? 'text-gray-700 font-medium' : 'text-[10px] text-gray-400'}>
                                {line}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3">
                        <button
                          onClick={() => showToast(`Options for ${c.name}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Bottom AI Banner ─────────────────────────────────────────────── */}
          <div className="px-8 py-4 flex-shrink-0">
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-4.5 h-4.5 text-indigo-600" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Get better results with AI</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Let AI suggest the best time, audience, and message for your campaigns.
                  </p>
                </div>
              </div>
              <button
                onClick={() => showToast('Opening AI Campaign Generator...')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate with AI
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto px-5 py-6 space-y-6">
          {/* Create New Campaign */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-3">Create New Campaign</p>
            <div className="space-y-2">
              {[
                { icon: FileText, label: 'Start from Template', sub: 'Use a pre-approved template', bg: 'bg-blue-50', color: 'text-blue-600' },
                { icon: Users, label: 'Send to Contact List', sub: 'Choose contacts or segments', bg: 'bg-purple-50', color: 'text-purple-600' },
                { icon: Calendar, label: 'Schedule Campaign', sub: 'Set date and time', bg: 'bg-pink-50', color: 'text-pink-600' },
                { icon: FlaskConical, label: 'A/B Test Campaign', sub: 'Test different messages', bg: 'bg-amber-50', color: 'text-amber-600' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.label === 'Start from Template') {
                        router.push('/campaigns/create');
                      } else {
                        showToast(item.label);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                  >
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-[#1b59f8] transition-colors">{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Approved Templates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Approved Templates</p>
              <button
                onClick={() => router.push('/campaigns/create?step=2')}
                className="text-[10px] text-[#1b59f8] font-semibold hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>
            <div className="space-y-2.5">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => router.push('/campaigns/create?step=2')}
                    className="w-full flex items-center gap-2.5 text-left p-1.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-xl ${t.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${t.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{t.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      Approved
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Campaign Tips */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">Campaign Tips</p>
            </div>
            <ul className="space-y-2">
              {CAMPAIGN_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-[11px] text-gray-600 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
