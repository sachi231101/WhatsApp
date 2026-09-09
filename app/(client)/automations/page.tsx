'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  X,
  Zap,
  MessageSquare,
  Tag,
  Users,
  Clock,
  Bot,
  Send,
  FileText,
  Globe,
  Phone,
  CheckCircle2,
  Settings,
  BarChart2,
  List,
  ChevronRight,
  ChevronDown,
  Minus,
  Maximize2,
  MoreVertical,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Mail,
  Webhook,
  Filter,
  Star,
  RefreshCw,
  Circle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeType =
  | 'trigger_whatsapp'
  | 'condition_message'
  | 'action_ai_agent'
  | 'action_send_message'
  | 'action_add_tag'
  | 'action_wait'
  | 'action_check_reply';

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  branch?: 'yes' | 'no';
  parentId?: string;
}

// ─── Node palette data ─────────────────────────────────────────────────────────
const TRIGGERS = [
  { id: 'trigger_whatsapp', label: 'New WhatsApp Message', icon: MessageSquare, color: 'text-emerald-500' },
  { id: 'trigger_keyword', label: 'Keyword Match', icon: Filter, color: 'text-blue-500' },
  { id: 'trigger_call', label: 'Incoming Call', icon: Phone, color: 'text-purple-500' },
  { id: 'trigger_webhook', label: 'Webhook', icon: Webhook, color: 'text-orange-500' },
  { id: 'trigger_schedule', label: 'Scheduled Trigger', icon: Clock, color: 'text-teal-500' },
];

const CONDITIONS = [
  { id: 'cond_message', label: 'Message Contains', icon: MessageSquare, color: 'text-purple-500' },
  { id: 'cond_tag', label: 'Contact Tag', icon: Tag, color: 'text-pink-500' },
  { id: 'cond_score', label: 'Lead Score', icon: Star, color: 'text-amber-500' },
  { id: 'cond_field', label: 'Custom Field', icon: FileText, color: 'text-indigo-500' },
  { id: 'cond_time', label: 'Time Condition', icon: Clock, color: 'text-teal-500' },
];

const ACTIONS = [
  { id: 'action_send', label: 'Send WhatsApp Message', icon: Send, color: 'text-blue-500' },
  { id: 'action_agent', label: 'Assign to Agent', icon: UserCheck, color: 'text-emerald-500' },
  { id: 'action_tag', label: 'Add Tag', icon: Tag, color: 'text-pink-500' },
  { id: 'action_contact', label: 'Update Contact', icon: Users, color: 'text-purple-500' },
  { id: 'action_task', label: 'Create Task', icon: CheckCircle2, color: 'text-indigo-500' },
  { id: 'action_email', label: 'Send Email', icon: Mail, color: 'text-orange-500' },
  { id: 'action_webhook', label: 'Webhook / API Call', icon: Globe, color: 'text-teal-500' },
];

const AI_NODES = [
  { id: 'ai_agent', label: 'AI Agent', icon: Bot, color: 'text-blue-500' },
  { id: 'ai_sentiment', label: 'Analyze Sentiment', icon: HelpCircle, color: 'text-purple-500' },
  { id: 'ai_extract', label: 'Extract Information', icon: FileText, color: 'text-emerald-500' },
  { id: 'ai_summary', label: 'Generate Summary', icon: List, color: 'text-amber-500' },
];

const UTILITIES = [
  { id: 'util_wait', label: 'Wait / Delay', icon: Clock, color: 'text-gray-500' },
  { id: 'util_split', label: 'Split / Branch', icon: ChevronRight, color: 'text-indigo-500' },
  { id: 'util_loop', label: 'Loop', icon: RefreshCw, color: 'text-teal-500' },
];

// ─── Executions data ──────────────────────────────────────────────────────────
const EXECUTIONS = [
  { id: '#EXE-001', status: 'Completed', startedAt: '12 Jan 2025, 10:24 AM', completedAt: '12 Jan 2025, 10:24 AM', execTime: '3.2s', triggeredBy: 'WhatsApp Message' },
  { id: '#EXE-002', status: 'Completed', startedAt: '12 Jan 2025, 09:18 AM', completedAt: '12 Jan 2025, 09:18 AM', execTime: '2.8s', triggeredBy: 'WhatsApp Message' },
  { id: '#EXE-003', status: 'Failed', startedAt: '12 Jan 2025, 08:45 AM', completedAt: '12 Jan 2025, 08:45 AM', execTime: '1.1s', triggeredBy: 'WhatsApp Message' },
];

// ─── Workflow nodes (pre-laid) ─────────────────────────────────────────────────
const INITIAL_NODES: WorkflowNode[] = [
  { id: 'n1', type: 'trigger_whatsapp', label: '1. New WhatsApp Message', sublabel: 'Trigger when a new message is received', x: 180, y: 0 },
  { id: 'n2', type: 'condition_message', label: '2. Message Contains', sublabel: 'Check if message contains course keywords', x: 180, y: 110 },
  // Yes branch (left)
  { id: 'n3', type: 'action_ai_agent', label: '3. AI Agent', sublabel: 'Get AI response for course inquiry', x: 40, y: 240, branch: 'yes', parentId: 'n2' },
  { id: 'n4', type: 'action_send_message', label: '4. Send Message', sublabel: 'Send course information', x: 40, y: 340, parentId: 'n3' },
  { id: 'n5', type: 'action_add_tag', label: '5. Add Tag', sublabel: "Tag as 'Course Interested'", x: 40, y: 440, parentId: 'n4' },
  { id: 'n6', type: 'action_wait', label: '6. Wait 2 Hours', sublabel: 'Wait before follow-up', x: 40, y: 540, parentId: 'n5' },
  { id: 'n7', type: 'action_check_reply', label: '7. Check Reply', sublabel: 'Has the customer replied?', x: 40, y: 640, parentId: 'n6' },
  // No branch (right)
  { id: 'n8', type: 'action_ai_agent', label: '8. AI Agent', sublabel: 'Handle general inquiry', x: 320, y: 240, branch: 'no', parentId: 'n2' },
  { id: 'n9', type: 'action_send_message', label: '9. Send Message', sublabel: 'Send helpful response', x: 320, y: 340, parentId: 'n8' },
  { id: 'n10', type: 'action_add_tag', label: '10. Add Tag', sublabel: "Tag as 'General Inquiry'", x: 320, y: 440, parentId: 'n9' },
];

// ─── Node color/style config ───────────────────────────────────────────────────
function getNodeStyle(type: NodeType): { bg: string; border: string; iconBg: string; iconColor: string } {
  switch (type) {
    case 'trigger_whatsapp':
      return { bg: 'bg-white', border: 'border-emerald-200', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' };
    case 'condition_message':
      return { bg: 'bg-white', border: 'border-purple-200', iconBg: 'bg-purple-50', iconColor: 'text-purple-500' };
    case 'action_ai_agent':
      return { bg: 'bg-white', border: 'border-blue-200', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' };
    case 'action_send_message':
      return { bg: 'bg-white', border: 'border-blue-200', iconBg: 'bg-blue-50', iconColor: 'text-blue-400' };
    case 'action_add_tag':
      return { bg: 'bg-white', border: 'border-pink-200', iconBg: 'bg-pink-50', iconColor: 'text-pink-500' };
    case 'action_wait':
      return { bg: 'bg-white', border: 'border-amber-200', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' };
    case 'action_check_reply':
      return { bg: 'bg-white', border: 'border-teal-200', iconBg: 'bg-teal-50', iconColor: 'text-teal-500' };
    default:
      return { bg: 'bg-white', border: 'border-gray-200', iconBg: 'bg-gray-50', iconColor: 'text-gray-500' };
  }
}

function getNodeIcon(type: NodeType) {
  switch (type) {
    case 'trigger_whatsapp': return MessageSquare;
    case 'condition_message': return Filter;
    case 'action_ai_agent': return Bot;
    case 'action_send_message': return Send;
    case 'action_add_tag': return Tag;
    case 'action_wait': return Clock;
    case 'action_check_reply': return HelpCircle;
    default: return Circle;
  }
}

// ─── PaletteSection ───────────────────────────────────────────────────────────
function PaletteSection({ title, items, color }: {
  title: string;
  items: { id: string; label: string; icon: React.ElementType; color: string }[];
  color: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 mb-1.5 text-left"
      >
        <span className={`text-xs font-bold ${color}`}>{title}</span>
        <ChevronDown className={`w-3 h-3 ${color} transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-grab transition-all group"
              >
                <Icon className={`w-3.5 h-3.5 ${item.color} flex-shrink-0`} />
                <span className="text-[11px] text-gray-700 font-medium group-hover:text-gray-900">{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FlowNode ────────────────────────────────────────────────────────────────
function FlowNode({ node, selected, onClick }: { node: WorkflowNode; selected: boolean; onClick: () => void }) {
  const style = getNodeStyle(node.type);
  const Icon = getNodeIcon(node.type);
  return (
    <div
      onClick={onClick}
      className={`absolute w-44 rounded-xl border-2 shadow-sm cursor-pointer transition-all hover:shadow-md ${style.bg} ${
        selected ? 'border-[#1b59f8] shadow-blue-100' : style.border
      }`}
      style={{ left: node.x, top: node.y }}
    >
      <div className="px-3 py-2.5 flex items-start gap-2">
        <div className={`w-7 h-7 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-3.5 h-3.5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-gray-800 leading-tight truncate">{node.label}</p>
          <p className="text-[9px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{node.sublabel}</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

// ─── Canvas SVG arrows ────────────────────────────────────────────────────────
function CanvasArrows({ nodes }: { nodes: WorkflowNode[] }) {
  const NODE_W = 176; // w-44
  const NODE_H = 64;

  const arrows: React.ReactNode[] = [];

  // n1 → n2
  arrows.push(
    <line key="n1-n2" x1={nodes[0].x + NODE_W / 2} y1={nodes[0].y + NODE_H} x2={nodes[1].x + NODE_W / 2} y2={nodes[1].y} stroke="#d1d5db" strokeWidth="2" markerEnd="url(#arrow)" />
  );

  // n2 → n3 (Yes) — go left
  const n2cx = nodes[1].x + NODE_W / 2;
  const n2bot = nodes[1].y + NODE_H;
  const n3cx = nodes[2].x + NODE_W / 2;
  const n8cx = nodes[7].x + NODE_W / 2;

  arrows.push(
    <g key="n2-branches">
      {/* Yes label */}
      <rect x={n3cx - 14} y={n2bot + 14} width={28} height={16} rx={8} fill="#dcfce7" />
      <text x={n3cx} y={n2bot + 25} textAnchor="middle" className="text-[8px]" fill="#16a34a" fontSize="9" fontWeight="600">Yes</text>
      <line x1={n2cx} y1={n2bot} x2={n3cx} y2={n2bot + 12} stroke="#d1d5db" strokeWidth="2" />
      <line x1={n3cx} y1={n2bot + 30} x2={n3cx} y2={nodes[2].y} stroke="#d1d5db" strokeWidth="2" markerEnd="url(#arrow)" />
      {/* No label */}
      <rect x={n8cx - 12} y={n2bot + 14} width={24} height={16} rx={8} fill="#fee2e2" />
      <text x={n8cx} y={n2bot + 25} textAnchor="middle" fill="#dc2626" fontSize="9" fontWeight="600">No</text>
      <line x1={n2cx} y1={n2bot} x2={n8cx} y2={n2bot + 12} stroke="#d1d5db" strokeWidth="2" />
      <line x1={n8cx} y1={n2bot + 30} x2={n8cx} y2={nodes[7].y} stroke="#d1d5db" strokeWidth="2" markerEnd="url(#arrow)" />
    </g>
  );

  // Yes chain: n3→n4→n5→n6→n7
  [2, 3, 4, 5, 6].forEach((i, idx) => {
    const from = nodes[i];
    const to = nodes[i + 1];
    if (!to || to.parentId !== from.id) return;
    arrows.push(
      <line key={`yes-${idx}`} x1={from.x + NODE_W / 2} y1={from.y + NODE_H} x2={to.x + NODE_W / 2} y2={to.y} stroke="#d1d5db" strokeWidth="2" markerEnd="url(#arrow)" />
    );
  });

  // No chain: n8→n9→n10
  [7, 8, 9].forEach((i, idx) => {
    const from = nodes[i];
    const to = nodes[i + 1];
    if (!to || to.parentId !== from.id) return;
    arrows.push(
      <line key={`no-${idx}`} x1={from.x + NODE_W / 2} y1={from.y + NODE_H} x2={to.x + NODE_W / 2} y2={to.y} stroke="#d1d5db" strokeWidth="2" markerEnd="url(#arrow)" />
    );
  });

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#9ca3af" />
        </marker>
      </defs>
      {arrows}
    </svg>
  );
}

// ─── Right Config Panel ───────────────────────────────────────────────────────
function NodeConfigPanel({ node, onClose }: { node: WorkflowNode; onClose: () => void }) {
  const Icon = getNodeIcon(node.type);
  const style = getNodeStyle(node.type);
  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-bold text-gray-800">Node Configuration</p>
        <button onClick={onClose} className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node header */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${style.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{node.type === 'trigger_whatsapp' ? 'New WhatsApp Message' : node.label.replace(/^\d+\.\s/, '')}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{node.type.startsWith('trigger') ? 'Trigger' : node.type.startsWith('condition') ? 'Condition' : 'Action'}</p>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          {node.type === 'trigger_whatsapp'
            ? 'Start the workflow when a new WhatsApp message is received.'
            : node.sublabel}
        </p>

        <div className="border-t border-gray-100" />

        {/* Basic Settings */}
        <div>
          <p className="text-xs font-bold text-gray-800 mb-3">Basic Settings</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                {node.type.startsWith('trigger') ? 'Trigger Name' : 'Node Name'} *
              </label>
              <input
                type="text"
                defaultValue={node.label.replace(/^\d+\.\s/, '')}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                rows={3}
                defaultValue={node.sublabel}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>
          </div>
        </div>

        {node.type === 'trigger_whatsapp' && (
          <>
            <div className="border-t border-gray-100" />
            <div>
              <p className="text-xs font-bold text-gray-800 mb-3">Filter (Optional)</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">WhatsApp Number</label>
                  <select className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option>All Numbers</option>
                    <option>+91 98765 43210</option>
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1">Run this trigger for messages from specific number or all numbers.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Message Type</label>
                  <select className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option>All Messages</option>
                    <option>Text Only</option>
                    <option>Images</option>
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1">Filter by message type (text, image, etc.)</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-700">Only New Contacts</p>
                    <p className="text-[9px] text-gray-400">Trigger only for new contacts</p>
                  </div>
                  <button className="w-10 h-5 rounded-full bg-gray-200 relative transition-all">
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info banner */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-700 leading-relaxed">
              This trigger will start the workflow every time a new WhatsApp message is received.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'logs' | 'analytics'>('builder');
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(INITIAL_NODES[0]);
  const [nodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [zoom, setZoom] = useState(100);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          {toastMsg}
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex-shrink-0">
        {/* Breadcrumb */}
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Automations
        </button>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Course Inquiry Automation</h1>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full border border-emerald-100">
              Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('Workflow saved!')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => showToast('Test workflow started...')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-gray-600 fill-current" />
              Test Workflow
            </button>
            <button
              onClick={() => showToast('Workflow published!')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
            >
              <Plus className="w-3.5 h-3.5" />
              Publish
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-gray-500 mt-0.5 mb-3">
          Automatically handle course inquiries, qualify leads, and send follow-ups.
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-6 text-xs font-semibold">
          {[
            { key: 'builder', label: 'Builder' },
            { key: 'settings', label: 'Settings' },
            { key: 'logs', label: 'Execution Logs' },
            { key: 'analytics', label: 'Analytics' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-2 relative transition-all ${
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

      {/* ── Builder Body ──────────────────────────────────────────────────────── */}
      {activeTab === 'builder' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Palette ────────────────────────────────────────────────── */}
          {paletteOpen && (
            <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto px-3 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-800">Add Node</p>
                <button
                  onClick={() => setPaletteOpen(false)}
                  className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <PaletteSection title="Triggers" items={TRIGGERS} color="text-amber-500" />
              <PaletteSection title="Conditions" items={CONDITIONS} color="text-purple-500" />
              <PaletteSection title="Actions" items={ACTIONS} color="text-blue-500" />
              <PaletteSection title="AI" items={AI_NODES} color="text-[#1b59f8]" />
              <PaletteSection title="Utilities" items={UTILITIES} color="text-amber-600" />
            </div>
          )}

          {/* ── Canvas ──────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Zoom controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-semibold text-gray-600 w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(150, z + 10))}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <Plus className="w-3 h-3" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            {/* Canvas area with dot grid */}
            <div
              className="flex-1 relative overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div
                className="absolute"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  left: paletteOpen ? 80 : 140,
                  top: 32,
                  width: 560,
                  height: 760,
                }}
              >
                {/* SVG arrows */}
                <CanvasArrows nodes={nodes} />

                {/* Nodes */}
                {nodes.map((node) => (
                  <FlowNode
                    key={node.id}
                    node={node}
                    selected={selectedNode?.id === node.id}
                    onClick={() => setSelectedNode(node)}
                  />
                ))}
              </div>
            </div>

            {/* ── Recent Executions strip ──────────────────────────────────── */}
            <div className="border-t border-gray-100 bg-white px-5 py-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-800">Recent Executions</p>
                <button className="text-[10px] text-[#1b59f8] font-semibold hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[10px] font-semibold text-gray-400">
                    {['ID', 'Status', 'Started At', 'Completed At', 'Execution Time', 'Triggered By', ''].map((h) => (
                      <th key={h} className="pb-1.5 pr-4 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {EXECUTIONS.map((ex) => (
                    <tr key={ex.id} className="group">
                      <td className="py-1.5 pr-4 text-gray-700 font-medium">{ex.id}</td>
                      <td className="py-1.5 pr-4">
                        {ex.status === 'Completed' ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-4 text-gray-500">{ex.startedAt}</td>
                      <td className="py-1.5 pr-4 text-gray-500">{ex.completedAt}</td>
                      <td className="py-1.5 pr-4 text-gray-700 font-medium">{ex.execTime}</td>
                      <td className="py-1.5 pr-4 text-gray-500">{ex.triggeredBy}</td>
                      <td className="py-1.5">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right Config Panel ───────────────────────────────────────────── */}
          {selectedNode ? (
            <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          ) : (
            <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-white flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs font-semibold text-gray-600">Select a node to configure it</p>
                <p className="text-[10px] text-gray-400 mt-1">Click any node on the canvas to view and edit its settings.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-bold text-gray-900">Workflow Settings</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Workflow Name *</label>
              <input defaultValue="Course Inquiry Automation" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea rows={3} defaultValue="Automatically handle course inquiries, qualify leads, and send follow-ups." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">Active</p>
                <p className="text-xs text-gray-500">Enable or disable this workflow</p>
              </div>
              <button className="w-10 h-5 rounded-full bg-[#1b59f8] relative">
                <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
            <div className="pt-2">
              <button onClick={() => showToast('Settings saved!')} className="px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Execution Logs Tab ───────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Execution Logs</h2>
              <span className="text-xs text-gray-500">Last 30 days</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['ID', 'Status', 'Started At', 'Completed At', 'Execution Time', 'Triggered By', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...EXECUTIONS, ...EXECUTIONS].map((ex, i) => (
                  <tr key={i} className="hover:bg-gray-50 group">
                    <td className="px-6 py-3 text-gray-700 font-medium">{ex.id}</td>
                    <td className="px-6 py-3">
                      {ex.status === 'Completed' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Failed</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{ex.startedAt}</td>
                    <td className="px-6 py-3 text-gray-500">{ex.completedAt}</td>
                    <td className="px-6 py-3 text-gray-700 font-medium">{ex.execTime}</td>
                    <td className="px-6 py-3 text-gray-500">{ex.triggeredBy}</td>
                    <td className="px-6 py-3"><button className="opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-4 h-4 text-gray-400" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Executions', value: '2,486', trend: '↑ 18%', icon: Zap, bg: 'bg-blue-50', color: 'text-blue-500' },
              { label: 'Success Rate', value: '94.2%', trend: '↑ 2.1%', icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-500' },
              { label: 'Avg. Exec Time', value: '2.8s', trend: '↓ 0.4s', icon: Clock, bg: 'bg-amber-50', color: 'text-amber-500' },
              { label: 'Failed Runs', value: '144', trend: '↓ 12%', icon: AlertCircle, bg: 'bg-red-50', color: 'text-red-500' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4.5 h-4.5 ${s.color}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{s.value}</p>
                  <p className={`text-[11px] font-semibold mt-1 ${s.trend.startsWith('↑') ? 'text-emerald-600' : 'text-red-500'}`}>{s.trend} vs last month</p>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-48">
            <div className="text-center">
              <BarChart2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-400">Execution chart will appear here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
