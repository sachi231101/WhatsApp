'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bot,
  ArrowLeft,
  Sparkles,
  Play,
  Pause,
  Edit,
  Brain,
  AlertCircle,
  Loader2,
  RotateCcw,
  Plus,
} from 'lucide-react';

interface AgentRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  handlingMode: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion?: any;
  draftVersion?: any;
}

interface VersionItem {
  id: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  role: string;
  model: string;
  provider: string;
  createdAt: string;
  publishedAt: string | null;
}

interface UsageSummary {
  total_requests: number;
  total_tokens: number;
  avg_latency_ms: number;
  success_count: number;
  failed_count: number;
  escalated_count: number;
}

export default function AgentDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'instructions' | 'knowledge' | 'behavior' | 'versions' | 'test'>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  // Rollback modal state
  const [rollbackModal, setRollbackModal] = useState<{ open: boolean; versionNumber: number } | null>(null);

  // Knowledge base attachment state
  const [attachedKbs, setAttachedKbs] = useState<any[]>([]);
  const [allProjectKbs, setAllProjectKbs] = useState<any[]>([]);
  const [attachingKbId, setAttachingKbId] = useState<string>('');
  const [showAttachKbModal, setShowAttachKbModal] = useState(false);
  const [kbActionLoading, setKbActionLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [agentRes, verRes, usageRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/ai/agents/${agentId}`),
        fetch(`/api/projects/${projectId}/ai/agents/${agentId}/versions`).catch((): Response | null => null),
        fetch(`/api/projects/${projectId}/ai/agents/${agentId}/usage`).catch((): Response | null => null),
      ]);

      if (agentRes.status === 404) {
        setError('Agent not found or access denied.');
        return;
      }

      const agentJson = await agentRes.json();
      if (agentRes.ok && agentJson.status === 'ok') {
        setAgent(agentJson.data);
      } else {
        setError(agentJson.error || 'Failed to load agent details');
      }

      if (verRes && verRes.ok) {
        const verJson = await verRes.json();
        if (verJson.status === 'ok') setVersions(verJson.data || []);
      }

      if (usageRes && usageRes.ok) {
        const usageJson = await usageRes.json();
        if (usageJson.status === 'ok') setUsage(usageJson.data);
      }

      // Fetch attached knowledge bases & all project KBs
      const [attachedKbRes, allKbRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/ai/agents/${agentId}/knowledge`).catch((): Response | null => null),
        fetch(`/api/projects/${projectId}/ai/knowledge`).catch((): Response | null => null),
      ]);

      if (attachedKbRes && attachedKbRes.ok) {
        const json = await attachedKbRes.json();
        if (json.status === 'ok') setAttachedKbs(json.data || []);
      }

      if (allKbRes && allKbRes.ok) {
        const json = await allKbRes.json();
        if (json.status === 'ok') setAllProjectKbs(json.data || []);
      }
    } catch (err: any) {
      console.error('Error loading agent:', err);
      setError('Network error loading agent details.');
    } finally {
      setLoading(false);
    }
  }, [projectId, agentId]);

  useEffect(() => {
    if (projectId && agentId) {
      fetchAllData();
    }
  }, [fetchAllData, projectId, agentId]);

  const handleToggleActive = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      const endpoint = agent.status === 'ACTIVE' ? 'pause' : 'activate';
      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agent.id}/${endpoint}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        await fetchAllData();
      } else {
        alert(json.error || `Failed to ${endpoint} agent`);
      }
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agent.id}/publish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        await fetchAllData();
      } else {
        alert(json.error || 'Failed to publish draft');
      }
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!agent || !rollbackModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agent.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber: rollbackModal.versionNumber }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setRollbackModal(null);
        await fetchAllData();
      } else {
        alert(json.error || 'Rollback failed');
      }
    } catch (err) {
      console.error('Rollback error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAttachKb = async (kbId: string) => {
    if (!kbId) return;
    setKbActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeBaseId: kbId }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setShowAttachKbModal(false);
        setAttachingKbId('');
        await fetchAllData();
      } else {
        alert(json.error || 'Failed to attach knowledge base');
      }
    } catch (err: any) {
      alert(err.message || 'Attach failed');
    } finally {
      setKbActionLoading(false);
    }
  };

  const handleDetachKb = async (kbId: string) => {
    if (!confirm('Are you sure you want to disconnect this knowledge base from this agent?')) return;
    setKbActionLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/ai/agents/${agentId}/knowledge?knowledgeBaseId=${kbId}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        await fetchAllData();
      } else {
        alert(json.error || 'Failed to detach knowledge base');
      }
    } catch (err: any) {
      alert(err.message || 'Detach failed');
    } finally {
      setKbActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-700">Loading agent details...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
        <Link
          href={`/projects/${projectId}/ai/agents`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agents</span>
        </Link>
        <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-800">{error || 'Agent not found'}</p>
        </div>
      </div>
    );
  }

  const activeVer = agent.currentVersion || agent.draftVersion || {};

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}/ai/agents`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agents</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{agent.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    agent.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                      : agent.status === 'PAUSED'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {agent.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/50">
                  {agent.currentVersion ? `v${agent.currentVersion.versionNumber}` : 'Draft Only'}
                </span>
              </div>
              <p className="text-xs text-gray-500 max-w-xl">
                {agent.description || 'WhatsApp autonomous agent with escalation and custom behavior.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link
              href={`/projects/${projectId}/ai/agents/${agent.id}/test`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Test Playground</span>
            </Link>

            <Link
              href={`/projects/${projectId}/ai/agents/${agent.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Draft</span>
            </Link>

            {agent.draftVersion && (
              <button
                type="button"
                onClick={handlePublishDraft}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1b59f8] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
              >
                <span>Publish Draft</span>
              </button>
            )}

            {agent.status === 'ACTIVE' ? (
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={actionLoading}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold"
                title="Pause Agent"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : agent.currentVersionId ? (
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={actionLoading}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold"
                title="Activate Agent"
              >
                <Play className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-gray-100 mt-6 pt-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'instructions', label: 'Instructions' },
            { id: 'knowledge', label: 'Knowledge' },
            { id: 'behavior', label: 'Behavior' },
            { id: 'versions', label: `Versions (${versions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900">Agent Configuration Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Handling Mode</span>
                  <span className="font-extrabold text-gray-900">{agent.handlingMode.replace('_', ' ')}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">AI Model</span>
                  <span className="font-extrabold text-gray-900">{activeVer.model || 'gpt-4o-mini'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Provider</span>
                  <span className="font-extrabold text-gray-900 capitalize">{activeVer.provider || 'OpenAI'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Tone</span>
                  <span className="font-extrabold text-gray-900">{activeVer.tone || 'Professional'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Language</span>
                  <span className="font-extrabold text-gray-900">{activeVer.language || 'English'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Escalation</span>
                  <span className="font-extrabold text-emerald-600">
                    {activeVer.escalationEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-extrabold text-gray-900">Current Role & Instructions</h3>
              <div className="text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl space-y-2 whitespace-pre-wrap leading-relaxed">
                <p className="font-bold text-gray-900">Role: {activeVer.role || 'Assistant'}</p>
                <p>{activeVer.systemInstructions || 'No instructions defined.'}</p>
              </div>
            </div>
          </div>

          {/* Usage Metrics */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900">Usage Metrics</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-500">Total Invocations</span>
                  <span className="font-extrabold text-gray-900">{usage?.total_requests || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-500">Tokens Processed</span>
                  <span className="font-extrabold text-gray-900">{usage?.total_tokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-500">Avg Latency</span>
                  <span className="font-extrabold text-gray-900">{usage?.avg_latency_ms || 0} ms</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <span className="text-gray-500">Human Escalations</span>
                  <span className="font-extrabold text-amber-600">{usage?.escalated_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INSTRUCTIONS */}
      {activeTab === 'instructions' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-5">
          <h3 className="text-sm font-extrabold text-gray-900">System Instructions & Behavior Rules</h3>
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-bold text-gray-700 block mb-1">Role</span>
              <p className="p-3 bg-gray-50 rounded-xl text-gray-800">{activeVer.role || 'Assistant'}</p>
            </div>
            <div>
              <span className="font-bold text-gray-700 block mb-1">System Instructions</span>
              <p className="p-4 bg-gray-50 rounded-xl text-gray-800 whitespace-pre-wrap leading-relaxed">
                {activeVer.systemInstructions || 'No instructions defined.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: KNOWLEDGE */}
      {activeTab === 'knowledge' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Connected Knowledge Bases</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                The agent will automatically retrieve verified business context from these knowledge bases.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAttachKbModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition self-start"
            >
              <Plus className="w-3.5 h-3.5" /> Attach Knowledge Base
            </button>
          </div>

          {attachedKbs.length === 0 ? (
            <div className="p-10 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-gray-800">No Knowledge Bases Connected</h4>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                Connect a knowledge base to ground this AI Agent with domain documents, FAQs, and product catalogs.
              </p>
              <button
                type="button"
                onClick={() => setShowAttachKbModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-gray-300 text-gray-700 hover:bg-white transition"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Knowledge Base
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attachedKbs.map((kb) => (
                <div
                  key={kb.id}
                  className="p-5 rounded-2xl border border-gray-200 hover:border-emerald-300 transition bg-white space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900">{kb.name}</h4>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{kb.description || 'No description'}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium">
                      {kb.sourceCount || 0} source documents
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/projects/${projectId}/ai/knowledge/${kb.id}`}
                        className="text-emerald-600 hover:underline font-bold"
                      >
                        View Sources
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDetachKb(kb.id)}
                        disabled={kbActionLoading}
                        className="text-red-500 hover:text-red-700 font-semibold"
                      >
                        Detach
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BEHAVIOR */}
      {activeTab === 'behavior' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-5 text-xs">
          <h3 className="text-sm font-extrabold text-gray-900">Conversational Behavior & Escalation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Greeting Message</span>
              <p className="font-semibold text-gray-800">{activeVer.greetingMessage || 'None'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Fallback Message</span>
              <p className="font-semibold text-gray-800">{activeVer.fallbackMessage || 'Standard fallback'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Escalation Status</span>
              <p className="font-semibold text-emerald-600">{activeVer.escalationEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Escalation Message</span>
              <p className="font-semibold text-gray-800">{activeVer.escalationMessage || 'None'}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VERSIONS */}
      {activeTab === 'versions' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900">Immutable Version History</h3>
          <p className="text-xs text-gray-500">
            Published versions are immutable. Rolling back creates a new published version with the selected configuration, preserving complete audit trails.
          </p>

          <div className="divide-y divide-gray-100">
            {versions.map((v) => (
              <div key={v.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-gray-900">Version {v.versionNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        v.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.status === 'DRAFT'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Role: {v.role} • Model: {v.model} • {v.publishedAt ? `Published ${new Date(v.publishedAt).toLocaleDateString()}` : 'Draft'}
                  </p>
                </div>

                {v.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    onClick={() => setRollbackModal({ open: true, versionNumber: v.versionNumber })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback to v{v.versionNumber}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-gray-900">
              Rollback to Version {rollbackModal.versionNumber}?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              This will create a new published version containing the exact configuration of Version {rollbackModal.versionNumber}. Historical records will remain completely intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRollbackModal(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRollback}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs"
              >
                {actionLoading ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Knowledge Base Modal */}
      {showAttachKbModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Attach Knowledge Base</h3>
              <p className="text-xs text-gray-500 mt-1">
                Select a knowledge base from this project to attach to this AI Agent.
              </p>
            </div>

            {allProjectKbs.filter((k) => !attachedKbs.some((ak) => ak.id === k.id)).length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-2xl text-center space-y-3 text-xs text-gray-500">
                <p>No unattached knowledge bases found in this project.</p>
                <Link
                  href={`/projects/${projectId}/ai/knowledge/new`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-white border border-gray-200 rounded-lg shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Knowledge Base
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700">Available Knowledge Bases</label>
                <select
                  value={attachingKbId}
                  onChange={(e) => setAttachingKbId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">Select a knowledge base...</option>
                  {allProjectKbs
                    .filter((k) => !attachedKbs.some((ak) => ak.id === k.id))
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.sourceCount || 0} sources)
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowAttachKbModal(false);
                  setAttachingKbId('');
                }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAttachKb(attachingKbId)}
                disabled={kbActionLoading || !attachingKbId}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {kbActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
