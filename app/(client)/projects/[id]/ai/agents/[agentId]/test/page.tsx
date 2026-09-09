'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Shield,
  Activity,
  Cpu,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  latency?: number;
  tokens?: { input: number; output: number; total: number };
  escalated?: boolean;
  escalationReason?: string | null;
}

export default function AgentPlaygroundPage() {
  const params = useParams();
  const projectId = params.id as string;
  const agentId = params.agentId as string;

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [testing, setTesting] = useState(false);

  // Debug Panel State (from latest interaction)
  const [latestDebug, setLatestDebug] = useState<{
    latency?: number;
    tokens?: { input: number; output: number; total: number };
    escalated?: boolean;
    escalationReason?: string | null;
    provider?: string;
    model?: string;
    status?: string;
    error?: string | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, testing]);

  useEffect(() => {
    async function loadAgent() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}`);
        const json = await res.json();

        if (!res.ok || json.status !== 'ok') {
          throw new Error(json.error || 'Failed to load agent');
        }

        setAgent(json.data.agent);
        const version = json.data.draftVersion || json.data.currentVersion;
        setActiveVersion(version);

        // Preload greeting if available
        if (version?.greeting_message) {
          setMessages([
            {
              id: 'msg-greeting',
              role: 'assistant',
              content: version.greeting_message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    }

    if (projectId && agentId) {
      loadAgent();
    }
  }, [projectId, agentId]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend !== undefined ? textToSend : input).trim();
    if (!messageContent || testing) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setTesting(true);

    try {
      const startTime = performance.now();
      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const clientLatency = Math.round(performance.now() - startTime);
      const json = await res.json();

      if (!res.ok || json.status !== 'ok') {
        const errorText = json.error || 'AI Provider Error';
        const fallback = activeVersion?.fallback_message || "I'm sorry, I am currently unable to process your request.";

        setMessages([
          ...newHistory,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: fallback,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            latency: clientLatency,
          },
        ]);

        setLatestDebug({
          latency: clientLatency,
          status: 'FAILED',
          error: errorText,
          provider: activeVersion?.provider,
          model: activeVersion?.model,
        });
        return;
      }

      const data = json.data;
      const asstMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency: data.latencyMs || clientLatency,
        tokens: data.usage
          ? {
              input: data.usage.inputTokens,
              output: data.usage.outputTokens,
              total: data.usage.totalTokens,
            }
          : undefined,
        escalated: data.shouldEscalate,
        escalationReason: data.escalationReason,
      };

      setMessages([...newHistory, asstMsg]);

      setLatestDebug({
        latency: data.latencyMs || clientLatency,
        tokens: data.usage
          ? {
              input: data.usage.inputTokens,
              output: data.usage.outputTokens,
              total: data.usage.totalTokens,
            }
          : undefined,
        escalated: data.shouldEscalate,
        escalationReason: data.escalationReason,
        provider: data.provider || activeVersion?.provider,
        model: data.model || activeVersion?.model,
        status: data.shouldEscalate ? 'ESCALATED' : 'SUCCESS',
        error: null,
      });
    } catch (err: unknown) {
      const fallback = activeVersion?.fallback_message || "I'm sorry, an unexpected error occurred.";
      setMessages([
        ...newHistory,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setLatestDebug({
        status: 'FAILED',
        error: (err as Error).message || 'Request failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearChat = () => {
    setMessages(
      activeVersion?.greeting_message
        ? [
            {
              id: 'msg-greeting',
              role: 'assistant',
              content: activeVersion.greeting_message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]
        : [],
    );
    setLatestDebug(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-700">Loading AI Playground...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Playground Error</h2>
          <p className="text-xs text-gray-500 mb-6">{error || 'Agent not found'}</p>
          <Link
            href={`/projects/${projectId}/ai/agents`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Agents</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}/ai/agents/${agentId}`}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900">{agent.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Playground Mode
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Isolated sandbox. Responses do NOT touch WhatsApp or customer records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            title="Reset sandbox chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Test</span>
          </button>
          <Link
            href={`/projects/${projectId}/ai/agents/${agentId}/edit`}
            className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Edit Draft</span>
          </Link>
        </div>
      </div>

      {/* 3-Column Playground Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Configuration Summary */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white p-6 overflow-y-auto hidden lg:block">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Agent Configuration</h2>

          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Role / Persona
              </span>
              <p className="text-xs font-semibold text-gray-900 line-clamp-2">
                {activeVersion?.role || 'Support Representative'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Model & Provider
              </span>
              <p className="text-xs font-mono font-bold text-blue-700">
                {activeVersion?.provider || 'openai'} / {activeVersion?.model || 'gpt-4o-mini'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Tone</span>
                <span className="text-xs font-bold text-gray-800">{activeVersion?.tone || 'Professional'}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Language
                </span>
                <span className="text-xs font-bold text-gray-800">{activeVersion?.language || 'English'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Escalation Trigger
              </span>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-gray-800">
                  {activeVersion?.escalation_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {activeVersion?.escalation_conditions && activeVersion.escalation_conditions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeVersion.escalation_conditions.slice(0, 4).map((cond: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-gray-200 text-[10px] font-mono text-gray-700"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Test Actions */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Quick Test Prompts
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleSendMessage('Hello! What services do you offer?')}
                  disabled={testing}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-[11px] font-semibold text-gray-700 transition-colors flex items-center justify-between"
                >
                  <span>General Greeting</span>
                  <Zap className="w-3 h-3 text-gray-400" />
                </button>
                <button
                  onClick={() => handleSendMessage('I want to speak to a real human manager right now.')}
                  disabled={testing}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 text-[11px] font-semibold text-gray-700 transition-colors flex items-center justify-between"
                >
                  <span>Test Escalation</span>
                  <Shield className="w-3 h-3 text-amber-500" />
                </button>
                <button
                  onClick={() => handleSendMessage('zxckjsdhuqwoir90234 random gibberish')}
                  disabled={testing}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/50 text-[11px] font-semibold text-gray-700 transition-colors flex items-center justify-between"
                >
                  <span>Test Fallback</span>
                  <AlertCircle className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Chat Simulator */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Sandbox AI Playground</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Send a message below to test your agent&apos;s responses, prompt instructions, and escalation rules.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {msg.escalated && (
                        <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                          <Shield className="w-3 h-3" />
                          <span>Escalated to Human ({msg.escalationReason || 'Keyword match'})</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-gray-400">
                      <span>{msg.timestamp}</span>
                      {msg.latency && (
                        <>
                          <span>•</span>
                          <span>{msg.latency}ms</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {testing && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-xs font-semibold text-gray-500">AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-gray-200 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a test customer message..."
                disabled={testing}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || testing}
                className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Debug & Telemetry Panel */}
        <div className="w-72 shrink-0 border-l border-gray-200 bg-white p-6 overflow-y-auto hidden xl:block">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Execution Telemetry</span>
          </h2>

          {latestDebug ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Last Status
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    latestDebug.status === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : latestDebug.status === 'ESCALATED'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {latestDebug.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                  {latestDebug.status === 'ESCALATED' && <Shield className="w-3 h-3" />}
                  {latestDebug.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                  <span>{latestDebug.status}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Response Latency</span>
                </span>
                <p className="text-base font-bold text-gray-900">{latestDebug.latency || 0} ms</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span>Token Consumption</span>
                </span>
                {latestDebug.tokens ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Input:</span>
                      <span className="font-mono font-bold text-gray-900">{latestDebug.tokens.input}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Output:</span>
                      <span className="font-mono font-bold text-gray-900">{latestDebug.tokens.output}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-bold border-t border-gray-200 pt-1">
                      <span>Total:</span>
                      <span className="font-mono">{latestDebug.tokens.total}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Tokens unavailable</p>
                )}
              </div>

              {latestDebug.error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <AlertCircle className="w-3 h-3" />
                    <span>Provider Warning</span>
                  </div>
                  <p className="text-[11px] font-mono leading-tight">{latestDebug.error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No execution telemetry yet. Send a test message to inspect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
