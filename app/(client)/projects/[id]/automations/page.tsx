'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  Search,
  Plus,
  ArrowLeft,
  Filter,
  Loader2,
  AlertCircle,
  Clock,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Archive,
  Edit2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  MessageSquare,
  Sparkles,
  GitBranch,
  Eye,
  Check,
} from 'lucide-react';

export interface AutomationVersionSummary {
  id: string;
  automationId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
}

export interface AutomationItem {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  currentVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentVersion?: AutomationVersionSummary | null;
  nodeCount?: number;
  triggerType?: string | null;
  lastRunAt?: string | null;
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED';

// Helper to format relative time
function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return 'Never run';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffDaysCalc(now, date));
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function diffDaysCalc(now: Date, date: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Friendly trigger label helper
function getTriggerDisplay(triggerType?: string | null, nodeCount = 0): { label: string; isConfigured: boolean } {
  if (!triggerType) {
    if (nodeCount === 0) return { label: 'Not configured', isConfigured: false };
    return { label: 'Workflow Trigger', isConfigured: true };
  }
  const t = triggerType.toLowerCase();
  if (t.includes('whatsapp') || t.includes('message')) return { label: 'WhatsApp Message', isConfigured: true };
  if (t.includes('keyword')) return { label: 'Keyword Trigger', isConfigured: true };
  if (t.includes('tag')) return { label: 'Contact Tag Added', isConfigured: true };
  if (t.includes('webhook')) return { label: 'Incoming Webhook', isConfigured: true };
  return { label: triggerType.replace(/_/g, ' '), isConfigured: true };
}

export default function ProjectAutomationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Data state
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User permission & project metadata
  const [userRole, setUserRole] = useState<string>('owner');
  const [projectName, setProjectName] = useState<string>('Project');

  // Search & Filters
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [triggerFilter, setTriggerFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const limit = 12;

  // Action in-progress state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingAutomation, setEditingAutomation] = useState<AutomationItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<AutomationItem | null>(null);
  const [archiving, setArchiving] = useState<boolean>(false);

  // Action dropdown menu state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Can user edit/create? (OWNER, ADMIN, MANAGER)
  const canManage = useMemo(() => {
    const r = userRole.toLowerCase();
    return r === 'owner' || r === 'admin' || r === 'manager';
  }, [userRole]);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filter changes
  const handleFilterChange = (status: FilterStatus) => {
    setActiveFilter(status);
    setPage(1);
  };

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  // Load project role
  useEffect(() => {
    async function loadProjectInfo() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setProjectName(json.data.name || 'Project');
            if (json.data.userRole) {
              setUserRole(json.data.userRole);
            }
          }
        }
      } catch (e) {
        // Non-fatal, default to owner
      }
    }
    if (projectId) {
      loadProjectInfo();
    }
  }, [projectId]);

  // Fetch automations from API
  const fetchAutomations = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (activeFilter !== 'ALL') {
        query.set('status', activeFilter);
      }
      if (debouncedSearch) {
        query.set('search', debouncedSearch);
      }
      query.set('limit', String(limit));
      query.set('offset', String((page - 1) * limit));

      const res = await fetch(`/api/projects/${projectId}/automations?${query.toString()}`);
      const json = await res.json();

      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to load automations.');
      }

      setAutomations(json.data || []);
      setTotalCount(json.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching automations:', err);
      setError(err.message || 'An error occurred while loading automations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId, activeFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Automation name is required.');
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch(`/api/projects/${projectId}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to create automation.');
      }

      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
      setToast({ type: 'success', message: `Automation "${json.data.automation.name}" created successfully.` });
      await fetchAutomations();
    } catch (err: any) {
      setCreateError(err.message || 'Could not create automation. Please check inputs.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAutomation) return;
    if (!editForm.name.trim()) {
      setEditError('Automation name is required.');
      return;
    }
    try {
      setSavingEdit(true);
      setEditError(null);

      const res = await fetch(`/api/projects/${projectId}/automations/${editingAutomation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to update automation.');
      }

      setEditingAutomation(null);
      setToast({ type: 'success', message: 'Automation updated successfully.' });
      await fetchAutomations();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update automation.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDuplicate = async (automation: AutomationItem) => {
    try {
      setActionLoadingId(automation.id);
      setOpenActionMenuId(null);

      const res = await fetch(`/api/projects/${projectId}/automations/${automation.id}/duplicate`, {
        method: 'POST',
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to duplicate automation.');
      }

      setToast({ type: 'success', message: `Duplicated as "${json.data.automation.name}".` });
      await fetchAutomations();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Could not duplicate automation.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleActivate = async (automation: AutomationItem) => {
    try {
      setActionLoadingId(automation.id);
      setOpenActionMenuId(null);

      const res = await fetch(`/api/projects/${projectId}/automations/${automation.id}/activate`, {
        method: 'POST',
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to activate automation.');
      }

      setToast({ type: 'success', message: `Automation "${automation.name}" is now active.` });
      await fetchAutomations();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Could not activate automation.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (automation: AutomationItem) => {
    try {
      setActionLoadingId(automation.id);
      setOpenActionMenuId(null);

      const res = await fetch(`/api/projects/${projectId}/automations/${automation.id}/pause`, {
        method: 'POST',
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to pause automation.');
      }

      setToast({ type: 'success', message: `Automation "${automation.name}" has been paused.` });
      await fetchAutomations();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Could not pause automation.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      setArchiving(true);
      const res = await fetch(`/api/projects/${projectId}/automations/${archiveTarget.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to archive automation.');
      }

      setArchiveTarget(null);
      setToast({ type: 'success', message: `Automation "${archiveTarget.name}" has been archived.` });
      await fetchAutomations();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to archive automation.' });
    } finally {
      setArchiving(false);
    }
  };

  // Filter automations client-side by optional trigger filter if selected
  const displayedAutomations = useMemo(() => {
    if (triggerFilter === 'ALL') return automations;
    return automations.filter((a) => {
      const display = getTriggerDisplay(a.triggerType, a.nodeCount);
      return display.label.toLowerCase().includes(triggerFilter.toLowerCase());
    });
  }, [automations, triggerFilter]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] overflow-y-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {projectName} Overview</span>
          </Link>
          {!canManage && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
              Read-Only Access ({userRole.toUpperCase()})
            </span>
          )}
        </div>

        {/* Header Banner */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Zap className="w-6 h-6 fill-blue-600 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Automations
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage workflows that automate your business.
                </p>
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                id="create-automation-button"
                onClick={() => {
                  setCreateError(null);
                  setCreateForm({ name: '', description: '' });
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b59f8] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Automation</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'ARCHIVED'] as FilterStatus[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleFilterChange(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === tab
                    ? 'bg-[#1b59f8] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                id="automation-search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search automations, workflows..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400 text-gray-900"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchAutomations()}
              disabled={loading}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh list"
              aria-label="Refresh automations list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          /* Skeleton Loading */
          <div role="status" aria-label="Loading automations" className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4">
            <span className="sr-only">Loading automations...</span>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded-md animate-pulse" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-50 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-44 bg-gray-200 rounded" />
                      <div className="h-3 w-64 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white border border-red-100 rounded-3xl p-8 sm:p-12 shadow-2xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Could not load automations</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">{error}</p>
            <button
              type="button"
              onClick={() => fetchAutomations()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : automations.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-gray-100 rounded-3xl p-10 sm:p-16 shadow-2xs text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Zap className="w-8 h-8 fill-blue-600 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {debouncedSearch ? 'No matching automations' : 'Create your first automation'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
              {debouncedSearch
                ? `No workflows matched your search term "${debouncedSearch}". Try a different name or clear the filter.`
                : 'Automatically handle customer conversations, follow-ups, lead qualification, and repetitive business tasks.'}
            </p>
            {debouncedSearch ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            ) : canManage ? (
              <button
                type="button"
                id="empty-create-automation-button"
                onClick={() => {
                  setCreateError(null);
                  setCreateForm({ name: '', description: '' });
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b59f8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Automation</span>
              </button>
            ) : null}
          </div>
        ) : (
          /* Automations Table (Desktop) & Cards (Mobile) */
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Automation Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Trigger</th>
                    <th className="py-3.5 px-6">Last Run</th>
                    <th className="py-3.5 px-6">Updated</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {displayedAutomations.map((auto) => {
                    const triggerInfo = getTriggerDisplay(auto.triggerType, auto.nodeCount);
                    const isArchived = auto.status === 'ARCHIVED';
                    const isActive = auto.status === 'ACTIVE';
                    const isPaused = auto.status === 'PAUSED';

                    return (
                      <tr
                        key={`desktop-${auto.id}`}
                        className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/projects/${projectId}/automations/${auto.id}`)}
                      >
                        {/* Name & Description */}
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : isPaused
                                  ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                  : isArchived
                                  ? 'bg-gray-100 text-gray-400'
                                  : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}
                            >
                              <Zap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {auto.name}
                                </span>
                                {auto.currentVersion && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-gray-100 text-gray-600">
                                    v{auto.currentVersion.versionNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-500 text-[11px] truncate max-w-xs sm:max-w-md mt-0.5">
                                {auto.description || 'No description provided'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : isPaused
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                : isArchived
                                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive
                                  ? 'bg-emerald-500 animate-pulse'
                                  : isPaused
                                  ? 'bg-purple-500'
                                  : isArchived
                                  ? 'bg-gray-400'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span>{auto.status}</span>
                          </span>
                        </td>

                        {/* Trigger */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <GitBranch className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span
                              className={`truncate max-w-[140px] ${
                                triggerInfo.isConfigured ? 'font-medium' : 'text-gray-400 italic'
                              }`}
                            >
                              {triggerInfo.label}
                            </span>
                          </div>
                        </td>

                        {/* Last Run */}
                        <td className="py-4 px-6 text-gray-500 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{formatTimeAgo(auto.lastRunAt)}</span>
                          </div>
                        </td>

                        {/* Updated */}
                        <td className="py-4 px-6 text-gray-400 text-[11px]">
                          {formatTimeAgo(auto.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-4 px-6 text-right relative"
                          onClick={(e) => e.stopPropagation()}
                          data-dropdown-container
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/projects/${projectId}/automations/${auto.id}`}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Open workflow"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {canManage && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenActionMenuId(openActionMenuId === auto.id ? null : auto.id)
                                  }
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                  title="More actions"
                                  aria-label="More actions"
                                >
                                  {actionLoadingId === auto.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                  ) : (
                                    <MoreVertical className="w-4 h-4" />
                                  )}
                                </button>

                                {openActionMenuId === auto.id && (
                                  <div
                                    role="menu"
                                    className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-30 text-left animate-in fade-in zoom-in-95"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        setEditForm({ name: auto.name, description: auto.description || '' });
                                        setEditingAutomation(auto);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Edit Details</span>
                                    </button>

                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => handleDuplicate(auto)}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Duplicate</span>
                                    </button>

                                    {isActive ? (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => handlePause(auto)}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 cursor-pointer"
                                      >
                                        <Pause className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Pause</span>
                                      </button>
                                    ) : (
                                      !isArchived && (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => handleActivate(auto)}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                        >
                                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Activate</span>
                                        </button>
                                      )
                                    )}

                                    {!isArchived && (
                                      <>
                                        <div className="my-1 border-t border-gray-100" />
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            setOpenActionMenuId(null);
                                            setArchiveTarget(auto);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                                        >
                                          <Archive className="w-3.5 h-3.5 text-red-500" />
                                          <span>Archive</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Visible below md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {displayedAutomations.map((auto) => {
                const triggerInfo = getTriggerDisplay(auto.triggerType, auto.nodeCount);
                const isArchived = auto.status === 'ARCHIVED';
                const isActive = auto.status === 'ACTIVE';
                const isPaused = auto.status === 'PAUSED';

                return (
                  <div
                    key={`mobile-${auto.id}`}
                    onClick={() => router.push(`/projects/${projectId}/automations/${auto.id}`)}
                    className="p-5 space-y-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-600'
                              : isPaused
                              ? 'bg-purple-50 text-purple-600'
                              : isArchived
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{auto.name}</h4>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {auto.description || 'No description'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPaused
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : isArchived
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : isPaused ? 'bg-purple-500' : isArchived ? 'bg-gray-400' : 'bg-amber-500'
                          }`}
                        />
                        <span>{auto.status}</span>
                      </span>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Layers className="w-3 h-3 text-gray-400" />
                        v{auto.currentVersion?.versionNumber || 1}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-gray-400" />
                        {triggerInfo.label}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatTimeAgo(auto.lastRunAt)}
                      </span>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div
                      className="pt-2 flex items-center justify-between border-t border-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-gray-400">Updated {formatTimeAgo(auto.updatedAt)}</span>
                      <div className="flex items-center gap-2">
                        {canManage && !isArchived && (
                          isActive ? (
                            <button
                              type="button"
                              onClick={() => handlePause(auto)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivate(auto)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              Activate
                            </button>
                          )
                        )}
                        <Link
                          href={`/projects/${projectId}/automations/${auto.id}`}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            {totalCount > 0 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Showing <span className="font-semibold text-gray-900">{displayedAutomations.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalCount}</span> automations
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {/* 1. Create Automation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 fill-blue-600 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Automation</h3>
                <p className="text-xs text-gray-400">Set up a new workflow for this project</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Lead Qualification Sequence"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Briefly describe what this workflow accomplishes..."
                  className="w-full px-3.5 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createForm.name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1b59f8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Automation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Automation Modal */}
      {editingAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => setEditingAutomation(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Automation</h3>
                <p className="text-xs text-gray-400">Update workflow title and description</p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAutomation(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editForm.name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1b59f8] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Archive Confirmation Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Archive Automation?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Are you sure you want to archive <strong className="text-gray-900">&quot;{archiveTarget.name}&quot;</strong>?
              It will cease running active workflows. You can still view it in the Archived tab.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                disabled={archiving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {archiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
