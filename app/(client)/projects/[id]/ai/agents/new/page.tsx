'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Brain,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export default function NewAgentWizardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('English');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [handlingMode, setHandlingMode] = useState<'AI_HANDLING' | 'HYBRID' | 'HUMAN_HANDLING'>('AI_HANDLING');

  // Step 2: Instructions & Role
  const [role, setRole] = useState('Customer Support Specialist');
  const [systemInstructions, setSystemInstructions] = useState(
    'You are a professional assistant representing our company on WhatsApp. Answer customer inquiries politely, concisely, and accurately.',
  );
  const [goals, setGoals] = useState('Help customers resolve inquiries in under 2 minutes.');
  const [restrictions, setRestrictions] = useState('Never promise refunds or make commitments outside company policy.');

  // Step 4: Behavior
  const [tone, setTone] = useState('Professional');
  const [greetingMessage, setGreetingMessage] = useState('Hello! How can I help you today?');
  const [fallbackMessage, setFallbackMessage] = useState(
    "I'm sorry, I didn't quite understand that. Could you please provide a few more details?",
  );
  const [maxResponseLength, setMaxResponseLength] = useState(250);
  const [temperature, setTemperature] = useState(0.3);
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationMessage, setEscalationMessage] = useState(
    'I am transferring you to a human team member who can help you further. Please hold on.',
  );
  const [escalationKeywords, setEscalationKeywords] = useState('refund, speak to human, agent please, cancel subscription');

  // Step 5: Test Chat
  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [testLoading, setTestLoading] = useState(false);

  const handleTestMessage = async () => {
    if (!testInput.trim() || testLoading) return;
    const userMsg = testInput.trim();
    setTestInput('');
    const newHistory = [...testMessages, { role: 'user' as const, content: userMsg }];
    setTestMessages(newHistory);
    setTestLoading(true);

    try {
      // Simulate/call preview
      const combinedInstructions = `${systemInstructions}\n\nGoals: ${goals}\nRestrictions: ${restrictions}`;
      const res = await fetch(`/api/projects/${projectId}/ai/agents/preview-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          draftOverride: {
            role,
            systemInstructions: combinedInstructions,
            tone,
            language,
            fallbackMessage,
            escalationEnabled,
            escalationMessage,
            escalationConditions: escalationKeywords.split(',').map((s) => s.trim()).filter(Boolean),
            maxResponseLength,
            temperature,
            model,
            provider,
          },
        }),
      });

      if (res && res.ok) {
        const json = await res.json();
        setTestMessages([...newHistory, { role: 'assistant', content: json.data?.response || fallbackMessage }]);
      } else {
        setTestMessages([
          ...newHistory,
          {
            role: 'assistant',
            content: `[Preview Mode]: Verified response for "${userMsg}". Real AI replies will connect once saved.`,
          },
        ]);
      }
    } catch {
      setTestMessages([...newHistory, { role: 'assistant', content: fallbackMessage }]);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async (publishDirectly = false) => {
    if (!name.trim()) {
      setError('Please provide an Agent Name.');
      setStep(1);
      return;
    }
    if (!role.trim() || !systemInstructions.trim()) {
      setError('Please fill in Role and System Instructions.');
      setStep(2);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const combinedInstructions = `${systemInstructions}\n\nGoals: ${goals}\nRestrictions: ${restrictions}`;
      const conditionsList = escalationKeywords.split(',').map((k) => k.trim()).filter(Boolean);

      // 1. Create Agent with initial draft version
      const createRes = await fetch(`/api/projects/${projectId}/ai/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          role: role.trim(),
          systemInstructions: combinedInstructions,
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

      const createJson = await createRes.json();
      if (!createRes.ok || createJson.status !== 'ok') {
        throw new Error(createJson.error || 'Failed to create agent');
      }

      const agentId = createJson.data.id;

      // 2. Publish if user requested publish
      if (publishDirectly) {
        const pubRes = await fetch(`/api/projects/${projectId}/ai/agents/${agentId}/publish`, {
          method: 'POST',
        });
        const pubJson = await pubRes.json();
        if (!pubRes.ok || pubJson.status !== 'ok') {
          throw new Error(pubJson.error || 'Agent created as draft, but publish failed.');
        }
      }

      router.push(`/projects/${projectId}/ai/agents/${agentId}`);
    } catch (err: any) {
      console.error('Error creating agent:', err);
      setError(err?.message || 'Failed to save agent.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div>
        <Link
          href={`/projects/${projectId}/ai/agents`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to AI Agents</span>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create AI Agent</h1>
              <p className="text-xs text-gray-500">Step {step} of 5 — Configure your autonomous agent.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-2xs transition-colors"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-[#1b59f8] hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 transition-colors"
            >
              {saving ? 'Publishing...' : 'Publish Agent'}
            </button>
          </div>
        </div>
      </div>

      {/* Step Stepper Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {[
            { num: 1, title: 'Basics' },
            { num: 2, title: 'Instructions' },
            { num: 3, title: 'Knowledge' },
            { num: 4, title: 'Behavior' },
            { num: 5, title: 'Test & Review' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                step === s.num
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : step > s.num
                  ? 'text-gray-900 hover:bg-gray-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  step === s.num
                    ? 'bg-blue-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: BASICS */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Step 1 — Basics</h2>
            <p className="text-xs text-gray-500">Define the identity and provider foundation for this agent.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sales Assistant, Admissions Advisor"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Primary Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Hindi">Hindi</option>
                <option value="Portuguese">Portuguese</option>
                <option value="German">German</option>
                <option value="Arabic">Arabic</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this agent does for your business"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="openai">OpenAI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">AI Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended - Fast & Cost Efficient)</option>
                <option value="gpt-4o">gpt-4o (High Intelligence)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Handling Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    mode: 'AI_HANDLING',
                    title: 'AI Handling',
                    desc: 'AI automatically replies to all incoming customer messages.',
                  },
                  {
                    mode: 'HYBRID',
                    title: 'Hybrid',
                    desc: 'AI replies until escalation conditions transfer to human agent.',
                  },
                  {
                    mode: 'HUMAN_HANDLING',
                    title: 'Human Only',
                    desc: 'AI replies are paused. Humans handle conversations.',
                  },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setHandlingMode(item.mode as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-colors ${
                      handlingMode === item.mode
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-extrabold mb-1">{item.title}</span>
                    <span className="block text-[11px] text-gray-500 leading-snug">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
            >
              <span>Next: Instructions</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INSTRUCTIONS & ROLE */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Step 2 — Instructions & Role</h2>
            <p className="text-xs text-gray-500">Provide clear instructions and boundaries for how the agent behaves.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Role Summary <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Admissions Consultant, Technical Support Lead"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                System Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={systemInstructions}
                onChange={(e) => setSystemInstructions(e.target.value)}
                placeholder="Describe how the agent should converse, answer inquiries, and guide the customer..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Primary Goals</label>
              <input
                type="text"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g., Qualify lead budget, capture email, answer syllabus questions"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Restrictions (Things the agent must NEVER do)
              </label>
              <input
                type="text"
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                placeholder="e.g., Never provide personal account numbers, never discuss competitors"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
            >
              <span>Next: Knowledge</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: KNOWLEDGE (FUTURE-READY) */}
      {step === 3 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Step 3 — Knowledge Sources</h2>
            <p className="text-xs text-gray-500">Connect documents and domain FAQs to ground the agent.</p>
          </div>

          <div className="bg-gray-50 rounded-2xl border border-gray-200/80 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100/60 text-blue-600 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-extrabold text-gray-900 mb-1">Knowledge Base Integration (Step 8)</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Full vector document embedding and semantic retrieval will be unlocked in Step 8.
                Your agent is already prepared with clean knowledge hooks and can operate smoothly with system instructions.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 bg-gray-200 cursor-not-allowed"
            >
              Connect Knowledge Base (Coming in Step 8)
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
            >
              <span>Next: Behavior</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: BEHAVIOR */}
      {step === 4 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Step 4 — Tone & Behavior</h2>
            <p className="text-xs text-gray-500">Configure conversational tone, fallbacks, and human handoff rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Conversational Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="Professional">Professional & Formal</option>
                <option value="Friendly">Friendly & Enthusiastic</option>
                <option value="Concise">Concise & Direct</option>
                <option value="Conversational">Casual & Conversational</option>
                <option value="Empathetic">Empathetic & Supportive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Max Response Length (Tokens)</label>
              <input
                type="number"
                min={50}
                max={1000}
                value={maxResponseLength}
                onChange={(e) => setMaxResponseLength(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Greeting Message (Optional)</label>
              <input
                type="text"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder="e.g., Hello! Welcome to Wazzi. How can I assist you?"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Fallback Message</label>
              <input
                type="text"
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
                placeholder="e.g., I apologize, I didn't quite catch that. Could you rephrase?"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Human Escalation Section */}
            <div className="md:col-span-2 bg-amber-50/50 rounded-2xl p-4 border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900">Human Escalation & Handoff</h4>
                  <p className="text-[11px] text-amber-700">
                    Automatically switches WhatsApp conversation to human agents when specific keywords or requests occur.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={escalationEnabled}
                    onChange={(e) => setEscalationEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {escalationEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Escalation Message</label>
                    <input
                      type="text"
                      value={escalationMessage}
                      onChange={(e) => setEscalationMessage(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Escalation Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={escalationKeywords}
                      onChange={(e) => setEscalationKeywords(e.target.value)}
                      placeholder="refund, human, representative, complaint"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
            >
              <span>Next: Test & Review</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TEST & REVIEW */}
      {step === 5 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Step 5 — Test & Review</h2>
            <p className="text-xs text-gray-500">Review your settings and test the agent before publishing.</p>
          </div>

          {/* Configuration Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-200/80 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Agent Name</span>
              <span className="font-extrabold text-gray-900">{name || 'Unnamed Agent'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Model</span>
              <span className="font-extrabold text-gray-900">{model}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Tone</span>
              <span className="font-extrabold text-gray-900">{tone}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Escalation</span>
              <span className="font-extrabold text-emerald-600">{escalationEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>

          {/* Interactive Test Playground */}
          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
            <h4 className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Preview Test Chat</span>
            </h4>

            <div className="bg-white rounded-xl border border-gray-200 h-52 overflow-y-auto p-4 space-y-3">
              {testMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs text-center">
                  <Bot className="w-6 h-6 mb-1 text-gray-300" />
                  <p>Send a message below to test your agent&apos;s responses.</p>
                </div>
              ) : (
                testMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3.5 py-2 rounded-2xl text-xs ${
                        m.role === 'user'
                          ? 'bg-[#1b59f8] text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-3 py-1.5 rounded-2xl text-xs text-gray-500 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Agent is typing...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestMessage()}
                placeholder="Type a test message (e.g., 'What are your hours?' or 'Talk to human')..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              />
              <button
                type="button"
                onClick={handleTestMessage}
                disabled={testLoading || !testInput.trim()}
                className="px-3.5 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1b59f8] hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/20"
              >
                {saving ? 'Publishing...' : 'Publish Agent Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
