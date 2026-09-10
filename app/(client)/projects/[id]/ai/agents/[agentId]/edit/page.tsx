'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  HelpCircle,
  BookOpen,
  Send,
  Save,
  Rocket,
} from 'lucide-react';

export default function EditAgentDraftPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const agentId = params.agentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'basics' | 'instructions' | 'knowledge' | 'behavior'>('basics');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('English');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [handlingMode, setHandlingMode] = useState<'AI_HANDLING' | 'HYBRID' | 'HUMAN_HANDLING'>('AI_HANDLING');

  // Step 2: Instructions & Role
  const [role, setRole] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');

  // Step 4: Behavior
  const [tone, setTone] = useState('Professional');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [maxResponseLength, setMaxResponseLength] = useState(250);
  const [temperature, setTemperature] = useState(0.3);
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationMessage, setEscalationMessage] = useState('');
  const [escalationKeywords, setEscalationKeywords] = useState('');

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

        const agent = json.data?.agent || json.data;
        const draft = json.data?.draftVersion || json.data?.currentVersion;

        if (agent) {
          setName(agent.name || '');
          setDescription(agent.description || '');
          setHandlingMode(agent.handling_mode || agent.handlingMode || 'AI_HANDLING');
        }

        if (draft) {
          setRole(draft.role || '');
          setSystemInstructions(draft.system_instructions || draft.systemInstructions || '');
          setTone(draft.tone || 'Professional');
          setLanguage(draft.language || 'English');
          setProvider(draft.provider || 'openai');
          setModel(draft.model || 'gpt-4o-mini');
          setGreetingMessage(draft.greeting_message || draft.greetingMessage || '');
          setFallbackMessage(draft.fallback_message || draft.fallbackMessage || '');
          setMaxResponseLength(draft.max_response_length || draft.maxResponseLength || 250);
          setTemperature(Number(draft.temperature) || 0.3);
          setEscalationEnabled(draft.escalation_enabled ?? draft.escalationEnabled ?? true);
          setEscalationMessage(draft.escalation_message || draft.escalationMessage || '');

          const rawConds = draft.escalation_conditions || draft.escalationConditions;
          const conds = Array.isArray(rawConds) ? rawConds.join(', ') : '';
          setEscalationKeywords(conds);
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

  const handleSaveDraft = async () => {
    if (!name.trim()) {
      setError('Agent name is required');
      setActiveTab('basics');
      return;
    }
    if (!role.trim() || !systemInstructions.trim()) {
      setError('Role and system instructions are required');
      setActiveTab('instructions');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const conditionsList = escalationKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          role: role.trim(),
          systemInstructions: systemInstructions.trim(),
          tone,
          language,
          greetingMessage: greetingMessage.trim() || null,
          fallbackMessage: fallbackMessage.trim() || null,
          maxResponseLength,
          temperature,
          model,
          provider,
          handlingMode,
          escalationEnabled,
          escalationMessage: escalationMessage.trim() || null,
          escalationConditions: conditionsList,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to update draft');
      }

      setSuccessMessage('Draft saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      setError(null);

      // Save first
      await handleSaveDraft();

      const res = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/publish`, {
        method: 'POST',
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to publish agent');
      }

      router.push(`/projects/${projectId}/ai/agents/${agentId}`);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to publish agent');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-700">Loading agent configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href={`/projects/${projectId}/ai/agents/${agentId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Agent</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Edit Agent Draft</h1>
              <p className="text-xs text-gray-500">
                Modify draft configuration. Published versions remain unchanged until you publish.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/ai/agents/${agentId}/test`}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Playground</span>
          </Link>

          <button
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={saving || publishing}
            className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            <span>{publishing ? 'Publishing...' : 'Publish Version'}</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-1">
        {[
          { id: 'basics', label: '1. Basics & Identity', icon: Bot },
          { id: 'instructions', label: '2. Role & Instructions', icon: Sparkles },
          { id: 'knowledge', label: '3. Knowledge (Step 8)', icon: Brain },
          { id: 'behavior', label: '4. Behavior & Guardrails', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Basics */}
      {activeTab === 'basics' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Concierge"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary of what this agent handles..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Primary Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Hindi">Hindi</option>
                <option value="Arabic">Arabic</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Handling Mode
              </label>
              <select
                value={handlingMode}
                onChange={(e) => setHandlingMode(e.target.value as typeof handlingMode)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="AI_HANDLING">AI Autonomous Handling</option>
                <option value="HYBRID">Hybrid (AI + Human Escalation)</option>
                <option value="HUMAN_HANDLING">Human Only (AI Disabled)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="openai">OpenAI (Production)</option>
                <option value="gemini" disabled>
                  Google Gemini (Coming Soon)
                </option>
                <option value="anthropic" disabled>
                  Anthropic Claude (Coming Soon)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-Effective)</option>
                <option value="gpt-4o">GPT-4o (High Intelligence)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Instructions */}
      {activeTab === 'instructions' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Agent Role / Persona <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Customer Support Representative"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                System Instructions <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">Stored securely server-side</span>
            </div>
            <textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              rows={8}
              placeholder="Provide clear, detailed instructions for how the agent should handle customer inquiries..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Knowledge */}
      {activeTab === 'knowledge' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xs text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Knowledge Sources</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
            Connect PDF documents, FAQs, and web URLs to give this agent real-time context. Knowledge Base integration is scheduled for Step 8.
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 max-w-sm mx-auto text-xs text-gray-500 flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4 text-gray-400" />
            <span>No knowledge sources connected yet.</span>
          </div>
        </div>
      )}

      {/* Tab 4: Behavior */}
      {activeTab === 'behavior' && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Response Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly & Approachable</option>
                <option value="Concise">Concise & Direct</option>
                <option value="Conversational">Casual & Conversational</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Max Response Length (Words)
              </label>
              <input
                type="number"
                min={50}
                max={1000}
                value={maxResponseLength}
                onChange={(e) => setMaxResponseLength(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Greeting Message
            </label>
            <input
              type="text"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="e.g. Hello! Welcome to our service. How can I assist you today?"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Fallback Message
            </label>
            <input
              type="text"
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              placeholder="Sent when the AI is unsure or cannot process the request"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Human Escalation</h4>
                <p className="text-xs text-gray-500">
                  Automatically transfer conversation to a human agent when triggered
                </p>
              </div>
              <input
                type="checkbox"
                checked={escalationEnabled}
                onChange={(e) => setEscalationEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </div>

            {escalationEnabled && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                    Escalation Notice Message
                  </label>
                  <input
                    type="text"
                    value={escalationMessage}
                    onChange={(e) => setEscalationMessage(e.target.value)}
                    placeholder="e.g. I am transferring you to a human team member. Please hold on."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                    Escalation Trigger Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={escalationKeywords}
                    onChange={(e) => setEscalationKeywords(e.target.value)}
                    placeholder="refund, human, agent, complaint, speak to someone"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
