'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Workflow,
  Sparkles,
  Play,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  Settings,
  BarChart3,
  ListFilter,
  Search,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  PhoneCall,
  Webhook,
  Calendar,
  Filter,
  Tag,
  Award,
  Sliders,
  Send,
  UserCheck,
  UserCog,
  Bot,
  Smile,
  FileText,
  Hourglass,
  HelpCircle,
  X,
  Lock,
} from 'lucide-react';
import {
  WorkflowCanvas,
  type WorkflowCanvasHandle,
} from '@/components/automations/canvas/WorkflowCanvas';
import {
  type WorkflowNode,
  type WorkflowEdge,
  dbToFlowNodes,
  dbToFlowEdges,
  serializeWorkflow,
} from '@/components/automations/canvas/workflowTypes';
import { NodeLibrary } from '@/components/automations/nodes/NodeLibrary';

// ── Types ───────────────────────────────────────────────────────────────────

interface AutomationVersion {
  id: string;
  automationId: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  publishedAt: string | null;
}

interface AutomationNode {
  id: string;
  nodeKey: string;
  nodeType: string;
  label: string;
  config: Record<string, any>;
  positionX: number;
  positionY: number;
}

interface AutomationEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionBranch?: string | null;
}

interface ExecutionItem {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  triggerSource: string | null;
  errorMessage: string | null;
}

interface AutomationDetail {
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
  currentVersion?: AutomationVersion | null;
  draftVersion?: AutomationVersion | null;
  nodes?: AutomationNode[];
  edges?: AutomationEdge[];
  executions?: ExecutionItem[];
  nodeCount?: number;
}



export default function AutomationBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id || params?.projectId) as string;
  const automationId = params?.automationId as string;

  // Automation Data
  const [automation, setAutomation] = useState<AutomationDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'logs' | 'analytics'>('builder');

  // Canvas Ref & Selected Node
  const canvasRef = useRef<WorkflowCanvasHandle>(null);
  const [selectedFlowNode, setSelectedFlowNode] = useState<WorkflowNode | null>(null);

  // Initial nodes and edges for React Flow
  const initialFlowNodes = useMemo(() => {
    return dbToFlowNodes(automation?.nodes || []);
  }, [automation?.nodes]);

  const initialFlowEdges = useMemo(() => {
    return dbToFlowEdges(automation?.edges || []);
  }, [automation?.edges]);

  // Mobile drawer states
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);

  // Bottom executions panel collapse
  const [isExecutionsOpen, setIsExecutionsOpen] = useState(false);

  // ── Fetch Automation Data ──────────────────────────────────────────────────
  const fetchAutomation = useCallback(async () => {
    if (!projectId || !automationId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/automations/${automationId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Automation not found or access denied for this project.');
        } else if (res.status === 401 || res.status === 403) {
          setError('Forbidden: You do not have permission to access this automation.');
        } else {
          setError('An unexpected error occurred while loading the automation.');
        }
        return;
      }
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setAutomation(json.data);
        setName(json.data.name || '');
        setDescription(json.data.description || '');
      } else {
        setError(json.error || 'Failed to load automation details.');
      }
    } catch {
      setError('Network error: Unable to load automation.');
    } finally {
      setLoading(false);
    }
  }, [projectId, automationId]);

  useEffect(() => {
    fetchAutomation();
  }, [fetchAutomation]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toastMessage]);

  // ── Save Draft Handler ────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!name.trim()) {
      setToastMessage('Automation name cannot be empty');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.status === 'ok') {
        // Also persist canvas workflow graph if draft version exists
        const graph = canvasRef.current?.getGraph();
        const versionId = automation?.draftVersion?.id || automation?.currentVersionId;
        if (graph && versionId) {
          const payload = serializeWorkflow(graph.nodes, graph.edges);
          await fetch(
            `/api/projects/${projectId}/automations/${automationId}/versions/${versionId}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          ).catch(() => {});
        }

        setAutomation((prev) =>
          prev
            ? {
                ...prev,
                name: name.trim(),
                description: description.trim() || null,
              }
            : null
        );
        setToastMessage('Draft saved successfully');
      } else {
        setToastMessage(json.error || 'Failed to save changes');
      }
    } catch {
      setToastMessage('Network error while saving draft');
    } finally {
      setSaving(false);
    }
  };

  // ── Render Loading & Error States ─────────────────────────────────────────

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading automation builder"
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6"
      >
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-600">Loading automation builder...</p>
      </div>
    );
  }

  if (error || !automation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to Load Workflow</h2>
          <p className="text-xs text-gray-500 mb-6">{error || 'Automation not found or inaccessible.'}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/projects/${projectId}/automations`}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Back to Automations
            </Link>
            <button
              onClick={() => fetchAutomation()}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nodes = automation.nodes || [];
  const executions = automation.executions || [];
  const isActive = automation.status === 'ACTIVE';
  const isPaused = automation.status === 'PAUSED';
  const isDraft = automation.status === 'DRAFT';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden select-none">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. BUILDER HEADER */}
      {/* ==================================================================== */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left: Back, Name, Status, Description */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/projects/${projectId}/automations`}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition flex-shrink-0"
              title="Back to Automations"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0 space-y-0.5">
              <h1 className="sr-only">{automation.name}</h1>
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Automation Name"
                  className="text-sm sm:text-base font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none px-1 py-0.5 rounded transition truncate max-w-xs sm:max-w-md"
                />

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isPaused
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : isDraft
                      ? 'bg-gray-100 text-gray-700 border border-gray-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : 'bg-gray-400'
                    }`}
                  />
                  {automation.status}
                </span>

                {/* Version Pill */}
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                  <Layers className="w-2.5 h-2.5" />
                  v{automation.currentVersion?.versionNumber || 1} (Draft)
                </span>
              </div>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add workflow description..."
                className="text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-emerald-500 focus:outline-none px-1 py-0.5 rounded transition truncate w-full max-w-lg hidden sm:block"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile drawer triggers */}
            <button
              onClick={() => setShowLeftDrawer(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 border border-gray-200 text-xs font-semibold flex items-center gap-1"
              title="Add Node"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nodes</span>
            </button>

            <button
              onClick={() => setShowRightDrawer(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 border border-gray-200 text-xs font-semibold flex items-center gap-1"
              title="Configure Node"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Config</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
              ) : (
                <Save className="w-3.5 h-3.5 text-gray-600" />
              )}
              <span>Save</span>
            </button>

            {/* Test Workflow (Disabled/Coming-soon) */}
            <button
              type="button"
              disabled
              title="Test Workflow functionality is coming in Phase 6"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed flex items-center gap-1.5 opacity-60"
            >
              <Play className="w-3.5 h-3.5 text-gray-400" />
              <span>Test Workflow</span>
              <Lock className="w-2.5 h-2.5 text-gray-400" />
            </button>

            {/* Publish (Disabled/Coming-soon) */}
            <button
              type="button"
              disabled
              title="Publish functionality is coming in Phase 6"
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600/40 text-white cursor-not-allowed flex items-center gap-1.5 opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publish</span>
              <Lock className="w-2.5 h-2.5 text-white/80" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 border-t border-gray-100 text-xs font-medium">
          <button
            onClick={() => setActiveTab('builder')}
            className={`py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'builder'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Builder</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Execution Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. MAIN BODY - THREE COLUMN BUILDER OR GENUINE PLACEHOLDER TABS */}
      {/* ==================================================================== */}
      {activeTab === 'builder' && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex overflow-hidden">
            {/* -------------------------------------------------------------- */}
            {/* LEFT PANEL: ADD NODE LIBRARY                                   */}
            {/* -------------------------------------------------------------- */}
            <aside className="hidden lg:flex w-72 flex-shrink-0 bg-white border-r border-gray-200 flex-col overflow-hidden z-10 shadow-xs">
              <NodeLibrary
                onAddNode={(def) => canvasRef.current?.addNodeFromCatalogue(def)}
              />
            </aside>

            {/* -------------------------------------------------------------- */}
            {/* CENTER: WORKFLOW CANVAS WITH PAN, ZOOM, GRID                   */}
            {/* -------------------------------------------------------------- */}
            <WorkflowCanvas
              key={automation.id}
              ref={canvasRef}
              initialNodes={initialFlowNodes}
              initialEdges={initialFlowEdges}
              selectedNodeId={selectedFlowNode?.id}
              onSelectNode={setSelectedFlowNode}
              onOpenCatalogue={() => setShowLeftDrawer(true)}
            />

            {/* -------------------------------------------------------------- */}
            {/* RIGHT PANEL: NODE CONFIGURATION                                */}
            {/* -------------------------------------------------------------- */}
            <aside className="hidden lg:flex w-80 flex-shrink-0 bg-white border-l border-gray-200 flex-col overflow-hidden z-10 shadow-xs">
              <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-gray-500" />
                  <span>Node Configuration</span>
                </h2>
                {selectedFlowNode && (
                  <button
                    onClick={() => setSelectedFlowNode(null)}
                    className="text-gray-400 hover:text-gray-700 p-1 rounded-md cursor-pointer"
                    title="Deselect Node"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                {selectedFlowNode ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                      <p className="text-xs font-bold text-gray-900">
                        {selectedFlowNode.data?.label}
                      </p>
                      <p className="text-[11px] text-gray-500">Key: {selectedFlowNode.data?.nodeKey}</p>
                      <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedFlowNode.data?.nodeType || selectedFlowNode.type}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-700">Node Label</label>
                      <input
                        type="text"
                        value={selectedFlowNode.data?.label || ''}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          setSelectedFlowNode((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  data: {
                                    ...prev.data,
                                    label: newLabel,
                                  },
                                }
                              : null
                          );
                          canvasRef.current?.updateSelectedNodeData(selectedFlowNode.id, {
                            label: newLabel,
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                      <Sliders className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-800">
                        Select a node to configure it
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-xs leading-relaxed">
                        Click on any node in the workflow canvas or add one from the left catalogue to adjust triggers, parameters, or condition branches.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* BOTTOM PANEL: RECENT EXECUTIONS                                  */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white border-t border-gray-200 flex flex-col z-20 shadow-2xs">
            {/* Collapse / Expand Bar */}
            <div
              onClick={() => setIsExecutionsOpen((prev) => !prev)}
              className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition border-b border-gray-100"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="text-xs font-bold text-gray-800">Recent Executions</h3>
                <span className="text-[11px] text-gray-400 font-medium">
                  ({executions.length})
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <span>{isExecutionsOpen ? 'Collapse' : 'Expand'}</span>
                {isExecutionsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            {/* Executions Table Content */}
            {isExecutionsOpen && (
              <div className="max-h-48 overflow-y-auto p-4">
                {executions.length === 0 ? (
                  <div className="text-center py-6 space-y-1.5">
                    <Clock className="w-6 h-6 text-gray-300 mx-auto" />
                    <p className="text-xs font-semibold text-gray-700">No executions recorded yet</p>
                    <p className="text-[11px] text-gray-400">
                      When this automation runs or processes test messages, executions will appear here in real time.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Started At</th>
                        <th className="py-2 px-3">Completed At</th>
                        <th className="py-2 px-3">Execution Time</th>
                        <th className="py-2 px-3">Triggered By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {executions.map((ex) => (
                        <tr key={ex.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-mono text-[11px] text-gray-600 truncate max-w-24">
                            {ex.id}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                              {ex.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {new Date(ex.startedAt).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {ex.completedAt ? new Date(ex.completedAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-gray-600">—</td>
                          <td className="py-2 px-3 text-gray-600">{ex.triggerSource || 'Manual'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* MOBILE RESPONSIVE DRAWERS                                        */}
          {/* ================================================================ */}
          {showLeftDrawer && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-2xs"
                onClick={() => setShowLeftDrawer(false)}
              />
              <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10">
                <NodeLibrary
                  onAddNode={(def) => canvasRef.current?.addNodeFromCatalogue(def)}
                  onCloseDrawer={() => setShowLeftDrawer(false)}
                />
              </div>
            </div>
          )}

          {showRightDrawer && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
              <div
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-2xs"
                onClick={() => setShowRightDrawer(false)}
              />
              <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10">
                <div className="p-3.5 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span>Node Configuration</span>
                  </h2>
                  <button
                    onClick={() => setShowRightDrawer(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  {selectedFlowNode ? (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                        <p className="text-xs font-bold text-gray-900">
                          {selectedFlowNode.data?.label}
                        </p>
                        <p className="text-[11px] text-gray-500">Key: {selectedFlowNode.data?.nodeKey}</p>
                        <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {selectedFlowNode.data?.nodeType || selectedFlowNode.type}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700">Node Label</label>
                        <input
                          type="text"
                          value={selectedFlowNode.data?.label || ''}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setSelectedFlowNode((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    data: {
                                      ...prev.data,
                                      label: newLabel,
                                    },
                                  }
                                : null
                            );
                            canvasRef.current?.updateSelectedNodeData(selectedFlowNode.id, {
                              label: newLabel,
                            });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Sliders className="w-6 h-6 text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-800">Select a node to configure it</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Select a node from the workflow canvas to customize its settings.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. SETTINGS TAB (GENUINE PLACEHOLDER STATE)                          */}
      {/* ==================================================================== */}
      {activeTab === 'settings' && (
        <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900">Automation Settings</h2>
            <p className="text-xs text-gray-500">
              Configure workflow triggers, retry policies, error handling, and notification webhooks.
            </p>
            <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="font-semibold">Automation ID</span>
                <span className="font-mono text-gray-500 text-[11px]">{automation.id}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="font-semibold">Current Version</span>
                <span className="text-gray-500">Version {automation.currentVersion?.versionNumber || 1} ({automation.currentVersion?.status || 'DRAFT'})</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="font-semibold">Created Date</span>
                <span className="text-gray-500">{new Date(automation.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold">Last Updated</span>
                <span className="text-gray-500">{new Date(automation.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. EXECUTION LOGS TAB (GENUINE PLACEHOLDER STATE)                    */}
      {/* ==================================================================== */}
      {activeTab === 'logs' && (
        <div className="flex-1 max-w-5xl w-full mx-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3 shadow-2xs">
            <Clock className="w-8 h-8 text-gray-300 mx-auto" />
            <h2 className="text-sm font-bold text-gray-900">Execution Logs</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Detailed step-by-step logs, node inputs, outputs, and variable evaluations will appear here once this automation processes runs.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. ANALYTICS TAB (GENUINE PLACEHOLDER STATE)                         */}
      {/* ==================================================================== */}
      {activeTab === 'analytics' && (
        <div className="flex-1 max-w-5xl w-full mx-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3 shadow-2xs">
            <BarChart3 className="w-8 h-8 text-gray-300 mx-auto" />
            <h2 className="text-sm font-bold text-gray-900">Automation Analytics</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Conversion rates, drop-off nodes, and execution volume analytics will become available after workflows are activated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
