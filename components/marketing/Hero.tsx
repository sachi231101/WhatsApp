'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Bot,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Clock,
  UserCheck,
  Send,
  Sliders,
  ChevronRight,
} from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-[#FAFAFC]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none overflow-hidden opacity-60">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-[450px] h-[450px] bg-indigo-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top announcement badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/80 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100/70 transition-colors">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Official Meta Cloud API Infrastructure</span>
            <span className="text-blue-300">•</span>
            <span className="text-slate-600 font-medium hidden sm:inline">Built for High-Growth Teams</span>
            <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
          </div>
        </div>

        {/* Hero Copy */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            Turn WhatsApp conversations into your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
              business engine.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            Connect WhatsApp, automate conversations, empower your team with AI, and turn every
            customer interaction into measurable business outcomes.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/client/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all active:scale-98"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition-all"
            >
              <span>See How It Works</span>
            </Link>
          </div>

          {/* Quick trust proofs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Verified Meta Tech Provider</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Setup in under 5 minutes</span>
            </div>
          </div>
        </div>

        {/* Product Visual: Wazzi SaaS Product Showcase */}
        <div className="mt-14 lg:mt-18 relative max-w-5xl mx-auto">
          {/* Subtle glow border */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500/15 via-indigo-500/20 to-blue-600/15 rounded-3xl blur-xl opacity-70" />

          {/* App Window Frame */}
          <div className="relative bg-white rounded-2xl lg:rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 overflow-hidden">
            {/* Window titlebar */}
            <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                </div>
                <div className="h-4 w-px bg-slate-200 mx-2" />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>wazzi-workspace.app/inbox</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  WhatsApp API Connected
                </span>
                <span className="hidden sm:inline">Active Workspace: Acme Global</span>
              </div>
            </div>

            {/* Wazzi App Workspace Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px] bg-slate-50/50">
              {/* Column 1: Conversations List (md:col-span-5) */}
              <div className="md:col-span-5 bg-white border-r border-slate-200/80 flex flex-col">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Shared Team Queue
                    </h2>
                    <p className="text-[11px] text-slate-400">14 active • 3 pending assignment</p>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
                    SLA 99.4%
                  </span>
                </div>

                {/* List items */}
                <div className="divide-y divide-slate-100">
                  {/* Selected Item */}
                  <div className="p-3.5 bg-blue-50/40 border-l-4 border-blue-600 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          MC
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Michael Chen</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                              Enterprise Lead
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                            Looking to integrate WhatsApp API for 40 support agents...
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-slate-400">Just now</span>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-amber-700 font-medium">SLA 2m</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Item */}
                  <div className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          ER
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Elena Rostova</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.2 rounded">
                              AI Autonomous
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                            AI Agent answered: Catalog pricing & bulk order discounts
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">4m ago</span>
                    </div>
                  </div>

                  {/* Third Item */}
                  <div className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          DS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">David Silva</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                              Assigned: Sarah
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                            Payment link verified. Booking onboarding call.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">12m ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Active Thread & AI Copilot Workspace (md:col-span-7) */}
              <div className="md:col-span-7 flex flex-col justify-between bg-[#FAFAFC] p-4 sm:p-5">
                {/* Active Thread Header */}
                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      MC
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Michael Chen</span>
                        <span className="text-[10px] text-slate-400 font-mono">+1 (415) 890-2341</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online on WhatsApp
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-500">Routing: Sales / High-Tier</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Take Over</span>
                    </button>
                  </div>
                </div>

                {/* Conversation Body */}
                <div className="my-4 space-y-3">
                  {/* Customer Message */}
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-1">
                      MC
                    </div>
                    <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm p-3 shadow-2xs">
                      <p className="text-xs text-slate-800 leading-relaxed">
                        Hello! We are currently handling 8,000 monthly inquiries on WhatsApp across 4 countries.
                        Does Wazzi App support multi-agent assignment, AI knowledge base grounding, and CRM webhooks?
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1">10:42 AM</span>
                    </div>
                  </div>

                  {/* AI Copilot Draft Card (Linear-style smart suggestion) */}
                  <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white rounded-2xl border border-blue-200/80 p-3.5 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>AI Copilot Suggested Response</span>
                        <span className="text-[10px] bg-blue-100/80 text-blue-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                          98% Grounding Confidence
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">Source: Enterprise Specs Doc</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-white/80 rounded-xl p-2.5 border border-blue-100">
                      &quot;Hi Michael! Yes, Wazzi App provides high-throughput Meta Cloud API connectivity,
                      multi-agent department routing, strict RAG knowledge grounding for instant deflection,
                      and bi-directional CRM syncing. I can generate a tailored trial workspace for your team today.&quot;
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Generated in 0.8s via Sales Intelligence Agent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                          Regenerate
                        </button>
                        <button className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-500/20 transition-all">
                          Insert & Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Composer Area */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 shadow-2xs flex items-center gap-2">
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                    <Sliders className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    readOnly
                    value="Type a message or press '/' for AI prompts & templates..."
                    className="flex-1 text-xs text-slate-400 bg-transparent focus:outline-none cursor-default"
                  />
                  <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
