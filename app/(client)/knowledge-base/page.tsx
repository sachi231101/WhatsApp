'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  FileText,
  Globe,
  HelpCircle,
  FileCheck,
  AlignLeft,
  BookOpen,
  Upload,
  Link2,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Layers,
  Zap,
  Bot,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type SourceType = 'PDF' | 'Website' | 'FAQ' | 'DOCX' | 'Manual' | 'TXT';
type SourceStatus = 'Ready' | 'Processing' | 'Failed';

interface KBSource {
  id: string;
  name: string;
  description: string;
  type: SourceType;
  status: SourceStatus;
  documents: number;
  usedBy: number; // avatars count
  lastUpdated: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const SOURCES: KBSource[] = [
  { id: 'src-1', name: 'Course Catalog 2025', description: 'Complete course information and pricing', type: 'PDF', status: 'Ready', documents: 12, usedBy: 3, lastUpdated: '2 days ago' },
  { id: 'src-2', name: 'Website Content', description: 'https://abcacademy.com', type: 'Website', status: 'Ready', documents: 8, usedBy: 2, lastUpdated: '1 week ago' },
  { id: 'src-3', name: 'Admissions FAQ', description: 'Common questions from students', type: 'FAQ', status: 'Ready', documents: 15, usedBy: 3, lastUpdated: '3 days ago' },
  { id: 'src-4', name: 'Fees Structure', description: 'Detailed fee structure for all courses', type: 'DOCX', status: 'Processing', documents: 4, usedBy: 1, lastUpdated: '2 hours ago' },
  { id: 'src-5', name: 'Placement Information', description: 'Career and placement details', type: 'Manual', status: 'Ready', documents: 6, usedBy: 2, lastUpdated: '5 days ago' },
  { id: 'src-6', name: 'Scholarship Policy', description: 'https://abcacademy.com/scholarship', type: 'Website', status: 'Ready', documents: 3, usedBy: 2, lastUpdated: '1 week ago' },
  { id: 'src-7', name: 'Student Handbook', description: 'Rules, guidelines and policies', type: 'PDF', status: 'Ready', documents: 9, usedBy: 2, lastUpdated: '2 weeks ago' },
  { id: 'src-8', name: 'Technical Support', description: 'Common technical issues and solutions', type: 'FAQ', status: 'Failed', documents: 0, usedBy: 1, lastUpdated: '1 day ago' },
  { id: 'src-9', name: 'Demo Class Script', description: 'Script for demo class conversations', type: 'Manual', status: 'Ready', documents: 4, usedBy: 2, lastUpdated: '4 days ago' },
  { id: 'src-10', name: 'Competitor Information', description: 'Information about competitors', type: 'DOCX', status: 'Ready', documents: 2, usedBy: 1, lastUpdated: '1 week ago' },
];

const CONNECTED_AGENTS = [
  { name: 'Sales Assistant', sources: 5, color: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { name: 'Customer Support Agent', sources: 4, color: 'bg-blue-100', iconColor: 'text-blue-600' },
  { name: 'Admissions Agent', sources: 6, color: 'bg-pink-100', iconColor: 'text-pink-600' },
];

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: SourceType }) {
  const map: Record<SourceType, { bg: string; text: string }> = {
    PDF: { bg: 'bg-red-50 text-red-600', text: 'PDF' },
    Website: { bg: 'bg-blue-50 text-blue-600', text: 'Website' },
    FAQ: { bg: 'bg-amber-50 text-amber-600', text: 'FAQ' },
    DOCX: { bg: 'bg-indigo-50 text-indigo-600', text: 'DOCX' },
    Manual: { bg: 'bg-teal-50 text-teal-700', text: 'Manual' },
    TXT: { bg: 'bg-gray-100 text-gray-600', text: 'TXT' },
  };
  const s = map[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${s.bg}`}>
      {s.text}
    </span>
  );
}

function StatusBadge({ status }: { status: SourceStatus }) {
  if (status === 'Ready')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Ready
      </span>
    );
  if (status === 'Processing')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
        Processing
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      Failed
    </span>
  );
}

function SourceIcon({ type }: { type: SourceType }) {
  const cls = 'w-4 h-4';
  if (type === 'PDF') return <FileText className={`${cls} text-red-500`} />;
  if (type === 'Website') return <Globe className={`${cls} text-blue-500`} />;
  if (type === 'FAQ') return <HelpCircle className={`${cls} text-amber-500`} />;
  if (type === 'DOCX') return <FileCheck className={`${cls} text-indigo-500`} />;
  if (type === 'Manual') return <AlignLeft className={`${cls} text-teal-500`} />;
  return <BookOpen className={`${cls} text-gray-400`} />;
}

function MiniAvatars({ count }: { count: number }) {
  const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-pink-400'];
  const show = Math.min(count, 3);
  return (
    <div className="flex -space-x-1.5">
      {Array.from({ length: show }).map((_, i) => (
        <div key={i} className={`w-6 h-6 rounded-full border-2 border-white ${colors[i]} flex items-center justify-center text-[9px] text-white font-bold`}>
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {count > 3 && (
        <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] text-gray-600 font-bold">
          +{count - 3}
        </div>
      )}
    </div>
  );
}

// ─── Donut Chart (CSS only) ────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="56" cy="56" r={r}
          fill="none"
          stroke="url(#grad)"
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{pct}%</span>
        <span className="text-[9px] text-gray-400 font-medium">Usage Rate</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'documents' | 'processing' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'upload' | 'website' | 'faq' | 'manual' | null>(null);

  // Filter
  const filtered = SOURCES.filter((s) => {
    if (activeTab === 'documents') return s.status === 'Ready';
    if (activeTab === 'processing') return s.status === 'Processing';
    if (activeTab === 'failed') return s.status === 'Failed';
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
    }
    return true;
  }).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((s) => s.id)));
  };

  const readyCount = SOURCES.filter((s) => s.status === 'Ready').length;
  const processingCount = SOURCES.filter((s) => s.status === 'Processing').length;
  const totalDocs = SOURCES.reduce((a, s) => a + s.documents, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
      <div className="flex h-full">
        {/* ── Left/Main Panel ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Page Header */}
          <div className="px-8 pt-7 pb-5 flex items-start justify-between gap-4 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Give your AI agents the knowledge they need to answer customers accurately.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                View Documentation
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Knowledge
              </button>
            </div>
          </div>

          {/* ── 4 Stat Cards ─────────────────────────────────────────────────── */}
          <div className="px-8 pb-6 grid grid-cols-4 gap-4 flex-shrink-0">
            {/* Total Sources */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Total Sources</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">↑ 3 new this month</p>
            </div>

            {/* Total Documents */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Total Documents</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">48</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">↑ 12 processed</p>
            </div>

            {/* Ready to Use */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Ready to Use</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">44</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">↑ 92% success rate</p>
            </div>

            {/* Processing */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Processing</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">2</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">↓ 1 in queue</p>
            </div>
          </div>

          {/* ── Tabs + Search + Table ─────────────────────────────────────────── */}
          <div className="px-8 flex-1 flex flex-col min-h-0">
            {/* Tabs + search row */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 mb-0 pb-0">
              {/* Tabs */}
              <div className="flex items-center gap-6 text-xs font-semibold">
                {[
                  { key: 'all', label: `All Sources (${SOURCES.length})` },
                  { key: 'documents', label: `Documents (${totalDocs})` },
                  { key: 'processing', label: `Processing (${processingCount})` },
                  { key: 'failed', label: `Failed (${SOURCES.filter((s) => s.status === 'Failed').length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key as any); setCurrentPage(1); }}
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

              {/* Search + Filter */}
              <div className="flex items-center gap-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search sources..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-44 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-400"
                  />
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#f8fafc] z-10">
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-3 w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    {['Source Name', 'Type', 'Status', 'Documents', 'Used By', 'Last Updated', 'Actions'].map((h) => (
                      <th key={h} className="py-3 pr-4 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {h === 'Source Name' ? (
                          <span className="flex items-center gap-1">
                            {h} <span className="text-gray-300">↕</span>
                          </span>
                        ) : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {paginated.map((src) => (
                    <tr key={src.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Checkbox */}
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={selected.has(src.id)}
                          onChange={() => toggleSelect(src.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      {/* Source Name */}
                      <td className="py-3 pr-4 max-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                            <SourceIcon type={src.type} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{src.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{src.description}</p>
                          </div>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="py-3 pr-4">
                        <TypeBadge type={src.type} />
                      </td>
                      {/* Status */}
                      <td className="py-3 pr-4">
                        <StatusBadge status={src.status} />
                      </td>
                      {/* Documents */}
                      <td className="py-3 pr-4 text-gray-700 font-medium">{src.documents}</td>
                      {/* Used By */}
                      <td className="py-3 pr-4">
                        <MiniAvatars count={src.usedBy} />
                      </td>
                      {/* Last Updated */}
                      <td className="py-3 pr-4 text-gray-500">{src.lastUpdated}</td>
                      {/* Actions */}
                      <td className="py-3">
                        <button className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-4 border-t border-gray-100 flex-shrink-0 bg-[#f8fafc]">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} sources
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      currentPage === i + 1
                        ? 'bg-[#1b59f8] text-white shadow-sm shadow-blue-500/25'
                        : 'border border-gray-200 text-gray-600 hover:bg-white'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar Panel ──────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto px-5 py-6 space-y-6">
          {/* Knowledge Usage */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Knowledge Usage</p>
              <button className="flex items-center gap-1 text-[10px] text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50">
                Last 30 days <ChevronLeft className="w-3 h-3 rotate-180" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <DonutChart pct={68} />
              <div className="space-y-2 flex-1">
                {[
                  { label: 'AI Responses', value: '1,248' },
                  { label: 'Sources Used', value: '8' },
                  { label: 'Avg. Chunks', value: '4.2' },
                  { label: 'Success Rate', value: '96%' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{stat.label}</span>
                    <span className="text-[10px] font-bold text-gray-800">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Connected AI Agents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Connected AI Agents</p>
              <button className="text-[10px] text-[#1b59f8] font-semibold hover:underline">View all</button>
            </div>
            <div className="space-y-2.5">
              {CONNECTED_AGENTS.map((agent) => (
                <div key={agent.name} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${agent.color} flex items-center justify-center flex-shrink-0`}>
                    <Bot className={`w-4 h-4 ${agent.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{agent.name}</p>
                    <p className="text-[10px] text-gray-400">{agent.sources} sources</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Add Knowledge Source */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-3">Add Knowledge Source</p>
            <div className="space-y-2">
              {[
                { icon: Upload, label: 'Upload Document', sub: 'PDF, DOCX, TXT (Max 50MB)', color: 'bg-blue-50 text-blue-600', type: 'upload' as const },
                { icon: Link2, label: 'Add Website', sub: 'Extract content from a URL', color: 'bg-pink-50 text-pink-600', type: 'website' as const },
                { icon: HelpCircle, label: 'Create FAQ', sub: 'Add question and answer pairs', color: 'bg-amber-50 text-amber-600', type: 'faq' as const },
                { icon: AlignLeft, label: 'Add Manual Content', sub: 'Write or paste content directly', color: 'bg-teal-50 text-teal-600', type: 'manual' as const },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => { setAddType(item.type); setShowAddModal(true); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                  >
                    <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
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

          {/* Info banner */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-bold text-indigo-900">Your AI is only as smart as the knowledge you provide.</p>
            </div>
            <p className="text-[10px] text-indigo-600/80 leading-relaxed">
              Add high-quality, accurate information to get better responses from your AI agents.
            </p>
          </div>
        </div>
      </div>

      {/* ── Add Knowledge Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Add Knowledge Source</h3>
                <p className="text-[11px] text-gray-400">Upload or connect a new data source</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setAddType(null); }}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Source type tabs */}
              {!addType && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Upload, label: 'Upload Document', type: 'upload' as const, color: 'bg-blue-50 text-blue-600' },
                    { icon: Link2, label: 'Add Website', type: 'website' as const, color: 'bg-pink-50 text-pink-600' },
                    { icon: HelpCircle, label: 'Create FAQ', type: 'faq' as const, color: 'bg-amber-50 text-amber-600' },
                    { icon: AlignLeft, label: 'Manual Content', type: 'manual' as const, color: 'bg-teal-50 text-teal-600' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setAddType(item.type)}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#1b59f8] hover:bg-blue-50/40 transition-all"
                      >
                        <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {addType === 'upload' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source Name *</label>
                    <input type="text" placeholder="e.g. Course Catalog 2025" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-all cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-600">Drop your file here or click to browse</p>
                    <p className="text-[10px] text-gray-400 mt-1">PDF, DOCX, TXT — Max 50MB</p>
                  </div>
                </>
              )}

              {addType === 'website' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Website URL *</label>
                    <input type="url" placeholder="https://example.com" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source Name</label>
                    <input type="text" placeholder="e.g. Company Website" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                </>
              )}

              {addType === 'faq' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">FAQ Title *</label>
                    <input type="text" placeholder="e.g. Admissions FAQ" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Q&A Content *</label>
                    <textarea rows={5} placeholder="Q: What is the fee?&#10;A: The fee is ₹24,000..." className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                  </div>
                </>
              )}

              {addType === 'manual' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title *</label>
                    <input type="text" placeholder="e.g. Placement Information" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Content *</label>
                    <textarea rows={5} placeholder="Paste or write your content here..." className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                  </div>
                </>
              )}

              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => addType ? setAddType(null) : setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  {addType ? 'Back' : 'Cancel'}
                </button>
                {addType && (
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setAddType(null); }}
                    className="px-4 py-2 rounded-xl bg-[#1b59f8] text-white text-xs font-semibold hover:bg-blue-700"
                  >
                    Add Source
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
