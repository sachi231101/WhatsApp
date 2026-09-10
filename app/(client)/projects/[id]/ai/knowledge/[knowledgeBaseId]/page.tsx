'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Brain,
  Plus,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Bot,
  ExternalLink,
  UploadCloud,
  Globe,
  HelpCircle,
  AlignLeft,
  Sliders,
  Settings,
  Sparkles,
} from 'lucide-react';

interface SourceItem {
  id: string;
  type: string;
  name: string;
  sourceUrl?: string | null;
  mimeType?: string | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ARCHIVED';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
  characterCount: number;
  tokenCount: number;
  chunkCount: number;
}

interface KnowledgeBaseDetails {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  embeddingModel: string;
  sourceCount: number;
  readyCount: number;
  processingCount: number;
  failedCount: number;
  connectedAgents: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    role: string;
  }>;
}

export default function KnowledgeBaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const knowledgeBaseId = params.knowledgeBaseId as string;

  const [kb, setKb] = useState<KnowledgeBaseDetails | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'sources' | 'agents' | 'search' | 'settings'>('sources');

  // Add Source Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [sourceCategory, setSourceCategory] = useState<'upload' | 'url' | 'faq' | 'text'>('upload');
  const [submittingSource, setSubmittingSource] = useState(false);
  const [sourceFormError, setSourceFormError] = useState<string | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCustomName, setFileCustomName] = useState('');

  // URL Ingestion State
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');

  // FAQ State
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqName, setFaqName] = useState('');

  // Plain Text State
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  // Test Search State
  const [testQuery, setTestQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  // Settings State
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [kbRes, sourcesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`),
        fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`),
      ]);

      const kbJson = await kbRes.json();
      const sourcesJson = await sourcesRes.json();

      if (!kbRes.ok || kbJson.status !== 'ok') {
        setError(kbJson.error || 'Failed to load knowledge base');
        return;
      }

      setKb(kbJson.data);
      setSettingsName(kbJson.data.name);
      setSettingsDesc(kbJson.data.description);
      setSources(sourcesJson.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [projectId, knowledgeBaseId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Poll sources while any are processing or pending
  useEffect(() => {
    const hasProcessing = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');
    if (!hasProcessing) {
      return () => {};
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`);
        const json = await res.json();
        if (res.ok && json.status === 'ok') {
          setSources(json.data || []);
        }
      } catch {
        // ignore polling error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sources, projectId, knowledgeBaseId]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceFormError(null);
    setSubmittingSource(true);

    try {
      if (sourceCategory === 'upload') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', fileCustomName.trim() || selectedFile.name);
        const ext = selectedFile.name.split('.').pop()?.toUpperCase() || 'TXT';
        formData.append('type', ext);

        const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`, {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to upload source');
      } else if (sourceCategory === 'url') {
        if (!urlInput.trim()) throw new Error('Please enter a website URL');
        const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'URL',
            name: urlName.trim() || urlInput.trim(),
            sourceUrl: urlInput.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to add URL');
      } else if (sourceCategory === 'faq') {
        if (!faqQuestion.trim() || !faqAnswer.trim()) throw new Error('Question and Answer are required');
        const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'FAQ',
            name: faqName.trim() || `FAQ: ${faqQuestion.slice(0, 30)}...`,
            metadata: {
              faqs: [{ question: faqQuestion.trim(), answer: faqAnswer.trim() }],
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to add FAQ');
      } else if (sourceCategory === 'text') {
        if (!textContent.trim()) throw new Error('Please enter document content');
        const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TEXT',
            name: textTitle.trim() || 'Plain Text Document',
            rawText: textContent.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to add text source');
      }

      // Reset Form & Close Modal
      setSelectedFile(null);
      setFileCustomName('');
      setUrlInput('');
      setUrlName('');
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqName('');
      setTextTitle('');
      setTextContent('');
      setShowAddModal(false);
      fetchDetails();
    } catch (err: any) {
      setSourceFormError(err.message || 'Failed to submit source');
    } finally {
      setSubmittingSource(false);
    }
  };

  const handleReprocessSource = async (sourceId: string) => {
    try {
      setActionLoadingId(sourceId);
      const res = await fetch(
        `/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources/${sourceId}/reprocess`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        alert(json.error || 'Reprocess failed');
        return;
      }
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Reprocess failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSource = async (sourceId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Extracted chunks will be removed immediately.`)) {
      return;
    }
    try {
      setActionLoadingId(sourceId);
      const res = await fetch(
        `/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources/${sourceId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        alert(json.error || 'Delete failed');
        return;
      }
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    try {
      setSearchLoading(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim(), topK: 5 }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setSearchResults(json.data || []);
      } else {
        alert(json.error || 'Search failed');
      }
    } catch (err: any) {
      alert(err.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName.trim(), description: settingsDesc.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        alert(json.error || 'Failed to update');
        return;
      }
      alert('Knowledge base settings updated successfully');
      fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          Loading knowledge base...
        </div>
      </div>
    );
  }

  if (error || !kb) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">Knowledge Base Not Found</h3>
          <p className="text-xs text-slate-600 mb-6">{error || 'Access denied or knowledge base does not exist.'}</p>
          <Link
            href={`/projects/${projectId}/ai/knowledge`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Knowledge Bases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/projects/${projectId}/ai/knowledge`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Knowledge Bases
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">{kb.name}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900">{kb.name}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {kb.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                {kb.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add Source
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200 -mb-6">
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'sources'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" /> Sources & Documents ({sources.length})
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-4 h-4" /> Test Search
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'agents'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bot className="w-4 h-4" /> Connected AI Agents ({kb.connectedAgents.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* TAB 1: SOURCES & DOCUMENTS */}
        {activeTab === 'sources' && (
          <div>
            {sources.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">No Knowledge Sources Yet</h3>
                <p className="text-xs text-slate-600 mb-6 max-w-md mx-auto">
                  Add PDF files, DOCX manuals, FAQs, web URLs, or plain text to build domain knowledge for your AI agents.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Add First Source
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Name / Title</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Content Size</th>
                        <th className="py-3.5 px-4">Chunks</th>
                        <th className="py-3.5 px-4">Last Processed</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {sources.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-black text-[10px]">
                                {s.type}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block line-clamp-1">{s.name}</span>
                                {s.sourceUrl && (
                                  <a
                                    href={s.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 line-clamp-1 mt-0.5"
                                  >
                                    {s.sourceUrl} <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {s.type}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            {s.status === 'READY' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
                              </span>
                            )}
                            {(s.status === 'PROCESSING' || s.status === 'PENDING') && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                                <Loader2 className="w-3 h-3 animate-spin text-amber-600" /> Processing
                              </span>
                            )}
                            {s.status === 'FAILED' && (
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 cursor-help"
                                title={s.errorMessage || 'Extraction failed'}
                              >
                                <AlertCircle className="w-3 h-3 text-red-600" /> Failed
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-600">
                            {s.tokenCount > 0 ? (
                              <span>~{s.tokenCount.toLocaleString()} tokens</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-600">
                            {s.chunkCount > 0 ? (
                              <span className="font-bold text-slate-900">{s.chunkCount}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-slate-500 text-[11px]">
                            {s.processedAt ? new Date(s.processedAt).toLocaleDateString() : 'Pending'}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleReprocessSource(s.id)}
                                disabled={actionLoadingId === s.id}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Reprocess Source"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${actionLoadingId === s.id ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleDeleteSource(s.id, s.name)}
                                disabled={actionLoadingId === s.id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete Source"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEST SEARCH */}
        {activeTab === 'search' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Semantic Vector Retrieval Sandbox</h3>
              <p className="text-xs text-slate-600 mb-4">
                Ask a customer-like question to test which knowledge chunks are retrieved via pgvector cosine similarity.
              </p>

              <form onSubmit={handleTestSearch} className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. What is the return policy? What are your delivery timings?"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
                <button
                  type="submit"
                  disabled={searchLoading || !testQuery.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                >
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search Chunks
                </button>
              </form>
            </div>

            {/* Results Display */}
            {searchResults !== null && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                  <span>Top Matching Chunks</span>
                  <span>{searchResults.length} results</span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    No matching chunks found above relevance threshold for this query.
                  </div>
                ) : (
                  searchResults.map((result, idx) => (
                    <div
                      key={result.chunkId || idx}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900">
                            {result.sourceName} — {result.documentTitle}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Relevance: {Math.round(result.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                        {result.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONNECTED AI AGENTS */}
        {activeTab === 'agents' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Connected AI Agents</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Agents attached to this knowledge base will ground responses with these documents.
                  </p>
                </div>
                <Link
                  href={`/projects/${projectId}/ai/agents`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  <Bot className="w-3.5 h-3.5" /> Manage in AI Studio
                </Link>
              </div>

              {kb.connectedAgents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                  No AI agents are currently connected to this knowledge base. Open an agent in AI Agent Studio to connect it.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {kb.connectedAgents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/projects/${projectId}/ai/agents/${agent.id}`}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-600 transition">
                            {agent.name}
                          </h4>
                          <span className="text-[10px] text-slate-500">{agent.role}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {agent.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-6">Knowledge Base Settings</h3>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={settingsDesc}
                    onChange={(e) => setSettingsDesc(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings || !settingsName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                  >
                    {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ADD SOURCE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Add Knowledge Source</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select source type to ingest into this knowledge base.
            </p>

            {/* Category Selector Tabs */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { id: 'upload', label: 'File Upload', icon: UploadCloud },
                { id: 'url', label: 'Website URL', icon: Globe },
                { id: 'faq', label: 'Add FAQ', icon: HelpCircle },
                { id: 'text', label: 'Plain Text', icon: AlignLeft },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceCategory(tab.id as any)}
                    className={`py-3 px-2 rounded-xl text-center border transition flex flex-col items-center gap-1.5 ${
                      sourceCategory === tab.id
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {sourceFormError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {sourceFormError}
              </div>
            )}

            <form onSubmit={handleAddSource} className="space-y-4">
              {/* Category: File Upload */}
              {sourceCategory === 'upload' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition bg-slate-50/50">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf,.docx,.txt,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        if (file && !fileCustomName) {
                          setFileCustomName(file.name);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs font-bold text-emerald-600 hover:underline block">
                        {selectedFile ? selectedFile.name : 'Choose a file to upload'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Supported: PDF, DOCX, TXT, CSV (Max 25MB)
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Source Name / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Employee Handbook 2026.pdf"
                      value={fileCustomName}
                      onChange={(e) => setFileCustomName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Category: Website URL */}
              {sourceCategory === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Website Page URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/pricing or https://example.com/about"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Securely fetched server-side with SSRF protection. Single page ingested.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Source Name / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Website Pricing Page"
                      value={urlName}
                      onChange={(e) => setUrlName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Category: Add FAQ */}
              {sourceCategory === 'faq' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">FAQ Topic / Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Shipping Timings FAQ"
                      value={faqName}
                      onChange={(e) => setFaqName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Question <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. What are your delivery timings?"
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Verified Answer <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. We deliver within 2–5 business days across all metropolitan areas."
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Category: Plain Text */}
              {sourceCategory === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Return Policy & Warranty Terms"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      required
                      placeholder="Paste business policies, guidelines, product details, or operational instructions..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submittingSource}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSource}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {submittingSource && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Ingest Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
