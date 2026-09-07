'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  Play,
  RotateCcw,
  Check,
  Edit2,
  ExternalLink,
  ChevronDown,
  Globe,
  Upload,
  FileText,
  Trash2,
  Search,
  Zap,
  Sliders,
  Sparkles,
  ShieldCheck,
  Clock,
  Video,
  Calendar,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Plus,
  HelpCircle,
  Volume2,
  BookOpen,
  Image as ImageIcon,
  ShoppingBag,
  CreditCard,
  Target,
  Settings,
  X,
  User,
  Phone,
} from 'lucide-react';
import type { AgentConfigData } from '@/app/api/ai/agent-config/route';

export default function AiAgentsBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Active section for navigation
  const [activeSection, setActiveSection] = useState('business-profile');

  // Agent configuration state
  const [config, setConfig] = useState<AgentConfigData>({
    agentName: 'Chat agent',
    isPaused: true,
    website: 'https://academyhunt.com',
    businessName: 'Academy Hunt',
    greetingMessage: 'Hello! Welcome to Academy Hunt. How can we help you today?',
    currency: 'Not set',
    businessType: 'Education',
    whatBusinessDoes:
      'Academy Hunt is a premier professional education institute offering certified courses in Artificial Intelligence, Full-Stack Development, Data Science, and Digital Marketing with 100% placement support.',
    groundRules:
      'Always remain polite, encouraging, and helpful. Never promise admissions without eligibility check. Always mention our upcoming scholarship batch and offer to book a 15-minute live counselling demo.',
    tone: 'friendly',
    responseLength: 'medium',
    advancedTone:
      'Use clear, accessible language. Include bullet points when explaining course curricula or fee structures.',
    sources: [
      {
        id: 'src-1',
        type: 'url',
        name: 'academyhunt.com',
        details: '1 website',
        status: 'Ready',
      },
    ],
    images: [
      {
        id: 'img-1',
        title: 'Academy Hunt Campus',
        url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80',
        enabled: true,
      },
      {
        id: 'img-2',
        title: 'AI Lab & Classroom',
        url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
        enabled: true,
      },
      {
        id: 'img-3',
        title: 'Student Placements & Convocation',
        url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80',
        enabled: true,
      },
      {
        id: 'img-4',
        title: 'Certification Badge',
        url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
        enabled: true,
      },
    ],
    skills: [
      {
        id: 'skill-faq',
        title: 'FAQ / Support',
        description:
          'The contact asks a general question about the business — products, pricing, policies, hours, location, delivery areas, services, or "do you have/do you offer X". Use this whenever the answer should come from the business\'s own knowledge. Do NOT use it for order-specific lookups (use Order Status), for a buyer who wants to purchase/qualify (use Lead Qualification), or for returns (use Returns).',
        enabled: true,
      },
      {
        id: 'skill-handoff',
        title: 'Human Handoff',
        description:
          'The contact explicitly asks for a human/agent/manager, is clearly frustrated after you\'ve tried to help, raises something out of the bot\'s scope, or the matter is sensitive (billing dispute, fraud, complaint, legal). Use it to hand off cleanly — not as an escape from questions you haven\'t tried to answer yet.',
        enabled: true,
      },
      {
        id: 'skill-demo',
        title: 'Lead Qualification & Demo Booking',
        description:
          'Captures prospect name, WhatsApp number, course preferences, and books live product demos/counselling sessions directly into the Dashboard Calendar with conflict detection.',
        enabled: true,
      },
    ],
  });

  // UI Modals & Add Source states
  const [editingName, setEditingName] = useState(false);
  const [imageSearch, setImageSearch] = useState('');
  const [advancedToneOpen, setAdvancedToneOpen] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'url' | 'file' | 'text'>('url');
  const [sourceInput, setSourceInput] = useState('');

  // Right Drawer: "Test your Agent" Simulator state
  const [isTestDrawerVisible, setIsTestDrawerVisible] = useState(true);
  const [testTab, setTestTab] = useState<'train' | 'live'>('train');
  const [chatInput, setChatInput] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      text: string;
      booking?: any;
      conflictResolved?: boolean;
    }>
  >([
    {
      role: 'assistant',
      text: 'Hello! 👋 I am your Academy Hunt AI Agent. Ask me anything about our courses, fees, or ask me to schedule a live counselling demo!',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/ai/agent-config');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setConfig((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch (err) {
        console.error('Error fetching agent config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, simulating]);

  // Handle Save / Publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/ai/agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setPublishSuccess(true);
        setTimeout(() => setPublishSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Error publishing agent config:', err);
    } finally {
      setPublishing(false);
    }
  };

  // Toggle Pause/Live
  const handleTogglePause = async () => {
    const updated = { ...config, isPaused: !config.isPaused };
    setConfig(updated);
    try {
      await fetch('/api/ai/agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to toggle pause status:', err);
    }
  };

  // Regenerate from site
  const handleRegenerateFromSite = async () => {
    if (!config.website) return;
    setRegenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      setConfig((prev) => ({
        ...prev,
        businessName: prev.businessName || 'Academy Hunt',
        whatBusinessDoes:
          'Academy Hunt provides industry-accredited training in Generative AI, Full-Stack Engineering, Cloud Architecture, and Data Science. Students gain hands-on portfolio projects, 1-on-1 mentorship, and placement assistance.',
        groundRules:
          '1. Always clarify eligibility and prerequisites before enrolling.\n2. Emphasize live weekend batches and corporate certifications.\n3. Proactively offer to schedule a live 1-on-1 demo with our senior academic counsellor.',
      }));
    } finally {
      setRegenerating(false);
    }
  };

  // Toggle skill
  const toggleSkill = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  // Toggle image
  const toggleImage = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === id ? { ...img, enabled: !img.enabled } : img)),
    }));
  };

  // Simulator send message
  const handleSendMessage = async (customText?: string) => {
    const query = (customText || chatInput).trim();
    if (!query || simulating) return;

    const userMsg = { role: 'user' as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSimulating(true);

    try {
      const res = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.map((m) => ({ role: m.role, text: m.text })),
          prospectName: 'Test Student',
          prospectPhone: '+91 98765 43210',
          businessContext: `${config.businessName}. ${config.whatBusinessDoes} Rules: ${config.groundRules}`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: json.data?.reply || 'Understood. How else can I assist you?',
            booking: json.data?.booking,
            conflictResolved: json.data?.conflictResolved,
          },
        ]);

        if (json.data.isDemoBooked && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wazzapp:notification-update'));
        }
      }
    } catch (err) {
      console.error('Test chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I encountered an issue. Please try again.' },
      ]);
    } finally {
      setSimulating(false);
    }
  };

  // Add source helper
  const handleAddSource = () => {
    if (!sourceInput.trim()) return;
    const newSrc = {
      id: 'src-' + Date.now(),
      type: sourceType,
      name: sourceInput.trim(),
      details:
        sourceType === 'url'
          ? '1 website'
          : sourceType === 'file'
          ? 'Uploaded document'
          : 'Pasted text source',
      status: 'Ready' as const,
    };
    setConfig((prev) => ({ ...prev, sources: [...prev.sources, newSrc] }));
    setSourceInput('');
    setAddSourceModalOpen(false);
  };

  const handleDeleteSource = (id: string) => {
    setConfig((prev) => ({ ...prev, sources: prev.sources.filter((s) => s.id !== id) }));
  };

  const navItems = [
    { id: 'business-profile', label: 'Business Profile' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'images', label: 'Images' },
    { id: 'skills', label: 'Skills' },
    { id: 'products', label: 'Products' },
    { id: 'payments', label: 'Payments' },
    { id: 'meta-ads', label: 'Meta Ads' },
    { id: 'settings', label: 'Settings' },
  ];

  const filteredImages = config.images.filter((img) =>
    img.title.toLowerCase().includes(imageSearch.toLowerCase())
  );

  const enabledImagesCount = config.images.filter((img) => img.enabled).length;

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-[#f4f5f8] text-slate-800 antialiased font-sans">
      {/* ─── 1. TOP HEADER BAR ──────────────────────────────────────────────── */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-20 shadow-xs">
        {/* Left: Agent Name with Edit Pencil */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0b3d36] flex items-center justify-center text-white shadow-sm">
            <MessageSquare className="w-5 h-5 fill-white" />
          </div>

          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={config.agentName}
                onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                autoFocus
                className="bg-white border border-[#0b3d36] rounded-md px-2 py-0.5 text-base font-semibold text-slate-900 focus:outline-none"
              />
              <button
                onClick={() => setEditingName(false)}
                className="p-1 text-[#0b3d36] hover:text-[#082e29]"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group cursor-pointer"
              onClick={() => setEditingName(true)}
            >
              <h1 className="text-base font-bold text-slate-900 group-hover:text-[#0b3d36] transition-colors">
                {config.agentName}
              </h1>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
          )}

          {/* Inline Pause status indicator */}
          <div className="hidden sm:flex items-center gap-2 ml-4 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>AI paused — turn on to go live</span>
          </div>
        </div>

        {/* Right: Actions (Test, Published, Reload) */}
        <div className="flex items-center gap-2.5">
          {/* Test Button */}
          <button
            onClick={() => setIsTestDrawerVisible(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            <Play className="w-3 h-3 fill-slate-700" />
            <span>Test</span>
          </button>

          {/* Published / Save Button */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              publishSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0b3d36] hover:bg-[#082e29] text-white'
            }`}
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>{publishSuccess ? 'Saved' : 'Published'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            title="Reload config"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ─── 2. GLOBAL ALERT WARNING BANNER ─────────────────────────────────── */}
      <div
        className={`px-6 py-2 border-b text-xs flex items-center justify-between flex-shrink-0 transition-colors ${
          config.isPaused
            ? 'bg-[#fff9e6] border-amber-200 text-[#78350f]'
            : 'bg-[#ecfdf5] border-emerald-200 text-[#065f46]'
        }`}
      >
        <div className="flex items-center gap-2.5 font-medium">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
              config.isPaused ? 'bg-amber-600' : 'bg-emerald-600'
            }`}
          >
            i
          </div>
          <span>
            {config.isPaused
              ? "AI is paused. Your agent isn't replying on WhatsApp — config is safe and editable. Turn AI on to go live."
              : 'AI is live. Your agent is replying to incoming WhatsApp messages and booking demos into your dashboard calendar.'}
          </span>
        </div>
        <button
          onClick={handleTogglePause}
          className={`font-semibold hover:underline ml-4 flex-shrink-0 cursor-pointer ${
            config.isPaused ? 'text-amber-800' : 'text-emerald-800'
          }`}
        >
          {config.isPaused ? 'Turn AI on to go live' : 'Pause AI'}
        </button>
      </div>

      {/* ─── 3. THREE-COLUMN BUILDER WORKSPACE ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ─── LEFT COLUMN: Sticky Navigation ("ON THIS PAGE") ──────────────── */}
        <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col gap-0.5 select-none overflow-y-auto">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-3">
            On this page
          </p>
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  const el = document.getElementById(item.id);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center px-3 py-2 text-xs text-left rounded-md transition-all cursor-pointer relative ${
                  isActive
                    ? 'text-[#0b3d36] font-bold bg-[#f0f9f6]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0b3d36] rounded-r" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* ─── MIDDLE COLUMN: Configuration Canvas ─────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f8fafc] min-w-0">
          {/* ──── SECTION 1: BUSINESS PROFILE ──────────────────────────────── */}
          <section
            id="business-profile"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5"
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Business Profile</h2>
                <p className="text-xs text-slate-500">
                  Add the basic details and instructions your Agent needs to represent your
                  business accurately.
                </p>
              </div>
            </div>

            {/* Website row */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                Website
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={config.website}
                    onChange={(e) => setConfig({ ...config, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateFromSite}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#0b3d36] text-[#0b3d36] hover:bg-[#0b3d36]/5 text-xs font-semibold transition-all cursor-pointer flex-shrink-0"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{regenerating ? 'Crawling...' : 'Regenerate from site'}</span>
                </button>
              </div>
            </div>

            {/* 2-col: Agent/Business name & Greeting message */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Agent / business name
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                </label>
                <input
                  type="text"
                  value={config.businessName}
                  onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                  placeholder="How the agent introduces itself"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Greeting message (optional)
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                </label>
                <input
                  type="text"
                  value={config.greetingMessage}
                  onChange={(e) => setConfig({ ...config, greetingMessage: e.target.value })}
                  placeholder="Sent word-for-word as the first reply"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                />
              </div>
            </div>

            {/* 2-col: Store currency & Business type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Store currency
                </label>
                <select
                  value={config.currency}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                >
                  <option value="Not set">Not set</option>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Business type
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                </label>
                <select
                  value={config.businessType}
                  onChange={(e) => setConfig({ ...config, businessType: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                >
                  <option value="Education">Education</option>
                  <option value="E-Commerce">E-Commerce & Retail</option>
                  <option value="Healthcare">Healthcare & Wellness</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="B2B SaaS">B2B SaaS</option>
                  <option value="Consultancy">Professional Services / Consultancy</option>
                </select>
              </div>
            </div>

            {/* What the business does */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                What the business does
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </label>
              <textarea
                rows={3}
                value={config.whatBusinessDoes}
                onChange={(e) => setConfig({ ...config, whatBusinessDoes: e.target.value })}
                placeholder='Describe what the business does, or click "Regenerate from site" to draft it from your website.'
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:bg-white focus:border-[#0b3d36] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Ground rules */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                Ground rules
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </label>
              <textarea
                rows={3}
                value={config.groundRules}
                onChange={(e) => setConfig({ ...config, groundRules: e.target.value })}
                placeholder="Rules your agent must always follow — e.g. Never promise same-day delivery. Always mention the festive 15% off above ₹1,000."
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:bg-white focus:border-[#0b3d36] focus:outline-none leading-relaxed"
              />
            </div>
          </section>

          {/* ──── SECTION 2: TONE ──────────────────────────────────────────── */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tone</h2>
                <p className="text-xs text-slate-500">How your agent sounds.</p>
              </div>
            </div>

            {/* 4 Tone Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  id: 'friendly',
                  title: 'Friendly',
                  desc: "Warm, upbeat, uses the customer's name.",
                },
                {
                  id: 'professional',
                  title: 'Professional',
                  desc: 'Polished and concise. Minimal slang.',
                },
                {
                  id: 'concise',
                  title: 'Concise',
                  desc: 'Short, to the point, action-first.',
                },
                {
                  id: 'playful',
                  title: 'Playful',
                  desc: 'Light, a little cheeky, the odd emoji.',
                },
              ].map((tone) => {
                const isSelected = config.tone === tone.id;
                return (
                  <div
                    key={tone.id}
                    onClick={() => setConfig({ ...config, tone: tone.id as any })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0b3d36] bg-[#f0f9f6] ring-1 ring-[#0b3d36]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#0b3d36]' : 'text-slate-800'
                        }`}
                      >
                        {tone.title}
                        {isSelected && ' ✓'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{tone.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Response Length */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                Response length
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'short', title: 'Short', desc: 'A line or two.' },
                  { id: 'medium', title: 'Medium', desc: 'Balanced replies.' },
                  { id: 'long', title: 'Long', desc: 'Thorough when it helps.' },
                ].map((len) => {
                  const isSelected = config.responseLength === len.id;
                  return (
                    <div
                      key={len.id}
                      onClick={() => setConfig({ ...config, responseLength: len.id as any })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0b3d36] bg-[#f0f9f6] ring-1 ring-[#0b3d36]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? 'text-[#0b3d36]' : 'text-slate-800'
                          }`}
                        >
                          {len.title}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0b3d36]" />}
                      </div>
                      <p className="text-[11px] text-slate-500">{len.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advanced tone settings collapsible */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setAdvancedToneOpen(!advancedToneOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      Advanced tone settings
                      <HelpCircle className="w-3 h-3 text-slate-400" />
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Add custom instructions for how your agent should communicate.
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    advancedToneOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {advancedToneOpen && (
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <textarea
                    rows={2}
                    value={config.advancedTone}
                    onChange={(e) => setConfig({ ...config, advancedTone: e.target.value })}
                    placeholder="E.g., Always use cheerful greetings. If user speaks Hindi or Hinglish, reply in Hinglish."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:border-[#0b3d36] focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* ──── SECTION 3: KNOWLEDGE ─────────────────────────────────────── */}
          <section
            id="knowledge"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Knowledge</h2>
                <p className="text-xs text-slate-500">
                  Knowledge is the information your Agent uses to answer business-specific
                  questions. Add only accurate and up-to-date sources.
                </p>
              </div>
            </div>

            {/* 3 Action Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => {
                  setSourceType('url');
                  setAddSourceModalOpen(true);
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0b3d36] hover:bg-[#f0f9f6]/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-[#0b3d36]" />
                  <span className="text-xs font-bold text-slate-900">Crawl a page</span>
                </div>
                <p className="text-[11px] text-slate-500">Any public URL on your site</p>
              </div>

              <div
                onClick={() => {
                  setSourceType('file');
                  setAddSourceModalOpen(true);
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0b3d36] hover:bg-[#f0f9f6]/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-[#0b3d36]" />
                  <span className="text-xs font-bold text-slate-900">Upload files</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  PDF, DOC, TXT, CSV · 50 MB each · PDFs up to 30 pages
                </p>
              </div>

              <div
                onClick={() => {
                  setSourceType('text');
                  setAddSourceModalOpen(true);
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0b3d36] hover:bg-[#f0f9f6]/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[#0b3d36]" />
                  <span className="text-xs font-bold text-slate-900">Paste text</span>
                </div>
                <p className="text-[11px] text-slate-500">Policies, scripts, price lists</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Files: PDF, DOC, DOCX, TXT, CSV · up to 50 MB each · PDFs up to 30 pages
            </p>

            {/* Sources List */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-slate-800">
                {config.sources.length} {config.sources.length === 1 ? 'source' : 'sources'}
              </h3>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {config.sources.map((src) => (
                  <div
                    key={src.id}
                    className="px-4 py-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        {src.type === 'url' ? (
                          <Globe className="w-3.5 h-3.5" />
                        ) : src.type === 'file' ? (
                          <Upload className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{src.name}</p>
                        <p className="text-[10px] text-slate-500">{src.details}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 rounded-md border border-emerald-200">
                        {src.status}
                      </span>
                      <button
                        onClick={() => handleDeleteSource(src.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ──── SECTION 4: IMAGES ────────────────────────────────────────── */}
          <section
            id="images"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Images</h2>
                <p className="text-xs text-slate-500">
                  Images your agent may send — uncheck any it shouldn't.
                </p>
              </div>
            </div>

            {/* Search + count */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search images..."
                  value={imageSearch}
                  onChange={(e) => setImageSearch(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                />
              </div>

              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {enabledImagesCount} of {config.images.length} enabled
              </span>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  onClick={() => toggleImage(img.id)}
                  className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer aspect-4/3 bg-slate-100 ${
                    img.enabled
                      ? 'border-[#0b3d36] ring-2 ring-[#0b3d36]/30'
                      : 'border-slate-200 opacity-50 grayscale'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Title overlay */}
                  <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white truncate">
                    {img.title}
                  </p>

                  {/* Checkbox indicator */}
                  <div
                    className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-colors shadow-sm ${
                      img.enabled ? 'bg-[#0b3d36] text-white' : 'bg-white/80 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ──── SECTION 5: SKILLS ────────────────────────────────────────── */}
          <section
            id="skills"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Skills</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Skills define the tasks your Agent can perform, such as answering FAQs, qualifying
                  leads, collecting customer details or handing conversations over to your team.
                  Enable a prebuilt skill or create a custom one based on your business needs.{' '}
                  <span className="text-[#0b3d36] font-semibold underline cursor-pointer">
                    learn how to create and configure a new skill
                  </span>
                  .
                </p>
              </div>
            </div>

            {/* Enabled badge & subtitle */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {config.skills.filter((s) => s.enabled).length} enabled
              </span>
              <span className="text-xs text-slate-500">
                The jobs your agent does. Expand one to configure its variables, templates and ads.
              </span>
            </div>

            {/* + Add Skills Button */}
            <button
              type="button"
              className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Skills</span>
            </button>

            {/* Skills List */}
            <div className="space-y-3 pt-1">
              {config.skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-4 rounded-xl border transition-all ${
                    skill.enabled
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{skill.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    {/* Right toggles: Sliders & Checkbox */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Configure Skill"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleSkill(skill.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                          skill.enabled
                            ? 'bg-[#0b3d36] text-white'
                            : 'border border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ──── SECTIONS 6+: PRODUCTS, PAYMENTS, META ADS, SETTINGS ──────── */}
          <section
            id="products"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Products & Catalog</h3>
                <p className="text-xs text-slate-500">
                  Connect your Meta Commerce catalog to enable live WhatsApp product cards.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              Synced with Academy Hunt Courses: 14 Active Programs & Degree Modules.
            </div>
          </section>

          <section
            id="payments"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payments & WhatsApp Pay</h3>
                <p className="text-xs text-slate-500">
                  Enable native in-chat payments via UPI, Razorpay, or Stripe.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              Ready for UPI Instant Checkout (₹1,000 reservation tokens & scholarship applications).
            </div>
          </section>

          <section
            id="meta-ads"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Meta Ads (Click-to-WhatsApp)</h3>
                <p className="text-xs text-slate-500">
                  Auto-route leads from Facebook and Instagram ads directly into demo qualification.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              Active: Leads clicking on Academy Hunt Meta Ads automatically launch the AI Demo
              Booking workflow.
            </div>
          </section>

          <section
            id="settings"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] text-[#0b3d36] flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Advanced Agent Settings</h3>
                <p className="text-xs text-slate-500">
                  Model parameters, fallback latency, human team notification webhooks.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              Powered by Llama-3 70B & Gemini Pro with Real-Time Database Calendar Sync.
            </div>
          </section>
        </main>

        {/* ─── RIGHT COLUMN: "Test your Agent" Simulator ───────────────────── */}
        {isTestDrawerVisible && (
          <aside className="w-[380px] lg:w-[420px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden select-none">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">Test your Agent</h3>
              </div>
              <button
                onClick={() => setIsTestDrawerVisible(false)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer font-medium"
              >
                Hide &gt;
              </button>
            </div>

            {/* Train / Live Tabs + New Chat */}
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setTestTab('train')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    testTab === 'train'
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Train
                </button>
                <button
                  onClick={() => setTestTab('live')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    testTab === 'live'
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live
                </button>
              </div>

              <button
                onClick={() =>
                  setMessages([
                    {
                      role: 'assistant',
                      text: `Hello! 👋 I am your ${config.businessName} AI Agent. How can I assist you today?`,
                    },
                  ])
                }
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>New chat</span>
              </button>
            </div>

            {/* Simulator Chat Area (WhatsApp Doodle Wallpaper Aesthetic) */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 relative"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage:
                  'radial-gradient(#dcd5cb 1px, transparent 1px), radial-gradient(#dcd5cb 1px, #efeae2 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
              }}
            >
              {/* Wallpaper overlay watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
                <MessageSquare className="w-48 h-48 text-slate-800" />
              </div>

              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col relative z-10 ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-xs shadow-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/60'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {/* Interactive Calendar Booking Card if demo was scheduled */}
                    {m.booking && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-slate-800 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Demo Scheduled & Synced!</span>
                        </div>
                        <div className="text-[11px] space-y-1">
                          <p>
                            <strong>Date:</strong> {m.booking.scheduled_date} at{' '}
                            {m.booking.scheduled_time}
                          </p>
                          <p>
                            <strong>Prospect:</strong> {m.booking.prospect_name} (
                            {m.booking.prospect_phone})
                          </p>
                          <p>
                            <strong>Status:</strong>{' '}
                            <span className="capitalize text-emerald-700 font-bold">
                              {m.booking.status}
                            </span>
                          </p>
                        </div>
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:underline pt-1"
                        >
                          <span>View on Dashboard Calendar</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {m.role === 'user' ? 'You' : config.agentName}
                  </span>
                </div>
              ))}

              {simulating && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/90 border border-slate-200 text-slate-600 text-xs w-fit">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Agent is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Test Action Chips */}
            <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => handleSendMessage('Tell me about the AI & Machine Learning course')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap"
              >
                💡 Course Inquiry
              </button>
              <button
                onClick={() => handleSendMessage('Can I book a live demo tomorrow at 2:00 PM?')}
                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 whitespace-nowrap font-medium"
              >
                📅 Book at 2:00 PM
              </button>
            </div>

            {/* Chat Input & Counter */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2">
              <div className="text-[11px] text-slate-500 font-medium">
                500 / 500 free test messages left
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask your agent something"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-[#f8fafc] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || simulating}
                  className="px-3.5 py-2 rounded-lg bg-slate-200 text-slate-600 disabled:opacity-50 hover:bg-[#0b3d36] hover:text-white text-xs font-semibold transition-all cursor-pointer flex-shrink-0"
                >
                  Send
                </button>
              </div>

              <p className="text-[10px] text-slate-400 leading-snug">
                Test your latest saved changes before publishing them. These responses are not
                visible to customers.
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* Floating WhatsApp Chat Icon (Bottom-Right matching screenshot) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsTestDrawerVisible(!isTestDrawerVisible)}
          className="w-12 h-12 rounded-full bg-[#25d366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
          title="WhatsApp Agent Simulator"
        >
          <MessageSquare className="w-6 h-6 fill-white" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
        </button>
      </div>

      {/* ─── ADD SOURCE MODAL ──────────────────────────────────────────────── */}
      {addSourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {sourceType === 'url'
                  ? 'Crawl a Website Page'
                  : sourceType === 'file'
                  ? 'Upload Document'
                  : 'Paste Text Knowledge'}
              </h3>
              <button
                onClick={() => setAddSourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                {sourceType === 'url'
                  ? 'Page URL'
                  : sourceType === 'file'
                  ? 'File Name or Title'
                  : 'Knowledge Text'}
              </label>
              {sourceType === 'text' ? (
                <textarea
                  rows={4}
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="Paste FAQ questions, refund policy, admissions guidelines..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder={
                    sourceType === 'url'
                      ? 'https://academyhunt.com/courses'
                      : 'Course_Brochure_2026.pdf'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#0b3d36] focus:outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAddSourceModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                disabled={!sourceInput.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0b3d36] text-white hover:bg-[#082e29] disabled:opacity-50"
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
