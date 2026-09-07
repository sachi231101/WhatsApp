'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  MessageSquare,
  CheckCircle2,
  Users,
  Play,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Headphones,
  Calendar,
  GraduationCap,
  FileText,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  X,
  Send,
  Loader2,
  Check,
  Tag,
  Shield,
  Zap,
} from 'lucide-react';

interface AgentCard {
  id: string;
  name: string;
  description: string;
  category: string;
  languages: string;
  iconBg: string;
  iconColor: string;
  iconType: 'sales' | 'support' | 'leads' | 'admissions' | 'education' | 'finance' | 'documents';
  status: 'Active' | 'Inactive' | 'Draft';
  conversations: string;
  resolutionRate: string;
  humanHandoffs: string;
}

const AGENTS_LIST: AgentCard[] = [
  {
    id: 'agent-1',
    name: 'Sales Assistant',
    description: 'Handles course inquiries, pricing, and enrollment conversations.',
    category: 'Sales',
    languages: 'English + Hindi',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    iconType: 'sales',
    status: 'Active',
    conversations: '4,832',
    resolutionRate: '72%',
    humanHandoffs: '124',
  },
  {
    id: 'agent-2',
    name: 'Customer Support Agent',
    description: 'Answers student queries, solves issues, and provides support.',
    category: 'Support',
    languages: 'English',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    iconType: 'support',
    status: 'Active',
    conversations: '3,126',
    resolutionRate: '64%',
    humanHandoffs: '210',
  },
  {
    id: 'agent-3',
    name: 'Lead Qualification Agent',
    description: 'Qualifies leads and identifies high-intent prospects.',
    category: 'Lead Gen',
    languages: 'English + Hindi',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    iconType: 'leads',
    status: 'Active',
    conversations: '2,948',
    resolutionRate: '76%',
    humanHandoffs: '56',
  },
  {
    id: 'agent-4',
    name: 'Admissions Agent',
    description: 'Helps with admissions process, document requirements, and timelines.',
    category: 'Admissions',
    languages: 'English',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
    iconType: 'admissions',
    status: 'Active',
    conversations: '1,842',
    resolutionRate: '69%',
    humanHandoffs: '92',
  },
  {
    id: 'agent-5',
    name: 'Course Information Agent',
    description: 'Provides detailed information about courses, curriculum, and batches.',
    category: 'Education',
    languages: 'English + Hindi',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    iconType: 'education',
    status: 'Active',
    conversations: '1,284',
    resolutionRate: '62%',
    humanHandoffs: '88',
  },
  {
    id: 'agent-6',
    name: 'Payment & Finance Agent',
    description: 'Handles payment queries, EMI options, and fee related questions.',
    category: 'Finance',
    languages: 'English',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    iconType: 'finance',
    status: 'Active',
    conversations: '986',
    resolutionRate: '58%',
    humanHandoffs: '104',
  },
  {
    id: 'agent-7',
    name: 'Document Support Agent',
    description: 'Helps with document submission, verification, and requirements.',
    category: 'Support',
    languages: 'English',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    iconType: 'documents',
    status: 'Inactive',
    conversations: '624',
    resolutionRate: '71%',
    humanHandoffs: '42',
  },
];

export default function AiAgentsPage() {
  const [agents, setAgents] = useState<AgentCard[]>(AGENTS_LIST);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'drafts'>('all');
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Playground state
  const [playgroundAgent, setPlaygroundAgent] = useState<AgentCard | null>(null);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'agent'; text: string }[]>([
    { sender: 'agent', text: 'Hello! I am your AI assistant. How can I assist you today?' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Create/Edit Agent modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentCard | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Sales');
  const [formLanguages, setFormLanguages] = useState('English + Hindi');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenPlayground = (agent: AgentCard) => {
    setPlaygroundAgent(agent);
    setChatMessages([
      {
        sender: 'agent',
        text: `Hello! I am ${agent.name}. How can I assist you today with ${agent.category.toLowerCase()}?`,
      },
    ]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    setTimeout(() => {
      setChatLoading(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Thank you for your question about "${userText}". As the ${playgroundAgent?.name || 'AI Agent'}, I can provide all details regarding curriculum, timing, and fee assistance. Would you like me to share the brochure?`,
        },
      ]);
    }, 900);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingAgent) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === editingAgent.id
            ? {
                ...a,
                name: formName,
                description: formDesc,
                category: formCategory,
                languages: formLanguages,
              }
            : a
        )
      );
      showToast('Agent updated successfully!');
    } else {
      const newAgent: AgentCard = {
        id: `agent-${Date.now()}`,
        name: formName,
        description: formDesc || 'Handles customer conversations intelligently.',
        category: formCategory,
        languages: formLanguages,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        iconType: 'support',
        status: 'Active',
        conversations: '0',
        resolutionRate: '100%',
        humanHandoffs: '0',
      };
      setAgents((prev) => [newAgent, ...prev]);
      showToast('AI Agent created successfully!');
    }

    setShowCreateModal(false);
    setEditingAgent(null);
    setFormName('');
    setFormDesc('');
  };

  const handleEditClick = (agent: AgentCard) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormDesc(agent.description);
    setFormCategory(agent.category);
    setFormLanguages(agent.languages);
    setShowCreateModal(true);
  };

  const filteredAgents = agents.filter((a) => {
    if (activeTab === 'active' && a.status !== 'Active') return false;
    if (activeTab === 'inactive' && a.status !== 'Inactive') return false;
    if (activeTab === 'drafts' && a.status !== 'Draft') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getAgentIcon = (type: AgentCard['iconType']) => {
    switch (type) {
      case 'sales':
        return <Zap className="w-5 h-5 text-emerald-600" />;
      case 'support':
        return <Headphones className="w-5 h-5 text-blue-600" />;
      case 'leads':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'admissions':
        return <Calendar className="w-5 h-5 text-pink-600" />;
      case 'education':
        return <GraduationCap className="w-5 h-5 text-blue-600" />;
      case 'finance':
        return <span className="font-bold text-lg text-orange-600">₹</span>;
      case 'documents':
        return <FileText className="w-5 h-5 text-purple-600" />;
      default:
        return <Bot className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage AI agents that handle your WhatsApp conversations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenPlayground(agents[0])}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-gray-600" />
            Test Playground
          </button>
          <button
            onClick={() => {
              setEditingAgent(null);
              setFormName('');
              setFormDesc('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Create AI Agent
          </button>
        </div>
      </div>

      {/* ── 4 Metric Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-2">
              <Bot className="w-4.5 h-4.5 text-purple-600" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Active AI Agents</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">8</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 2 more than last month
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <MessageSquare className="w-4.5 h-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Conversations Handled</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">12,486</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 28% vs last month
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Resolution Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">68%</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 12% vs last month
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <Users className="w-4.5 h-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Human Handoffs</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">432</p>
            <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
              <span>↓</span> 8% vs last month
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-6 text-xs font-semibold">
          {[
            { key: 'all', label: `All Agents (${agents.length + 1})` },
            { key: 'active', label: `Active (${agents.filter((a) => a.status === 'Active').length})` },
            { key: 'inactive', label: `Inactive (${agents.filter((a) => a.status === 'Inactive').length})` },
            { key: 'drafts', label: 'Drafts (1)' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-2.5 transition-all relative ${
                activeTab === tab.key ? 'text-[#1b59f8]' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b59f8] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-52 placeholder-gray-400"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            Filter
          </button>
        </div>
      </div>

      {/* ── 8 Agent Cards Grid (4 Columns) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              {/* Card Header: Icon + Status Pill + More */}
              <div className="flex items-center justify-between mb-3.5">
                <div
                  className={`w-10 h-10 rounded-xl ${agent.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  {getAgentIcon(agent.iconType)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      agent.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {agent.status}
                  </span>
                  <button
                    onClick={() => showToast(`Options for ${agent.name}`)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Name & Description */}
              <h3 className="text-sm font-bold text-gray-900 mb-1">{agent.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
                {agent.description}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">
                  {agent.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600">
                  {agent.languages}
                </span>
              </div>
            </div>

            <div>
              {/* Stats Row (3 Columns) */}
              <div className="grid grid-cols-3 gap-1 py-3 border-t border-b border-gray-100 mb-4 text-center">
                <div>
                  <p className="text-xs font-bold text-gray-900">{agent.conversations}</p>
                  <p className="text-[10px] text-gray-400">Conversations</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{agent.resolutionRate}</p>
                  <p className="text-[10px] text-gray-400">Resolution Rate</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{agent.humanHandoffs}</p>
                  <p className="text-[10px] text-gray-400">Human Handoffs</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPlayground(agent)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-all"
                >
                  <Play className="w-3 h-3 text-gray-600 fill-current" />
                  Test
                </button>
                <button
                  onClick={() => handleEditClick(agent)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-all"
                >
                  <Edit2 className="w-3 h-3 text-gray-600" />
                  Edit
                </button>
                <button
                  onClick={() => showToast(`More settings for ${agent.name}`)}
                  className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                >
                  •••
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* ── Card 8: Create New Agent Card ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center hover:border-blue-300 transition-all min-h-[280px]">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-light mb-3 shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">Create New Agent</h3>
          <p className="text-xs text-gray-500 max-w-xs mb-4">
            Build a custom AI agent for your specific business needs.
          </p>
          <button
            onClick={() => {
              setEditingAgent(null);
              setFormName('');
              setFormDesc('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Create AI Agent
          </button>
        </div>
      </div>

      {/* ── Bottom Banner ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/60 border border-purple-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Need help configuring your AI agents?
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Use our guided setup or test in the playground to find the perfect configuration.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenPlayground(agents[0])}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-gray-600" />
            Open AI Playground
          </button>
          <button
            onClick={() => showToast('Opening documentation')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-gray-600" />
            View Documentation
          </button>
        </div>
      </div>

      {/* ── Playground Drawer / Modal ───────────────────────────────────────── */}
      {playgroundAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${playgroundAgent.iconBg} flex items-center justify-center`}>
                  {getAgentIcon(playgroundAgent.iconType)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{playgroundAgent.name} Playground</h3>
                  <p className="text-[11px] text-gray-400">Live test simulation</p>
                </div>
              </div>
              <button
                onClick={() => setPlaygroundAgent(null)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#1b59f8] text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    Agent is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Test a customer message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="w-9 h-9 rounded-xl bg-[#1b59f8] text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Create / Edit Agent Modal ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {editingAgent ? 'Edit AI Agent' : 'Create New AI Agent'}
                  </h3>
                  <p className="text-[11px] text-gray-400">Configure your automated WhatsApp agent</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Agent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Assistant"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What will this AI agent handle?"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Support">Support</option>
                    <option value="Lead Gen">Lead Gen</option>
                    <option value="Admissions">Admissions</option>
                    <option value="Education">Education</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Languages</label>
                  <select
                    value={formLanguages}
                    onChange={(e) => setFormLanguages(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  >
                    <option value="English">English</option>
                    <option value="English + Hindi">English + Hindi</option>
                    <option value="All Languages">All Languages (Auto)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1b59f8] text-white text-xs font-semibold hover:bg-blue-700"
                >
                  {editingAgent ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
