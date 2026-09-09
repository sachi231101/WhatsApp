'use client';

import { useState } from 'react';
import {
  Bot,
  GraduationCap,
  TrendingUp,
  Headphones,
  UserCheck,
  FileText,
  Sliders,
  ShieldAlert,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Cpu,
  ArrowRight,
} from 'lucide-react';

interface AgentData {
  id: string;
  name: string;
  role: string;
  badge: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
  instructions: string;
  knowledgeSources: string[];
  behavior: string;
  escalationRule: string;
  samplePrompt: string;
  sampleReply: string;
}

const agents: AgentData[] = [
  {
    id: 'admissions',
    name: 'Admissions Agent',
    role: 'Student Intake & Course Advising',
    badge: 'Higher Ed & Bootcamps',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    description: 'Guides prospective applicants through prerequisites, tuition schedules, and schedules admissions interviews.',
    instructions: 'You are the Senior Admissions Advisor. Collect academic background, verify program prerequisites, and share scholarship deadlines with high empathy.',
    knowledgeSources: ['2026 Academic Catalog.pdf', 'Tuition & Payment Plans.docx', 'Faculty Interview Slots URL'],
    behavior: 'Warm, encouraging, informative. Never guesses enrollment requirements.',
    escalationRule: 'Escalate to Admissions Director if GPA < 2.5 exception requested or visa assistance required.',
    samplePrompt: 'Hi! Can I apply for the Master of Data Science program without a CS bachelor degree?',
    sampleReply: 'Yes, absolutely! Candidates from engineering, economics, or math backgrounds are eligible through our 3-week Python bridge module. Would you like me to reserve an interview with an academic counselor this Thursday?',
  },
  {
    id: 'sales',
    name: 'Sales Agent',
    role: 'Product Recommendation & Closing',
    badge: 'High-Conversion Commerce',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    description: 'Understands customer purchasing intent, recommends relevant SKUs, and sends secure payment links directly in WhatsApp.',
    instructions: 'Act as a consultative solution executive. Ask qualifying questions on team size and usage volume. Provide transparent tiered pricing and generate payment links.',
    knowledgeSources: ['Product Pricing Sheet 2026.csv', 'Case Studies & ROI Matrix.pdf', 'Stripe Billing Webhook Integration'],
    behavior: 'Direct, value-driven, concise. Focuses on customer ROI.',
    escalationRule: 'Escalate to Senior Account Executive if deal value exceeds $10,000 or custom security review requested.',
    samplePrompt: 'We need 50 seats for our logistics team in London. What discounts apply for upfront annual commitments?',
    sampleReply: 'For 50 enterprise seats billed annually, we offer a 25% discount plus complimentary dedicated onboarding. That brings your cost down to $38/seat/mo. Shall I send a customized proposal and checkout link to your email?',
  },
  {
    id: 'support',
    name: 'Support Agent',
    role: '24/7 Deflection & Troubleshooting',
    badge: 'Instant Tier 1 Resolution',
    icon: Headphones,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    description: 'Resolves technical questions, order status inquiries, and warranty checks instantly with zero hold time.',
    instructions: 'Diagnose user issues step-by-step. Query order status via CRM API. Deliver clear, bulleted troubleshooting instructions.',
    knowledgeSources: ['Technical Knowledge Base.md', 'Order Fulfillment API Docs', 'Returns & SLA Policy v4.pdf'],
    behavior: 'Patient, methodical, crystal-clear instructions.',
    escalationRule: 'Escalate to Engineering On-Call if API webhook latency > 5s or customer expresses high frustration.',
    samplePrompt: 'My WhatsApp webhook returned a 403 Forbidden error during production setup.',
    sampleReply: 'A 403 error during WhatsApp webhook setup typically occurs when the Meta App verify token does not match your environment config. Check that `FB_VERIFY_TOKEN` matches character-for-character in your Meta App Dashboard > Webhooks configuration.',
  },
  {
    id: 'lead-qual',
    name: 'Lead Qualification Agent',
    role: 'BANT Scorer & Meeting Scheduler',
    badge: 'Automated Pipeline Velocity',
    icon: UserCheck,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    description: 'Qualifies inbound WhatsApp prospects through Budget, Authority, Need, and Timeline before notifying account executives.',
    instructions: 'Systematically assess customer fit. Score readiness from 1-10. Instantly sync qualified leads to HubSpot and book calendar invites.',
    knowledgeSources: ['BANT Qualification Playbook.pdf', 'Executive Calendar Integrations', 'HubSpot Contact Fields Mapping'],
    behavior: 'Professional, courteous, polite discovery questions.',
    escalationRule: 'Instantly notify regional VP of Sales via Slack/SMS when a Fortune 500 company or >$50k budget is detected.',
    samplePrompt: 'We are evaluating new platforms to replace Zendesk for our 200 support agents by end of month.',
    sampleReply: 'Thank you for reaching out! With 200 agents, Wazzi App will reduce your per-seat software overhead by ~40% while doubling resolution speeds with autonomous AI. Are you available for a 20-minute architecture review tomorrow at 10 AM EST?',
  },
];

export default function AIAgentsShowcase() {
  const [selectedAgent, setSelectedAgent] = useState<AgentData>(agents[0]);

  return (
    <section id="ai-agents" className="py-20 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5" />
            <span>Autonomous Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            AI agents that understand your business.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Train specialized AI agents on your proprietary data, set strict enterprise guardrails, and let them
            collaborate alongside your human team around the clock.
          </p>
        </div>

        {/* Agent Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isSelected = selectedAgent.id === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-blue-50/60 border-blue-600 shadow-md shadow-blue-500/10 ring-1 ring-blue-600'
                    : 'bg-[#FAFAFC] border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl ${agent.bg} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${agent.color}`} />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-900">{agent.name}</h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{agent.role}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Agent Anatomy & Live Execution Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Configuration Architecture (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#FAFAFC] rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              {/* Agent Title & Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${selectedAgent.bg} flex items-center justify-center shadow-xs`}>
                    <selectedAgent.icon className={`w-6 h-6 ${selectedAgent.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedAgent.name}</h3>
                    <p className="text-xs text-slate-500">{selectedAgent.role}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  {selectedAgent.badge}
                </span>
              </div>

              {/* Configuration Fields Grid */}
              <div className="mt-6 space-y-4 text-xs">
                {/* 1. Role & Mission */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Role & Mission</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{selectedAgent.description}</p>
                </div>

                {/* 2. System Instructions */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>System Instructions & Guardrails</span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px] leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    &quot;{selectedAgent.instructions}&quot;
                  </p>
                </div>

                {/* 3. Knowledge Base */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span>Grounded Knowledge Sources (RAG)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.knowledgeSources.map((doc) => (
                      <span
                        key={doc}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px]"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4. Escalation Trigger */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span>Human Escalation Trigger</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{selectedAgent.escalationRule}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>Latency: ~850ms • Streaming Enabled</span>
              <span className="font-semibold text-blue-600 flex items-center gap-1">
                Zero Hallucination Guarantee <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </span>
            </div>
          </div>

          {/* Right: Real-World Conversation Simulation (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-slate-900/10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live WhatsApp Simulation
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Agent ID: {selectedAgent.id}-v2</span>
              </div>

              <div className="my-8 space-y-4">
                {/* Customer Inquiry */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block ml-1">Customer Inquiry</span>
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-100 leading-relaxed">
                    {selectedAgent.samplePrompt}
                  </div>
                </div>

                {/* AI Thought Process pill */}
                <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 w-fit">
                  <Cpu className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  <span>RAG Vector Search matched 3 knowledge chunks (Similarity: 0.94)</span>
                </div>

                {/* Agent Response */}
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-400 font-bold block ml-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" /> {selectedAgent.name} (Automated Reply)
                  </span>
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-4 text-xs leading-relaxed shadow-md shadow-blue-600/30">
                    {selectedAgent.sampleReply}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Sentiment: Positive (0.91)</span>
              <span className="text-emerald-400 font-semibold">Deflection: Successful</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
