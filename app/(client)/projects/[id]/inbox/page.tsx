'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Ably from 'ably';
import {
  Search,
  Bot,
  Send,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Sparkles,
  Loader2,
  Filter,
  Phone,
  Tag,
  Flame,
  ArrowLeft,
  User,
  Users,
  ChevronDown,
  Paperclip,
  Smile,
  Lock,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';

interface ConversationItem {
  id: string;
  contact_id: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  handling_mode: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'HYBRID';
  priority: string;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
  window_expires_at: string | null;
  resolved_at: string | null;
  escalation_reason: string | null;
  wa_id: string;
  phone_number: string;
  profile_name: string;
  avatar_url: string | null;
  lead_score?: number;
  created_at?: string;
  custom_attributes?: Record<string, unknown>;
}

interface TimelineMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'user' | 'ai_agent' | 'system';
  type: string;
  body: string | null;
  caption?: string | null;
  media_url?: string | null;
  status: 'queued' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string | null;
  meta_message_id?: string | null;
  is_internal?: boolean;
  sender_name?: string | null;
  created_at: string;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const getInitials = (name: string) =>
  (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function ProjectInboxPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  // Navigation / Mobile view states: 'list' | 'chat' | 'details'
  const [mobileTab, setMobileTab] = useState<'list' | 'chat' | 'details'>('list');

  // Filter & Search states
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'unread' | 'mine' | 'unassigned' | 'ai' | 'human' | 'resolved'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Status loading states
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Composer states
  const [composerText, setComposerText] = useState('');
  const [composerMode, setComposerMode] = useState<'whatsapp' | 'note'>('whatsapp');
  const [isSending, setIsSending] = useState(false);
  const [windowExpired, setWindowExpired] = useState(false);

  // Workspace context
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ablyClientRef = useRef<Ably.Realtime | null>(null);

  // 1. Load project context & current user
  useEffect(() => {
    async function loadInitialContext() {
      try {
        const [projRes, userRes, membersRes, waRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch('/api/auth/me'),
          fetch('/api/team'),
          fetch(`/api/projects/${projectId}/whatsapp`),
        ]);

        if (projRes.status === 404) {
          router.push('/projects');
          return;
        }

        const projJson = await projRes.json();
        if (projJson.status === 'ok' && projJson.data?.workspace_id) {
          setWorkspaceId(projJson.data.workspace_id);
        }

        const userJson = await userRes.json();
        if (userJson.user?.id) {
          setCurrentUserId(userJson.user.id);
        }

        const membersJson = await membersRes.json();
        if (membersJson.status === 'ok' && Array.isArray(membersJson.data)) {
          setMembers(membersJson.data);
        }

        if (waRes.ok) {
          const waJson = await waRes.json();
          const conn = waJson.data;
          setWhatsappConnected(Boolean(conn && conn.status === 'CONNECTED'));
        } else {
          setWhatsappConnected(false);
        }
      } catch (err) {
        console.error('Failed to load initial context:', err);
      }
    }
    loadInitialContext();
  }, [projectId, router]);

  // 2. Fetch conversations list
  const fetchConversations = useCallback(
    async (filterOverride?: string, searchOverride?: string) => {
      try {
        setLoadingConversations(true);
        const f = filterOverride !== undefined ? filterOverride : activeFilter;
        const s = searchOverride !== undefined ? searchOverride : searchQuery;

        const url = new URL(`/api/projects/${projectId}/inbox/conversations`, window.location.origin);
        url.searchParams.set('filter', f);
        if (s.trim()) url.searchParams.set('search', s.trim());

        const res = await fetch(url.toString());
        const json = await res.json();

        if (res.ok && json.status === 'ok') {
          setConversations(json.data || []);
          // Auto-select first conversation on desktop if none selected
          if (!selectedConversationId && json.data?.length > 0 && window.innerWidth >= 1024) {
            setSelectedConversationId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    },
    [projectId, activeFilter, searchQuery, selectedConversationId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations();
    }, 200);
    return () => clearTimeout(timer);
  }, [activeFilter, searchQuery, fetchConversations]);

  // 3. Fetch conversation details & messages timeline
  const fetchMessages = useCallback(
    async (convId: string, isInitial = true) => {
      try {
        if (isInitial) {
          setLoadingMessages(true);
        } else {
          setLoadingOlderMessages(true);
        }

        const url = new URL(
          `/api/projects/${projectId}/inbox/conversations/${convId}/messages`,
          window.location.origin,
        );
        if (!isInitial && nextMessageCursor) {
          url.searchParams.set('cursor', nextMessageCursor);
        }

        const [msgRes, convRes] = await Promise.all([
          fetch(url.toString()),
          fetch(`/api/projects/${projectId}/inbox/conversations/${convId}`),
        ]);

        const msgJson = await msgRes.json();
        const convJson = await convRes.json();

        if (convJson.status === 'ok' && convJson.data) {
          setSelectedConv(convJson.data);
          // Check 24-hour customer service window
          if (convJson.data.window_expires_at) {
            const isExpired = Date.now() > new Date(convJson.data.window_expires_at).getTime();
            setWindowExpired(isExpired);
          } else {
            setWindowExpired(false);
          }
        }

        if (msgRes.ok && msgJson.status === 'ok') {
          if (isInitial) {
            setMessages(msgJson.data || []);
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          } else {
            // Prepend older messages
            setMessages((prev) => [...(msgJson.data || []), ...prev]);
          }
          setNextMessageCursor(msgJson.nextCursor);
          setHasMoreMessages(Boolean(msgJson.hasMore));

          // Decrement unread in conversation list locally
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)),
          );
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      } finally {
        setLoadingMessages(false);
        setLoadingOlderMessages(false);
      }
    },
    [projectId, nextMessageCursor],
  );

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId, true);
    } else {
      setSelectedConv(null);
      setMessages([]);
    }
  }, [selectedConversationId, fetchMessages]);

  // 4. Ably Realtime WebSocket Connection
  useEffect(() => {
    if (!workspaceId || !projectId) {
      return () => {};
    }

    let ably: Ably.Realtime | null = null;
    const channelName = `workspace:${workspaceId}:project:${projectId}:inbox`;

    async function initAbly() {
      try {
        const tokenRes = await fetch('/api/ably-auth');
        const tokenData = await tokenRes.json();

        if (!tokenData || tokenData.enabled === false) {
          return;
        }

        ably = new Ably.Realtime({ authCallback: async (_, callback) => callback(null, tokenData) });
        ablyClientRef.current = ably;

        const channel = ably.channels.get(channelName);

        // New Message Received
        channel.subscribe('message.created', (msg) => {
          const payload = msg.data;
          if (payload?.conversationId === selectedConversationId && payload.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }

          // Update conversation list preview
          setConversations((prev) =>
            prev.map((c) =>
              c.id === payload.conversationId
                ? {
                    ...c,
                    last_message_preview: payload.message?.body || c.last_message_preview,
                    last_message_at: new Date().toISOString(),
                    unread_count:
                      payload.conversationId === selectedConversationId ? 0 : c.unread_count + 1,
                  }
                : c,
            ),
          );
        });

        // Message Delivery Status Update (sent, delivered, read, failed)
        channel.subscribe('message.status.updated', (msg) => {
          const { messageId, status, metaMessageId, error } = msg.data;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    status,
                    meta_message_id: metaMessageId || m.meta_message_id,
                    error_message: error || m.error_message,
                  }
                : m,
            ),
          );
        });

        // Internal Note Created
        channel.subscribe('note.created', (msg) => {
          const payload = msg.data;
          if (payload?.conversationId === selectedConversationId && payload.note) {
            setMessages((prev) => [...prev, payload.note]);
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }
        });

        // Conversation Updated / Assigned / Resolved
        channel.subscribe('conversation.updated', (msg) => {
          const payload = msg.data;
          setConversations((prev) =>
            prev.map((c) => (c.id === payload.conversationId ? { ...c, ...payload } : c)),
          );
          if (selectedConversationId === payload.conversationId) {
            setSelectedConv((prev) => (prev ? { ...prev, ...payload } : null));
          }
        });

        channel.subscribe('conversation.assigned', (msg) => {
          const { conversationId, assignedUserId, assignedUserName } = msg.data;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? { ...c, assigned_user_id: assignedUserId, assigned_user_name: assignedUserName }
                : c,
            ),
          );
          if (selectedConversationId === conversationId) {
            setSelectedConv((prev) =>
              prev
                ? {
                    ...prev,
                    assigned_user_id: assignedUserId,
                    assigned_user_name: assignedUserName,
                  }
                : null,
            );
          }
        });
      } catch (err) {
        console.warn('[InboxPage] Ably initialization notice:', err);
      }
    }

    initAbly();

    return () => {
      if (ably) {
        ably.close();
      }
    };
  }, [workspaceId, projectId, selectedConversationId]);

  // 5. Send message or internal note
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerText.trim() || !selectedConversationId || isSending) return;

    const content = composerText.trim();
    setComposerText('');
    setIsSending(true);

    try {
      if (composerMode === 'note') {
        // Internal Note
        const res = await fetch(
          `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/notes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          },
        );
        const json = await res.json();
        if (res.ok && json.status === 'ok') {
          // Optimistic local update handled via Ably or fallback
          const newNote: TimelineMessage = {
            id: json.data?.id || `note-${Date.now()}`,
            direction: 'inbound',
            sender_type: 'system',
            type: 'internal_note',
            body: content,
            status: 'delivered',
            is_internal: true,
            sender_name: 'You',
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newNote]);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      } else {
        // Outbound WhatsApp Customer Message
        const tempId = `temp-${Date.now()}`;
        const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Optimistic UI update: message appears with status 'queued'
        const optimisticMsg: TimelineMessage = {
          id: tempId,
          direction: 'outbound',
          sender_type: 'user',
          type: 'text',
          body: content,
          status: 'queued',
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);

        const res = await fetch(
          `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              type: 'text',
              idempotencyKey,
            }),
          },
        );

        const json = await res.json();

        if (res.ok && json.status === 'ok') {
          // Reconcile optimistic message with server response
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: json.data.id,
                    status: json.data.status || 'queued',
                  }
                : m,
            ),
          );
        } else {
          // Mark optimistic message as failed
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    status: 'failed',
                    error_message: json.error || 'Unable to send message. Please try again.',
                  }
                : m,
            ),
          );
          if (json.code === 'WHATSAPP_NOT_CONNECTED' || res.status === 409) {
            setWhatsappConnected(false);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // 6. Action Handlers: Takeover, Return to AI, Resolve, Reopen, Assign
  const handleTakeover = async () => {
    if (!selectedConversationId) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/handling-mode`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handlingMode: 'HUMAN_HANDLING' }),
        },
      );
      if (res.ok) {
        setSelectedConv((prev) => (prev ? { ...prev, handling_mode: 'HUMAN_HANDLING' } : null));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversationId ? { ...c, handling_mode: 'HUMAN_HANDLING' } : c,
          ),
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnToAI = async () => {
    if (!selectedConversationId) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/handling-mode`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handlingMode: 'AI_HANDLING' }),
        },
      );
      if (res.ok) {
        setSelectedConv((prev) => (prev ? { ...prev, handling_mode: 'AI_HANDLING' } : null));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversationId ? { ...c, handling_mode: 'AI_HANDLING' } : c,
          ),
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedConversationId || !selectedConv) return;
    setActionLoading(true);
    const newStatus = selectedConv.status === 'resolved' ? 'open' : 'resolved';
    try {
      const res = await fetch(
        `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (res.ok) {
        setSelectedConv((prev) => (prev ? { ...prev, status: newStatus } : null));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConversationId ? { ...c, status: newStatus } : c)),
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignUser = async (targetUserId: string | null) => {
    if (!selectedConversationId) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId }),
        },
      );
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setSelectedConv((prev) =>
          prev
            ? {
                ...prev,
                assigned_user_id: targetUserId,
                assigned_user_name: json.data?.assignedUserName || null,
              }
            : null,
        );
      }
    } catch (err) {
      console.error('Failed to assign user:', err);
    }
  };

  const handleRetryMessage = async (msgId: string) => {
    if (!selectedConversationId) return;
    try {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: 'queued', error_message: null } : m)),
      );

      await fetch(
        `/api/projects/${projectId}/inbox/conversations/${selectedConversationId}/messages/${msgId}/retry`,
        { method: 'POST' },
      );
    } catch (err) {
      console.error('Retry error:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#f8fafc]">
      {/* Top Banner Navigation */}
      <div className="h-12 border-b border-gray-200 bg-white px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Project Overview</span>
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-gray-900">WhatsApp Team Inbox</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Realtime
            </span>
          </div>
        </div>

        {/* Mobile View Switcher (Visible on < 1024px) */}
        <div className="flex lg:hidden items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setMobileTab('list')}
            className={`px-3 py-1 rounded-lg transition-all ${
              mobileTab === 'list' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
            }`}
          >
            Conversations
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            disabled={!selectedConversationId}
            className={`px-3 py-1 rounded-lg transition-all ${
              mobileTab === 'chat' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
            } disabled:opacity-40`}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileTab('details')}
            disabled={!selectedConversationId}
            className={`px-3 py-1 rounded-lg transition-all ${
              mobileTab === 'details' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
            } disabled:opacity-40`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Main 3-Column Inbox Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────────────── */}
        {/* COLUMN 1: Conversation List (Left)                                        */}
        {/* ─────────────────────────────────────────────────────────────────────────── */}
        <div
          className={`w-full lg:w-80 xl:w-96 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 ${
            mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'mine', label: 'Mine' },
                { id: 'unassigned', label: 'Unassigned' },
                { id: 'ai', label: 'AI' },
                { id: 'human', label: 'Human' },
                { id: 'resolved', label: 'Resolved' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversation List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loadingConversations ? (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-xs text-gray-500 font-medium">Loading conversations...</p>
              </div>
            ) : whatsappConnected === false ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-800">WhatsApp is not connected</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    Connect your WhatsApp account to start receiving and sending messages.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Link
                    href="/settings?tab=whatsapp"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-semibold rounded-xl shadow-2xs transition-all"
                  >
                    Connect WhatsApp
                  </Link>
                  <Link
                    href={`/projects/${projectId}/whatsapp`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    Project WhatsApp
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-800">No conversations yet</h4>
                  <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                    When customers message your connected WhatsApp number, conversations will appear
                    here in real time.
                  </p>
                </div>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === selectedConversationId;
                const isAi = c.handling_mode === 'AI_HANDLING';

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedConversationId(c.id);
                      setMobileTab('chat');
                    }}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                        {getInitials(c.profile_name || c.phone_number)}
                      </div>
                      {isAi ? (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs text-[9px]"
                          title="AI Handling"
                        >
                          <Bot className="w-2.5 h-2.5" />
                        </span>
                      ) : (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs text-[9px]"
                          title="Human Handling"
                        >
                          <User className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            isSelected ? 'font-bold text-blue-950' : 'font-semibold text-gray-900'
                          }`}
                        >
                          {c.profile_name || c.phone_number}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {timeAgo(c.last_message_at)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 truncate mb-1.5 leading-snug">
                        {c.last_message_preview || 'No messages yet'}
                      </p>

                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isAi
                              ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          }`}
                        >
                          {isAi ? 'AI' : 'Agent'}
                        </span>

                        {c.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow-2xs">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────── */}
        {/* COLUMN 2: Conversation Header & Timeline (Center)                          */}
        {/* ─────────────────────────────────────────────────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col bg-white overflow-hidden ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="h-16 border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {getInitials(selectedConv.profile_name || selectedConv.phone_number)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {selectedConv.profile_name || selectedConv.phone_number}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          selectedConv.handling_mode === 'AI_HANDLING'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {selectedConv.handling_mode === 'AI_HANDLING' ? 'AI Agent' : 'Human Agent'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate">
                      {selectedConv.phone_number}
                    </p>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-2">
                  {/* Take Over / Return to AI */}
                  {selectedConv.handling_mode === 'AI_HANDLING' ? (
                    <button
                      onClick={handleTakeover}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Take Over</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReturnToAI}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5 text-purple-600" />
                      <span>Return to AI</span>
                    </button>
                  )}

                  {/* Resolve / Reopen */}
                  <button
                    onClick={handleToggleStatus}
                    disabled={actionLoading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedConv.status === 'resolved'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedConv.status === 'resolved' ? 'Reopen' : 'Resolve'}</span>
                  </button>

                  {/* Info Toggle button for mobile */}
                  <button
                    onClick={() => setMobileTab('details')}
                    className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    title="Customer details"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* AI Escalation Banner (if applicable) */}
              {selectedConv.escalation_reason && (
                <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>AI requested human assistance:</strong>{' '}
                      {selectedConv.escalation_reason}
                    </span>
                  </div>
                  {selectedConv.handling_mode === 'AI_HANDLING' && (
                    <button
                      onClick={handleTakeover}
                      className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 shadow-2xs"
                    >
                      Take Conversation
                    </button>
                  )}
                </div>
              )}

              {/* Message Timeline */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8fafc]">
                {/* Older Messages Pagination Button */}
                {hasMoreMessages && (
                  <div className="text-center pt-1 pb-3">
                    <button
                      onClick={() =>
                        selectedConversationId && fetchMessages(selectedConversationId, false)
                      }
                      disabled={loadingOlderMessages}
                      className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {loadingOlderMessages ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Load older messages</span>
                    </button>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No messages in this conversation yet. Send a message below.
                  </div>
                ) : (
                  messages.map((m) => {
                    if (m.is_internal) {
                      // Internal Team Note
                      return (
                        <div
                          key={m.id}
                          className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 my-2 text-xs shadow-2xs max-w-xl mx-auto"
                        >
                          <div className="flex items-center justify-between text-amber-800 font-bold mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Internal Note • {m.sender_name || 'Team Member'}</span>
                            </span>
                            <span className="text-[10px] text-amber-600 font-normal">
                              {formatTime(m.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        </div>
                      );
                    }

                    const isOutbound = m.direction === 'outbound';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md lg:max-w-lg rounded-2xl p-3.5 text-xs shadow-2xs ${
                            isOutbound
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : 'bg-white text-gray-900 border border-gray-100 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{m.body}</p>

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isOutbound ? 'text-blue-100' : 'text-gray-400'
                            }`}
                          >
                            <span>{formatTime(m.created_at)}</span>

                            {isOutbound && (
                              <span className="inline-flex items-center ml-0.5">
                                {m.status === 'queued' && (
                                  <span title="Queued">
                                    <Clock className="w-3 h-3 text-blue-200" />
                                  </span>
                                )}
                                {m.status === 'sent' && (
                                  <span title="Sent to Meta">
                                    <Check className="w-3 h-3 text-blue-100" />
                                  </span>
                                )}
                                {m.status === 'delivered' && (
                                  <span title="Delivered to device">
                                    <CheckCheck className="w-3 h-3 text-blue-100" />
                                  </span>
                                )}
                                {m.status === 'read' && (
                                  <span title="Read by customer">
                                    <CheckCheck className="w-3 h-3 text-emerald-300" />
                                  </span>
                                )}
                                {m.status === 'failed' && (
                                  <span
                                    className="flex items-center gap-1 text-red-200 font-bold"
                                    title={m.error_message || 'Failed to deliver'}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Failed</span>
                                    <button
                                      onClick={() => handleRetryMessage(m.id)}
                                      className="underline hover:text-white ml-1 cursor-pointer"
                                    >
                                      Retry
                                    </button>
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* WhatsApp 24-Hour Policy Window Banner */}
              {windowExpired && composerMode === 'whatsapp' && (
                <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Free-form messages unavailable.</strong> Customer service window
                    expired. Use an approved WhatsApp template to restart the conversation.
                  </span>
                </div>
              )}

              {/* Message Composer */}
              <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
                {/* Composer Mode Tabs */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setComposerMode('whatsapp')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      composerMode === 'whatsapp'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    WhatsApp Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('note')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      composerMode === 'note'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>Internal Note (Team only)</span>
                  </button>
                </div>

                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div
                    className={`border rounded-2xl p-2.5 transition-all ${
                      composerMode === 'note'
                        ? 'bg-amber-50/40 border-amber-200 focus-within:ring-2 focus-within:ring-amber-500/20'
                        : 'bg-white border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20'
                    }`}
                  >
                    <textarea
                      rows={2}
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        composerMode === 'note'
                          ? 'Write an internal note for the team (never sent to WhatsApp)...'
                          : windowExpired
                          ? 'Free-form messages locked. Use template...'
                          : 'Write a message (Press Enter to send)...'
                      }
                      disabled={windowExpired && composerMode === 'whatsapp'}
                      className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-gray-400">
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                          title="Attach document"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                          title="Insert emoji"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          !composerText.trim() ||
                          isSending ||
                          (windowExpired && composerMode === 'whatsapp')
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                          composerMode === 'note'
                            ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
                            : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                        }`}
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{composerMode === 'note' ? 'Add Note' : 'Send'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">Select a conversation</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Choose a customer conversation from the list to view the full message timeline and
                  collaborate with your team.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────── */}
        {/* COLUMN 3: Customer & Context Panel (Right)                                */}
        {/* ─────────────────────────────────────────────────────────────────────────── */}
        <div
          className={`w-full lg:w-72 xl:w-80 border-l border-gray-200 bg-white p-5 overflow-y-auto space-y-6 flex-shrink-0 ${
            mobileTab === 'details' ? 'flex flex-col' : 'hidden xl:flex xl:flex-col'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Profile Card */}
              <div className="text-center space-y-2 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                  {getInitials(selectedConv.profile_name || selectedConv.phone_number)}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    {selectedConv.profile_name || selectedConv.phone_number}
                  </h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {selectedConv.phone_number}
                  </p>
                </div>
              </div>

              {/* Assignment Control */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Assigned Team Member
                </label>
                <select
                  value={selectedConv.assigned_user_id || ''}
                  onChange={(e) => handleAssignUser(e.target.value || null)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Unassigned</option>
                  {currentUserId && <option value={currentUserId}>Assign to Me</option>}
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Attributes */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Customer Information
                </span>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Lead Score</span>
                  <span className="font-bold text-gray-900 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>{selectedConv.lead_score ?? 50}/100</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">WhatsApp ID</span>
                  <span className="font-mono text-gray-900 truncate max-w-[120px]">
                    {selectedConv.wa_id}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Service Window</span>
                  <span
                    className={`font-bold ${
                      windowExpired ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {windowExpired ? 'Expired' : 'Active (24h)'}
                  </span>
                </div>
              </div>

              {/* Activity & Timestamps */}
              <div className="space-y-3 pt-2 border-t border-gray-100 text-xs">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Conversation Metadata
                </span>

                <div className="flex items-center justify-between text-gray-500">
                  <span>Status</span>
                  <span className="font-bold text-gray-800 uppercase">{selectedConv.status}</span>
                </div>

                <div className="flex items-center justify-between text-gray-500">
                  <span>Created</span>
                  <span className="text-gray-800">{timeAgo(selectedConv.created_at)}</span>
                </div>

                <div className="flex items-center justify-between text-gray-500">
                  <span>Last Activity</span>
                  <span className="text-gray-800">{timeAgo(selectedConv.last_message_at)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-4 text-xs text-gray-400">
              No conversation selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
