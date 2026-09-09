'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bot,
  Plus,
  Search,
  ArrowLeft,
  Sparkles,
  Play,
  Pause,
  Copy,
  Archive,
  Edit,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface AgentListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  handlingMode: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
  currentVersionNumber?: number | null;
  currentModel: string;
  currentProvider: string;
  updatedAt: string;
}

export default function ProjectAgentsListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal / confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    agentId: string;
    agentName: string;
    action: 'pause' | 'activate' | 'archive';
  } | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (search.trim()) query.set('search', search.trim());

      const res = await fetch(`/api/projects/${projectId}/ai/agents?${query.toString()}`);
      const json = await res.json();

      if (res.status === 404) {
        setError('Project not found or you lack permission to view it.');
        return;
      }

      if (res.ok && json.status === 'ok') {
        setAgents(json.data || []);
      } else {
        setError(json.error || 'Failed to load AI agents.');
      }
    } catch (err: any) {
      console.error('Error fetching agents:', err);
      setError('Network error loading AI agents.');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, search]);

  useEffect(() => {
    if (projectId) {
      fetchAgents();
    }
  }, [fetchAgents, projectId]);

  const handleDuplicate = async (agentId: string, name: string) => {
    try {
      setActionLoadingId(agentId);
      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name} (Copy)` }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        router.push(`/projects/${projectId}/ai/agents/${json.data.id}/edit`);
      } else {
        alert(json.error || 'Failed to duplicate agent');
      }
    } catch (err) {
      console.error('Duplicate error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal) return;
    const { agentId, action } = confirmModal;

    try {
      setActionLoadingId(agentId);
      let res: Response;
      if (action === 'archive') {
        res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}`, {
          method: 'DELETE',
        });
      } else if (action === 'pause') {
        res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/pause`, {
          method: 'POST',
        });
      } else {
        res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/activate`, {
          method: 'POST',
        });
      }

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setConfirmModal(null);
        await fetchAgents();
      } else {
        alert(json.error || `Failed to ${action} agent`);
      }
    } catch (err) {
      console.error(`Error on ${action}:`, err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Project</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">AI Agents</h1>
              <p className="text-xs text-gray-500">
                Autonomous WhatsApp AI agents with human handoff, custom instructions, and versioning.
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/projects/${projectId}/ai/agents/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b59f8] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create AI Agent</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'active', 'paused', 'draft'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-xs font-semibold">Loading AI Agents...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-red-700">{error}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1.5">No AI Agents Yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
            AI Agents converse with your WhatsApp customers 24/7, answering questions, qualifying leads, and smoothly escalating to your human team when requested.
          </p>
          <Link
            href={`/projects/${projectId}/ai/agents/new`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b59f8] text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Agent</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const isActing = actionLoadingId === agent.id;
            return (
              <div
                key={agent.id}
                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                          {agent.name}
                        </h3>
                        <span className="text-[11px] font-mono text-gray-400">
                          slug: {agent.slug}
                        </span>
                      </div>
                    </div>

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
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {agent.description || 'Autonomous WhatsApp agent with custom instructions and escalation rules.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50/80 rounded-2xl p-3 border border-gray-100/80 text-[11px] mb-4">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Mode</span>
                      <span className="font-bold text-gray-700">{agent.handlingMode.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Model</span>
                      <span className="font-bold text-gray-700">{agent.currentModel}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Version</span>
                      <span className="font-bold text-gray-700">
                        {agent.currentVersionNumber ? `v${agent.currentVersionNumber}` : 'Draft'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Provider</span>
                      <span className="font-bold text-gray-700 capitalize">{agent.currentProvider}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/projects/${projectId}/ai/agents/${agent.id}`}
                      className="flex-1 text-center py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/projects/${projectId}/ai/agents/${agent.id}/test`}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors"
                      title="Test Playground"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Test
                    </Link>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-gray-500 pt-1">
                    <Link
                      href={`/projects/${projectId}/ai/agents/${agent.id}/edit`}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-xs flex items-center gap-1"
                      title="Edit Draft"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    {agent.status === 'ACTIVE' ? (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            agentId: agent.id,
                            agentName: agent.name,
                            action: 'pause',
                          })
                        }
                        disabled={isActing}
                        className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 text-xs flex items-center gap-1"
                        title="Pause Agent"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            agentId: agent.id,
                            agentName: agent.name,
                            action: 'activate',
                          })
                        }
                        disabled={isActing}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 text-xs flex items-center gap-1"
                        title="Activate Agent"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDuplicate(agent.id, agent.name)}
                      disabled={isActing}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-xs flex items-center gap-1"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>

                    <button
                      onClick={() =>
                        setConfirmModal({
                          open: true,
                          agentId: agent.id,
                          agentName: agent.name,
                          action: 'archive',
                        })
                      }
                      disabled={isActing}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600 text-xs flex items-center gap-1"
                      title="Archive Agent"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 capitalize">
                {confirmModal.action} Agent: {confirmModal.agentName}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {confirmModal.action === 'archive'
                  ? 'Archiving will remove this agent from active service. All historical version logs and usage events are preserved.'
                  : confirmModal.action === 'pause'
                  ? 'Pausing will stop this agent from automatically responding to WhatsApp messages. Inbound messages will wait for human agents.'
                  : 'Activating will resume automated WhatsApp replies using this agent’s published configuration.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-2xs ${
                  confirmModal.action === 'archive'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.action === 'pause'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm {confirmModal.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
