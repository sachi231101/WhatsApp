'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Ably from 'ably';
import {
  MessageSquare,
  Search,
  Bot,
  Send,
  Phone,
  Clock,
  Check,
  CheckCheck,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Tag,
  PhoneCall,
  Loader2,
  RefreshCw,
  Calendar,
} from 'lucide-react';

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
  business_number?: string;
  phone_number_id?: string;
}

interface Message {
  id: string;
  meta_message_id?: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'user' | 'ai_agent' | 'system';
  type: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

export default function TeamInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'mine' | 'resolved'>('all');
  const [aiAutopilot, setAiAutopilot] = useState(true);
  const [callingActive, setCallingActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConv = conversations.find((c) => c.id === selectedId);

  // 1. Fetch Conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConv(true);
      const res = await fetch('/api/conversations');
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data)) {
        setConversations(json.data);
        if (json.data.length > 0 && !selectedId) {
          setSelectedId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Fetch Messages when Conversation changes
  useEffect(() => {
    if (!selectedId) return undefined;

    let isMounted = true;
    const loadMessages = async () => {
      try {
        setLoadingMsgs(true);
        const res = await fetch(`/api/conversations/${selectedId}/messages`);
        const json = await res.json();
        if (isMounted && json.status === 'ok' && Array.isArray(json.data)) {
          setMessages(json.data);
          // Mark unread as 0 locally
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setLoadingMsgs(false);
      }
    };

    loadMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Setup Ably Realtime listener
  useEffect(() => {
    let ablyClient: Ably.Realtime | null = null;
    let channel: any = null;

    const setupRealtime = async () => {
      try {
        ablyClient = new Ably.Realtime({
          authCallback: async (_, callback) => {
            try {
              const response = await fetch('/api/ably-auth');
              const tokenRequest = await response.json();
              callback(null, tokenRequest);
            } catch (error) {
              callback(error as any, null);
            }
          },
        });

        // Listen on default workspace channel or get-started
        channel = ablyClient.channels.get('get-started');
        channel.subscribe('first', () => {
          // Inbound webhook arrived - refresh active conversation
          if (selectedId) {
            fetch(`/api/conversations/${selectedId}/messages`)
              .then((r) => r.json())
              .then((data) => {
                if (data.status === 'ok') setMessages(data.data);
              })
              .catch(() => {});
          }
          fetchConversations();
        });
      } catch (err) {
        console.warn('Realtime subscription notice:', err);
      }
    };

    setupRealtime();

    return () => {
      if (channel) channel.unsubscribe();
      if (ablyClient) ablyClient.close();
    };
  }, [selectedId, fetchConversations]);

  // 4. Send Message Handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic message
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      direction: 'outbound',
      sender_type: 'user',
      type: 'text',
      body: textToSend,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });

      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? json.data : m))
        );
        // Update preview in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? { ...c, last_message_preview: textToSend, last_message_at: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  // AI Assistant Suggest Reply
  const handleAiSuggest = () => {
    const suggestions = [
      'Hello! Thanks for reaching out. Yes, our WhatsApp AI plan supports up to 10 automated agents with custom knowledge bases.',
      'Our team is ready to assist. Would you like to schedule a 15-minute live demo today?',
      'Your order has been confirmed and our dispatch team is processing it. Expect delivery within 24 hours!',
    ];
    const picked = suggestions[Math.floor(Math.random() * suggestions.length)];
    setInputText(picked);
  };

  const [aiBookingLoading, setAiBookingLoading] = useState(false);

  const handleAiBookDemoReply = async () => {
    if (!selectedId || aiBookingLoading) return;
    setAiBookingLoading(true);

    try {
      const res = await fetch('/api/ai/inbox-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedId,
          forceDemoBooking: true,
        }),
      });

      const json = await res.json();
      if (json.status === 'ok' && json.data?.message) {
        setMessages((prev) => [...prev, json.data.message]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? {
                  ...c,
                  last_message_preview: json.data.replyText || 'Demo booked',
                  last_message_at: new Date().toISOString(),
                }
              : c
          )
        );
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wazzapp:notification-update'));
        }
      }
    } catch (err) {
      console.error('Failed to book demo via AI in inbox:', err);
    } finally {
      setAiBookingLoading(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      (c.profile_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone_number || '').includes(searchQuery) ||
      (c.last_message_preview || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'resolved') return c.status === 'resolved';
    if (activeTab === 'ai') return c.last_message_preview?.toLowerCase().includes('ai');
    if (activeTab === 'mine') return c.status === 'open';
    return true;
  });

  // Calculate 24h window
  const isWindowOpen = (expiresAt?: string) => {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() > Date.now();
  };

  const getRemainingHours = (expiresAt?: string) => {
    if (!expiresAt) return '24h left';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${hours}h left`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0d0f15] text-white">
      {/* ─── LEFT: Conversation Threads ──────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#11131a]">
        {/* Search & Header */}
        <div className="p-3 border-b border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-400" />
              Team Inbox
            </h1>
            <button
              onClick={fetchConversations}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConv ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/30" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'mine', 'ai', 'resolved'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loadingConv && conversations.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-green-400" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-xs">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === selectedId;
              const open = isWindowOpen(c.window_expires_at);

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-green-500/10 border-l-2 border-green-400'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 border border-white/10">
                    {(c.profile_name || c.phone_number || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-white/90 truncate">
                        {c.profile_name || c.phone_number}
                      </p>
                      <span className="text-[10px] text-white/30">
                        {new Date(c.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-white/45 truncate mb-1">
                      {c.last_message_preview || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          open
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-orange-500/10 text-orange-400'
                        }`}
                      >
                        {open ? 'Care Window' : 'Window Closed'}
                      </span>

                      {c.unread_count > 0 && (
                        <span className="w-4 h-4 rounded-full bg-green-500 text-[10px] font-bold text-white flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── CENTER: Message Thread ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#0f1118]">
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between bg-[#13151d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-sm text-white">
                  {(selectedConv.profile_name || selectedConv.phone_number).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">
                      {selectedConv.profile_name || selectedConv.phone_number}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/15 text-green-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> WhatsApp
                    </span>
                  </div>
                  <p className="text-xs text-white/40">{selectedConv.phone_number}</p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/60">
                  <Clock className="w-3.5 h-3.5 text-green-400" />
                  <span>{getRemainingHours(selectedConv.window_expires_at)}</span>
                </div>

                <button
                  onClick={handleAiBookDemoReply}
                  disabled={aiBookingLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Ask AI to book a product demo for this contact"
                >
                  {aiBookingLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  AI Book Demo
                </button>

                <button
                  onClick={() => setCallingActive(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-xs font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  Voice Call
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMsgs ? (
                <div className="h-full flex items-center justify-center text-white/30 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-green-400" />
                  Loading conversation history...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/30 text-xs">
                  No messages yet. Start the conversation below!
                </div>
              ) : (
                messages.map((m) => {
                  const isInbound = m.direction === 'inbound';
                  const isAi = m.sender_type === 'ai_agent';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] text-white/30 mb-1 px-1">
                        {isInbound ? selectedConv.profile_name || 'Customer' : isAi ? '🤖 AI Agent' : 'You (Agent)'}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isInbound
                            ? 'bg-[#1b1e2b] text-white/90 rounded-tl-sm border border-white/[0.06]'
                            : isAi
                            ? 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-100 rounded-tr-sm border border-purple-500/20'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-md shadow-emerald-900/20'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>

                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-60">
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {!isInbound && (
                            <span>
                              {m.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                              ) : m.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : m.status === 'sent' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3 h-3" />
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

            {/* 24h Window Banner Warning if expired */}
            {!isWindowOpen(selectedConv.window_expires_at) && (
              <div className="mx-6 mb-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs text-orange-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>24h Care Window closed. Customer must initiate or you must send a pre-approved template.</span>
                </div>
                <button className="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 font-semibold text-[11px] transition-all">
                  Send Template
                </button>
              </div>
            )}

            {/* Composer Box */}
            <div className="p-4 border-t border-white/[0.06] bg-[#13151d]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] font-semibold text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Suggest Reply
                  </button>

                  <button
                    type="button"
                    onClick={handleAiBookDemoReply}
                    disabled={aiBookingLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {aiBookingLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    ) : (
                      <Bot className="w-3 h-3 text-emerald-400" />
                    )}
                    AI Book Demo & Reply
                  </button>
                </div>
                <span className="text-[10px] text-white/30">Press Enter to send</span>
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 focus:outline-none focus:border-green-500/50 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-xs text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-xs">
            <MessageSquare className="w-8 h-8 text-white/15 mb-2" />
            Select a conversation to start chatting
          </div>
        )}
      </div>

      {/* ─── RIGHT: Contact CRM & AI Settings ───────────────────────────────── */}
      {selectedConv && (
        <div className="w-72 flex-shrink-0 border-l border-white/[0.06] bg-[#11131a] p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Profile Card */}
          <div className="text-center pb-4 border-b border-white/[0.06]">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 mx-auto mb-2 flex items-center justify-center text-lg font-bold text-white border border-white/10">
              {(selectedConv.profile_name || selectedConv.phone_number).charAt(0).toUpperCase()}
            </div>
            <h3 className="text-sm font-bold text-white">{selectedConv.profile_name || 'Anonymous Contact'}</h3>
            <p className="text-xs text-white/40 mt-0.5">{selectedConv.phone_number}</p>
          </div>

          {/* AI Auto-Pilot Switch */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">AI Auto-Pilot</span>
              </div>
              <input
                type="checkbox"
                checked={aiAutopilot}
                onChange={(e) => setAiAutopilot(e.target.checked)}
                className="toggle accent-purple-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-purple-200/60 leading-relaxed">
              When enabled, AI automatically answers questions within 2 seconds.
            </p>
          </div>

          {/* CRM Attributes */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Contact Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-white/40">Status</span>
                <span className="text-green-400 font-medium capitalize">{selectedConv.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-white/40">WA ID</span>
                <span className="text-white/70 font-mono text-[11px]">{selectedConv.wa_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-white/40">Channel</span>
                <span className="text-white/70">WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-semibold">
                🔥 Hot Lead
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                SaaS Inbound
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Modal */}
      {callingActive && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141620] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <PhoneCall className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">WhatsApp Voice Call</h3>
            <p className="text-xs text-white/40 mb-6">{selectedConv?.profile_name || selectedConv?.phone_number}</p>
            <p className="text-xs text-white/60 mb-6 font-mono">WebRTC Calling connected via Meta Graph API</p>
            <button
              onClick={() => setCallingActive(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-semibold text-xs text-white transition-all shadow-lg shadow-red-900/40 cursor-pointer"
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
