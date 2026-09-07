'use client';

import { useState } from 'react';
import {
  Brain,
  Search,
  Plus,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  category: 'FAQ' | 'Pricing' | 'Policy' | 'Technical';
  contentSnippet: string;
  tokenCount: number;
  lastUpdated: string;
  status: 'indexed' | 'syncing';
}

const INITIAL_DOCS: KnowledgeDoc[] = [
  {
    id: 'kb-01',
    title: 'WazzApp AI Pricing & Subscription Tiers 2026',
    category: 'Pricing',
    contentSnippet: 'Starter: ₹2,999/mo (5 agents, 5,000 active contacts). Growth: ₹6,999/mo (15 agents, 25,000 contacts, auto-campaigns). Enterprise: Custom SLA, dedicated WhatsApp Tech Provider support.',
    tokenCount: 1420,
    lastUpdated: 'Today',
    status: 'indexed',
  },
  {
    id: 'kb-02',
    title: 'Customer Return & Refund Policy',
    category: 'Policy',
    contentSnippet: 'Orders can be cancelled or returned within 14 calendar days of delivery. Refunds are credited to the original payment source within 3-5 business days upon item receipt.',
    tokenCount: 890,
    lastUpdated: 'Yesterday',
    status: 'indexed',
  },
  {
    id: 'kb-03',
    title: 'Meta WhatsApp Business Cloud API & WebRTC Setup',
    category: 'Technical',
    contentSnippet: 'Technical requirements for two-way audio WebRTC calling on Meta Graph API v22.0. Requires SDP offer/answer exchange, HMAC-SHA256 signature verification, and Opus codec support.',
    tokenCount: 2350,
    lastUpdated: '2 days ago',
    status: 'indexed',
  },
  {
    id: 'kb-04',
    title: 'Frequently Asked Questions (FAQ)',
    category: 'FAQ',
    contentSnippet: 'Answers to general questions: How does 24h care window work? What happens when a template is rejected? How do we assign conversations to human agents?',
    tokenCount: 1780,
    lastUpdated: '3 days ago',
    status: 'indexed',
  },
];

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(INITIAL_DOCS);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'FAQ' | 'Pricing' | 'Policy' | 'Technical'>('FAQ');
  const [newContent, setNewContent] = useState('');

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newDoc: KnowledgeDoc = {
      id: 'kb-' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      contentSnippet: newContent.trim().slice(0, 180) + '...',
      tokenCount: Math.floor(newContent.length / 4),
      lastUpdated: 'Just now',
      status: 'indexed',
    };

    setDocs((prev) => [newDoc, ...prev]);
    setShowAddModal(false);
    setNewTitle('');
    setNewContent('');
  };

  const handleDelete = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const filtered = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.contentSnippet.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            Knowledge Base & RAG Index
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Train your AI agents with company documentation, pricing tables, and FAQs for accurate responses.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center justify-between gap-4 bg-[#13151c] p-3 rounded-2xl border border-white/[0.06]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/30" />
          <input
            type="text"
            placeholder="Search knowledge documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> All embeddings synced
          </span>
          <span>•</span>
          <span>{docs.length} active documents</span>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {doc.category}
                </span>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Indexed
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1 text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white mb-2">{doc.title}</h3>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-3 mb-4">{doc.contentSnippet}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-white/35">
              <span>{doc.tokenCount.toLocaleString()} tokens</span>
              <span>Updated {doc.lastUpdated}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141620] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Knowledge Document</h3>
            <p className="text-xs text-white/40 mb-5">
              Upload company guidelines, product specs, or FAQs to be indexed into the AI vector database.
            </p>

            <form onSubmit={handleAddDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Document Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise SLA & Support Terms"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs bg-[#1a1d27] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="FAQ">FAQ</option>
                  <option value="Pricing">Pricing & Plans</option>
                  <option value="Policy">Store Policies</option>
                  <option value="Technical">Technical Docs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Document Content *</label>
                <textarea
                  rows={6}
                  placeholder="Paste knowledge text, policy rules, or question/answer pairs..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-900/30 hover:opacity-90 transition-all cursor-pointer"
                >
                  Save & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
