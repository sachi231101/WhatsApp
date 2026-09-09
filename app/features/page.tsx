import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import FinalCTA from '@/components/marketing/FinalCTA';
import {
  MessageSquare,
  Bot,
  Zap,
  BarChart3,
  Megaphone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  Lock,
  RefreshCw,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features — Wazzi App',
  description:
    'Explore the full suite of Wazzi App features: Shared Inbox, Autonomous AI Agents, Visual Automation, Broadcast Campaigns, and Real-time Analytics on Meta WhatsApp Cloud API.',
};

export default function FeaturesPage() {
  const pillars = [
    {
      id: 'inbox',
      icon: MessageSquare,
      title: 'Shared Team Inbox',
      subtitle: 'Zero collision, full collaboration',
      description:
        'A high-performance workspace where human agents and AI collaborate. Assign conversations, leave internal notes, track SLAs, and resolve customer inquiries with full context.',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      features: [
        'Multi-agent conversation queue with collision detection',
        'Customer 360° sidebar with custom CRM attributes',
        'AI suggested reply drafts with 1-click insertion',
        'Internal team mentions and private discussion notes',
        'Conversation tagging, filters, and priority status rules',
      ],
    },
    {
      id: 'ai-agents',
      icon: Bot,
      title: 'Custom AI Agents & RAG Engine',
      subtitle: 'Grounding without hallucinations',
      description:
        'Deploy autonomous personas tailored to your brand voice. Ground your models in PDFs, web pages, and product catalogs to provide instant, sub-second responses 24/7.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200',
      features: [
        'Domain-specific agents (Sales, Support, Admissions, Lead Qual)',
        'Retrieval-Augmented Generation (RAG) vector search',
        'Strict guardrails, tone modulation, and forbidden topics',
        'Seamless human escalation triggers based on sentiment',
        'Real-time confidence scores and citation tracing',
      ],
    },
    {
      id: 'automations',
      icon: Zap,
      title: 'Visual Workflow Builder',
      subtitle: 'No-code event-driven orchestration',
      description:
        'Automate the operational heavy lifting behind every WhatsApp conversation. Route high-value leads, sync CRM data, trigger calendar invites, and alert teammates automatically.',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      features: [
        'Drag-and-drop node canvas with branching logic',
        'Inbound message entity detection & intent extraction',
        'Bi-directional webhooks and third-party CRM connectors',
        'Round-robin and skill-based team assignment',
        'Delayed drip messaging and smart re-engagement flows',
      ],
    },
    {
      id: 'campaigns',
      icon: Megaphone,
      title: 'Campaigns & Broadcasts',
      subtitle: 'Official Meta template marketing',
      description:
        'Reach opted-in customer segments at scale with 99%+ deliverability. Schedule personalized broadcasts, run re-engagement campaigns, and track click-through conversions.',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
      features: [
        'Official Meta template creation and approval sync',
        'Dynamic variables (name, order ID, custom attributes)',
        'Audience segmentation and tag-based filtering',
        'Real-time delivery, read, and response metrics',
        'Automatic opt-out and compliance handling',
      ],
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'Conversation Intelligence',
      subtitle: 'Data-driven business decisions',
      description:
        'Understand exactly what your messaging operations produce. Track resolution speeds, customer satisfaction, AI deflection efficiency, and pipeline conversion in real time.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      features: [
        'Real-time conversation volume and peak hour trends',
        'AI deflection rate vs. human agent workload',
        'Agent response time and SLA breach tracking',
        'Post-chat CSAT feedback and sentiment analytics',
        'Custom reporting exports and audit logging',
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Banner */}
        <section className="py-18 bg-gradient-to-b from-blue-50/40 via-white to-[#FAFAFC] border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Comprehensive Feature Tour</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              The complete platform for high-converting WhatsApp conversations.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Explore how Wazzi App combines Meta WhatsApp Business Cloud infrastructure, autonomous AI agents,
              team inbox collaboration, and workflow automation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/client/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
              >
                <span>Schedule a Demo</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Deep Dives */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              const isEven = index % 2 === 1;
              return (
                <div
                  key={pillar.id}
                  id={pillar.id}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-10 items-center ${
                    isEven ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Text Description (lg:col-span-6) */}
                  <div className={`lg:col-span-6 space-y-5 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                    <div className={`w-12 h-12 rounded-2xl ${pillar.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${pillar.color}`} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        {pillar.subtitle}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{pillar.title}</h2>
                    </div>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{pillar.description}</p>

                    <div className="space-y-2.5 pt-2">
                      {pillar.features.map((item) => (
                        <div key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feature Visual Card (lg:col-span-6) */}
                  <div className={`lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xl shadow-slate-900/5 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Architecture Highlight
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Production Ready
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <Cpu className="w-4 h-4 text-blue-600" />
                          <span>Wazzi Core Engine: {pillar.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Engineered on Next.js, official Meta Webhooks, and sub-second RAG embeddings. Built to
                          handle tens of thousands of simultaneous conversations without degradation.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white border border-slate-200 rounded-xl p-3">
                          <p className="font-bold text-slate-900">99.9% Uptime</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Tier 4 Cloud SLA</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3">
                          <p className="font-bold text-slate-900">&lt; 1.2s Latency</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Sub-second generation</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Enterprise Security Section */}
        <section className="py-16 bg-white border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Security &amp; Privacy First</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Enterprise security built into every layer.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We never use your proprietary customer conversations to train public foundation models. Your data
              remains strictly isolated within your encrypted tenant environment.
            </p>
          </div>
        </section>

        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
