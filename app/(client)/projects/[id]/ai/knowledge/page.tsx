'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Brain,
  Plus,
  Search,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Archive,
  Edit2,
  Bot,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  embeddingModel: string;
  sourceCount: number;
  readyCount: number;
  processingCount: number;
  connectedAgentCount: number;
  updatedAt: string;
}

export default function ProjectKnowledgeBaseListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingKb, setEditingKb] = useState<{ id: string; name: string; description: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [archiveModal, setArchiveModal] = useState<{ id: string; name: string } | null>(null);
  const [archiving, setArchiving] = useState(false);

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge`);
      const json = await res.json();

      if (!res.ok || json.status !== 'ok') {
        setError(json.error || 'Failed to load knowledge bases');
        return;
      }

      setKnowledgeBases(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const handleSaveRename = async () => {
    if (!editingKb) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${editingKb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingKb.name,
          description: editingKb.description,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        alert(json.error || 'Failed to rename knowledge base');
        return;
      }
      setEditingKb(null);
      fetchKnowledgeBases();
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveModal) return;
    try {
      setArchiving(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${archiveModal.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        alert(json.error || 'Failed to archive knowledge base');
        return;
      }
      setArchiveModal(null);
      fetchKnowledgeBases();
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setArchiving(false);
    }
  };

  const filteredKbs = knowledgeBases.filter((kb) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return kb.name.toLowerCase().includes(q) || kb.description.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/projects/${projectId}`}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Project Dashboard
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-semibold text-emerald-600">AI Knowledge Bases</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <Brain className="w-7 h-7 text-emerald-600" />
                Knowledge Bases & RAG
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Equip your AI Agents with verified domain knowledge from documents, FAQs, and web pages.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${projectId}/ai/agents`}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition"
              >
                <Bot className="w-4 h-4 text-slate-500" /> Manage AI Agents
              </Link>
              <Link
                href={`/projects/${projectId}/ai/knowledge/new`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Create Knowledge Base
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search knowledge bases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
          <span className="text-xs font-medium text-slate-500">
            {filteredKbs.length} {filteredKbs.length === 1 ? 'Knowledge Base' : 'Knowledge Bases'}
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Error loading knowledge bases</h4>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <div className="h-5 bg-slate-200 rounded w-1/4" />
                  <div className="h-5 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredKbs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">No Knowledge Bases Found</h3>
            <p className="text-xs text-slate-600 mb-6 max-w-md mx-auto">
              Knowledge bases give your AI agents trusted business information. Upload PDFs, FAQs, DOCX, and website links to ground answers.
            </p>
            <Link
              href={`/projects/${projectId}/ai/knowledge/new`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Create Knowledge Base
            </Link>
          </div>
        )}

        {/* Knowledge Base Cards Grid */}
        {!loading && !error && filteredKbs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKbs.map((kb) => (
              <div
                key={kb.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div className="p-6">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <Brain className="w-5 h-5" />
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        kb.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {kb.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <Link
                    href={`/projects/${projectId}/ai/knowledge/${kb.id}`}
                    className="block group"
                  >
                    <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition line-clamp-1">
                      {kb.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 min-h-[32px]">
                    {kb.description || 'No description provided.'}
                  </p>

                  {/* Metrics Badges */}
                  <div className="mt-5 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="block text-xs font-black text-slate-900">{kb.sourceCount}</span>
                      <span className="text-[10px] font-semibold text-slate-500">Sources</span>
                    </div>
                    <div>
                      <span className="block text-xs font-black text-emerald-600">{kb.readyCount}</span>
                      <span className="text-[10px] font-semibold text-slate-500">Ready</span>
                    </div>
                    <div>
                      <span className="block text-xs font-black text-indigo-600">{kb.connectedAgentCount}</span>
                      <span className="text-[10px] font-semibold text-slate-500">Agents</span>
                    </div>
                  </div>

                  {/* Processing banner if any are processing */}
                  {kb.processingCount > 0 && (
                    <div className="mt-3 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1.5 text-[11px] font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                      <span>{kb.processingCount} source(s) processing...</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingKb({ id: kb.id, name: kb.name, description: kb.description })}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setArchiveModal({ id: kb.id, name: kb.name })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/projects/${projectId}/ai/knowledge/${kb.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
                  >
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {editingKb && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Edit Knowledge Base</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingKb.name}
                  onChange={(e) => setEditingKb({ ...editingKb, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingKb.description}
                  onChange={(e) => setEditingKb({ ...editingKb, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingKb(null)}
                disabled={savingEdit}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                disabled={savingEdit || !editingKb.name.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
              >
                {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {archiveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Archive Knowledge Base</h3>
            <p className="text-xs text-slate-600 mb-6">
              Are you sure you want to archive <strong className="text-slate-900">{archiveModal.name}</strong>? AI Agents using this knowledge base will no longer retrieve its documents for grounding answers.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setArchiveModal(null)}
                disabled={archiving}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
              >
                {archiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Archive Knowledge Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
