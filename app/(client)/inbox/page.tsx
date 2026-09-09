'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Ably from 'ably';
import {
  Search,
  Bot,
  Send,
  CheckCheck,
  Check,
  Sparkles,
  Loader2,
  Filter,
  SquarePen,
  Phone,
  Mail,
  MapPin,
  Tag,
  Flame,
  MoreVertical,
  ChevronDown,
  Paperclip,
  Smile,
  FileText,
  Download,
  Users,
  Star,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  status: 'open' | 'resolved' | 'pending';
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  window_expires_at?: string;
  wa_id: string;
  phone_number: string;
  profile_name: string;
  avatar_url?: string;
  assigned_to?: string;
  is_ai?: boolean;
}

interface Message {
  id: string;
  meta_message_id?: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'user' | 'ai_agent' | 'system';
  type: string;
  body: string;
  caption?: string;
  media_url?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const initials = (name: string) =>
  (name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const avatarColors = [
  'bg-rose-400', 'bg-purple-400', 'bg-blue-500', 'bg-emerald-400',
  'bg-orange-400', 'bg-teal-400', 'bg-indigo-400', 'bg-pink-400',
];
const avatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

// Demo fallback conversations
const DEMO_CONVERSATIONS: Conversation[] = [
  { id: 'd1', status: 'open', last_message_preview: 'Can you tell me the course price?', last_message_at: new Date(Date.now() - 2 * 60000).toISOString(), unread_count: 3, wa_id: '919876543210', phone_number: '+91 98765 43210', profile_name: 'Rahul Sharma' },
  { id: 'd2', status: 'open', last_message_preview: 'Thank you! 🙏', last_message_at: new Date(Date.now() - 10 * 60000).toISOString(), unread_count: 1, wa_id: '919876543211', phone_number: '+91 98765 43211', profile_name: 'Priya Patel', is_ai: true },
  { id: 'd3', status: 'open', last_message_preview: 'Do you have a demo class?', last_message_at: new Date(Date.now() - 25 * 60000).toISOString(), unread_count: 0, wa_id: '919876543212', phone_number: '+91 98765 43212', profile_name: 'Amit Kumar' },
  { id: 'd4', status: 'open', last_message_preview: 'What are the batch timings?', last_message_at: new Date(Date.now() - 60 * 60000).toISOString(), unread_count: 2, wa_id: '919876543213', phone_number: '+91 98765 43213', profile_name: 'Sneha Reddy' },
  { id: 'd5', status: 'open', last_message_preview: 'I want to enroll in this course', last_message_at: new Date(Date.now() - 120 * 60000).toISOString(), unread_count: 0, wa_id: '919876543214', phone_number: '+91 98765 43214', profile_name: 'Vikrant Tiwari' },
  { id: 'd6', status: 'open', last_message_preview: 'Is there any scholarship available?', last_message_at: new Date(Date.now() - 180 * 60000).toISOString(), unread_count: 0, wa_id: '919876543215', phone_number: '+91 98765 43215', profile_name: 'Neha Gupta', is_ai: true },
  { id: 'd7', status: 'open', last_message_preview: 'Please share the brochure', last_message_at: new Date(Date.now() - 240 * 60000).toISOString(), unread_count: 0, wa_id: '919876543216', phone_number: '+91 98765 43216', profile_name: 'Rohan Mehta' },
  { id: 'd8', status: 'open', last_message_preview: 'Can I get more information about...', last_message_at: new Date(Date.now() - 360 * 60000).toISOString(), unread_count: 1, wa_id: '919876543217', phone_number: '+91 98765 43217', profile_name: 'Kavya Nair' },
  { id: 'd9', status: 'resolved', last_message_preview: 'Thanks for the help!', last_message_at: new Date(Date.now() - 1440 * 60000).toISOString(), unread_count: 0, wa_id: '919876543218', phone_number: '+91 98765 43218', profile_name: 'Arjun Singh' },
  { id: 'd10', status: 'resolved', last_message_preview: 'Can you tell me the next batch date?', last_message_at: new Date(Date.now() - 1440 * 60000).toISOString(), unread_count: 0, wa_id: '919876543219', phone_number: '+91 98765 43219', profile_name: 'Meera Iyer', is_ai: true },
];

const DEMO_MESSAGES: Message[] = [
  { id: 'm1', direction: 'inbound', sender_type: 'customer', type: 'text', body: "Hi! 👋\nI'm interested in your data science course.\nCan you tell me the course price?", status: 'read', created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'm2', direction: 'outbound', sender_type: 'ai_agent', type: 'text', body: "Hi Rahul! 👋\nThanks for your interest in our Data Science course.\n\nThe course fee is ₹24,000 for 6 months, which includes:\n✅ Live online classes\n✅ Hands-on projects\n✅ Certification\n✅ Placement support\n\nWould you like me to share the detailed brochure?", status: 'read', created_at: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: 'm3', direction: 'inbound', sender_type: 'customer', type: 'text', body: "Yes please, share the brochure.\nAlso, do you have a demo class?", status: 'read', created_at: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: 'm4', direction: 'outbound', sender_type: 'ai_agent', type: 'text', body: "Sure! Here is the brochure for our Data Science course.\n\nWe also offer a free demo class this Saturday at 11 AM.\nWould you like to register you for the demo?", status: 'delivered', created_at: new Date(Date.now() - 15 * 60000).toISOString() },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    resolved: 'bg-gray-100 text-gray-500',
    pending: 'bg-orange-100 text-orange-600',
  };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-500'} cursor-pointer`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
      <ChevronDown className="w-3 h-3" />
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeamInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [subFilter, setSubFilter] = useState<'ai' | 'human' | 'resolved' | null>(null);
  const [aiMode, setAiMode] = useState(true);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConv = conversations.find((c) => c.id === selectedId);

  // ── Fetch Conversations ──────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConv(true);
      const res = await fetch('/api/conversations');
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
        // Merge real DB conversations with demo conversations for rich experience
        const dbIds = new Set(json.data.map((c: any) => c.id));
        const rest = DEMO_CONVERSATIONS.filter((d) => !dbIds.has(d.id));
        const merged = [...json.data, ...rest];
        setConversations(merged);
        setSelectedId((prev) => prev || merged[0].id);
      } else {
        setConversations(DEMO_CONVERSATIONS);
        setSelectedId((prev) => prev || DEMO_CONVERSATIONS[0].id);
      }
    } catch {
      setConversations(DEMO_CONVERSATIONS);
      setSelectedId((prev) => prev || DEMO_CONVERSATIONS[0].id);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Fetch Messages ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) {
      return () => {};
    }
    if (selectedId.startsWith('d')) {
      // Demo conversation
      setMessages(selectedId === 'd1' ? DEMO_MESSAGES : []);
      return () => {};
    }

    let mounted = true;
    setLoadingMsgs(true);
    fetch(`/api/conversations/${selectedId}/messages`)
      .then(r => r.json())
      .then(j => { if (mounted && j.status === 'ok') setMessages(j.data); })
      .catch(() => setMessages([]))
      .finally(() => { if (mounted) setLoadingMsgs(false); });

    return () => { mounted = false; };
  }, [selectedId]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Ably Realtime ────────────────────────────────────────────────────────────
  useEffect(() => {
    let client: Ably.Realtime | null = null;
    let channel: any = null;
    let cancelled = false;

    const setup = async () => {
      try {
        // Pre-check if Ably is enabled before creating client to avoid unnecessary connection attempts
        const initialRes = await fetch('/api/ably-auth');
        if (!initialRes.ok || cancelled) return;
        const initialData = await initialRes.json();
        if (!initialData || initialData.enabled === false || initialData.error || cancelled) {
          // Ably is disabled or not configured — stay in polling/REST mode cleanly
          return;
        }

        client = new Ably.Realtime({
          authCallback: async (_, cb) => {
            try {
              const r = await fetch('/api/ably-auth');
              if (!r.ok) {
                cb({ message: `Ably auth unavailable (${r.status})`, statusCode: 403, code: 40101 } as any, null);
                return;
              }
              const data = await r.json();
              if (data.error || data.enabled === false) {
                cb({ message: data.error || 'Ably disabled', statusCode: 403, code: 40101 } as any, null);
                return;
              }
              cb(null, data);
            } catch (e) {
              cb({ message: (e as Error)?.message || 'Ably auth error', statusCode: 403, code: 40101 } as any, null);
            }
          },
        });

        // Silence unhandled connection failure events
        client.connection.on('failed', () => {});

        channel = client.channels.get('get-started');
        channel.subscribe('first', () => {
          if (selectedId && !selectedId.startsWith('d')) {
            fetch(`/api/conversations/${selectedId}/messages`).then(r => r.json()).then(d => {
              if (d.status === 'ok') setMessages(d.data);
            }).catch(() => {});
          }
          fetchConversations();
        });
      } catch { /* realtime optional */ }
    };

    setup();
    return () => {
      cancelled = true;
      try {
        channel?.unsubscribe();
        client?.close();
      } catch {}
    };
  }, [selectedId, fetchConversations]);

  // ── Send Message ─────────────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedId || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    const tempId = 'temp-' + Date.now();
    setMessages(prev => [...prev, {
      id: tempId, direction: 'outbound', sender_type: 'user', type: 'text',
      body: text, status: 'pending', created_at: new Date().toISOString(),
    }]);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const j = await res.json();
      if (j.status === 'ok') {
        setMessages(prev => prev.map(m => m.id === tempId ? j.data : m));
        setConversations(prev => prev.map(c =>
          c.id === selectedId ? { ...c, last_message_preview: text, last_message_at: new Date().toISOString() } : c
        ));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    } finally { setSending(false); }
  };

  // ── AI Suggest ───────────────────────────────────────────────────────────────
  const handleAiSuggest = () => {
    setAiSuggestLoading(true);
    setTimeout(() => {
      setInputText('Sure! I\'d be happy to help you with more information. Could you please let me know what specific details you\'re looking for?');
      setAiSuggestLoading(false);
    }, 800);
  };

  // ── Filter Conversations ──────────────────────────────────────────────────────
  const filtered = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.profile_name.toLowerCase().includes(q) || c.last_message_preview.toLowerCase().includes(q);
    const matchTab = activeTab === 'all' || (activeTab === 'mine' && c.assigned_to) || (activeTab === 'unassigned' && !c.assigned_to);
    const matchSub = !subFilter || (subFilter === 'ai' && c.is_ai) || (subFilter === 'human' && !c.is_ai && c.status !== 'resolved') || (subFilter === 'resolved' && c.status === 'resolved');
    return matchSearch && matchTab && matchSub;
  });

  const counts = {
    all: conversations.length,
    mine: conversations.filter(c => c.assigned_to).length,
    unassigned: conversations.filter(c => !c.assigned_to).length,
    ai: conversations.filter(c => c.is_ai).length,
    human: conversations.filter(c => !c.is_ai && c.status !== 'resolved').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
  };

  const isDemo = selectedId?.startsWith('d');

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">

      {/* ── LEFT PANEL: Conversation List ─────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900">Conversations</h1>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all">
                <SquarePen className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 text-xs font-semibold mb-2">
            {([['all', `All (${counts.all})`], ['mine', `Mine (${counts.mine})`], ['unassigned', `Unassigned (${counts.unassigned})`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${activeTab === key ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sub-filter Tabs */}
          <div className="flex gap-1 text-xs">
            {([['ai', `AI Handling (${counts.ai})`], ['human', `Human (${counts.human})`], ['resolved', `Resolved (${counts.resolved})`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSubFilter(subFilter === key ? null : key)}
                className={`px-2 py-1 rounded-md transition-all font-medium ${subFilter === key ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-400"
              />
            </div>
            <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No conversations found</div>
          ) : (
            filtered.map(conv => {
              const active = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-all ${active ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full ${avatarColor(conv.profile_name)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {initials(conv.profile_name)}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-semibold truncate ${active ? 'text-blue-700' : 'text-gray-800'}`}>
                        {conv.profile_name}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] text-gray-500 truncate">{conv.last_message_preview}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {conv.is_ai && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-purple-100 text-purple-600">AI</span>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── MIDDLE PANEL: Chat View ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-white">
              <div className={`w-10 h-10 rounded-full ${avatarColor(selectedConv.profile_name)} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 relative`}>
                {initials(selectedConv.profile_name)}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{selectedConv.profile_name}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-green-500 font-medium">● Online</span>
                  <span>·</span>
                  <span>{selectedConv.phone_number}</span>
                  <span>·</span>
                  <span>India</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedConv.status} />
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all">
                  <UserCheck className="w-3.5 h-3.5" /> Assign
                </button>
                {/* AI Mode Toggle */}
                <button
                  onClick={() => setAiMode(!aiMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${aiMode ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600'}`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  AI Mode
                </button>
                <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#f5f6fa]">
              {/* Date separator */}
              <div className="flex items-center justify-center">
                <span className="text-[11px] text-gray-400 bg-gray-200 px-3 py-1 rounded-full font-medium">Today</span>
              </div>

              {loadingMsgs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                </div>
              ) : messages.length === 0 && !isDemo ? (
                <div className="text-center py-8 text-sm text-gray-400">No messages yet</div>
              ) : (
                messages.map(msg => {
                  const isOut = msg.direction === 'outbound';
                  const isAI = msg.sender_type === 'ai_agent';

                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      {!isOut && (
                        <div className={`w-7 h-7 rounded-full ${avatarColor(selectedConv.profile_name)} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2 mt-1`}>
                          {initials(selectedConv.profile_name)}
                        </div>
                      )}
                      <div className={`max-w-[65%] ${isOut ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div
                          className={`relative px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isOut
                              ? 'bg-[#e7f8ec] text-gray-900 rounded-tr-sm shadow-xs border border-green-200/40'
                              : 'bg-white text-gray-900 rounded-tl-sm shadow-xs border border-gray-100'
                          }`}
                        >
                          {isOut && isAI && (
                            <div className="absolute top-2.5 right-3 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span className="text-[10px] font-bold text-purple-600">AI</span>
                            </div>
                          )}
                          <div className={isOut && isAI ? 'pr-8' : ''}>
                            {msg.body}
                          </div>

                          {/* PDF attachment card */}
                          {msg.id === 'm4' && (
                            <div className="mt-3 bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-xs">
                              <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                  Data_Science_Brochure.pdf
                                </p>
                                <p className="text-[10px] text-gray-400">2.4 MB • PDF</p>
                              </div>
                              <button className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-1 text-[10px] text-gray-400 ${
                            isOut ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          {isOut && (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-2">
                {/* Left icons */}
                <div className="flex items-center gap-1 pb-2">
                  <button type="button" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button type="button" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                {/* Text input */}
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                    disabled={sending}
                  />
                </div>

                {/* Right buttons */}
                <div className="flex items-center gap-1.5 pb-1">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Template
                  </button>
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={aiSuggestLoading}
                    className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-600 hover:bg-purple-100 transition-all flex items-center gap-1.5"
                  >
                    {aiSuggestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Assist
                  </button>
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-white transition-all shadow-md shadow-blue-500/20"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a conversation to start
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Contact Details ─────────────────────────────────────── */}
      {selectedConv && (
        <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col overflow-y-auto">
          {/* Contact Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full ${avatarColor(selectedConv.profile_name)} flex items-center justify-center text-sm font-bold text-white`}>
                  {initials(selectedConv.profile_name)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedConv.profile_name}</p>
                  <p className="text-[11px] text-gray-400 font-medium">Lead • <span className="text-green-500">Active</span></p>
                </div>
              </div>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Detail Tabs */}
            <div className="flex text-xs font-semibold border-b border-gray-100">
              {['Details', 'Notes (3)', 'Activity', 'Files (2)'].map((tab, i) => (
                <button key={tab} className={`px-3 py-2 transition-all ${i === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
            {/* Lead Score */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lead Score</p>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-bold text-red-600">Hot Lead</span>
                </div>
                <span className="text-sm font-bold text-gray-900">87 <span className="text-xs text-gray-400 font-normal">/ 100</span></span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: '87%' }} />
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Information</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-xs text-gray-700">{selectedConv.phone_number}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3 h-3 text-blue-500" />
                  </div>
                  <span className="text-xs text-gray-700">{selectedConv.profile_name.toLowerCase().replace(' ', '.')}@gmail.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3 h-3 text-purple-500" />
                  </div>
                  <span className="text-xs text-gray-700">Bangalore, Karnataka</span>
                </div>
                <button className="flex items-center gap-1.5 text-xs text-blue-500 font-medium hover:text-blue-600 transition-colors mt-1">
                  <Users className="w-3 h-3" /> Add to contacts
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tags</p>
                <button className="text-[11px] text-blue-500 font-medium hover:text-blue-600">+ Add Tag</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Interested', 'Data Science', 'Demo Class', 'High Value'].map(tag => (
                  <span key={tag} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    tag === 'High Value' ? 'bg-orange-100 text-orange-600' :
                    tag === 'Data Science' ? 'bg-blue-100 text-blue-600' :
                    tag === 'Demo Class' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  }`}>{tag}</span>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">AI Summary</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed bg-purple-50 border border-purple-100 rounded-xl p-3">
                Customer is highly interested in the Data Science course. Asked about pricing and requested a demo class. Likely to convert if follow-up is done soon.
              </p>
            </div>

            {/* Assigned To */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned To</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">PP</div>
                  <span className="text-xs font-semibold text-gray-800">Priya Patel</span>
                </div>
                <button className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                  Change
                </button>
              </div>
            </div>

            {/* Lead Status */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lead Status</p>
              <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-xs font-semibold text-gray-700">Hot</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Actions */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Assign to Me', icon: UserCheck },
                  { label: 'Add Note', icon: FileText },
                  { label: 'Attach File', icon: Paperclip },
                  { label: 'More Actions', icon: ChevronDown },
                ].map(action => (
                  <button
                    key={action.label}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <action.icon className="w-3.5 h-3.5 text-gray-400" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
