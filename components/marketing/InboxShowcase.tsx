'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Users,
  Sparkles,
  UserCheck,
  Tag,
  Clock,
  Send,
  Sliders,
  CheckCircle2,
  Paperclip,
  Smile,
  Shield,
  Phone,
  Building,
  DollarSign,
  Calendar,
  Layers,
} from 'lucide-react';

export default function InboxShowcase() {
  const [activeTab, setActiveTab] = useState<'copilot' | 'context' | 'routing'>('copilot');

  return (
    <section id="inbox-showcase" className="py-20 bg-[#FAFAFC] border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Shared Team Workspace</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            One inbox. Your entire team.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Unify all customer conversations across agents, departments, and AI models into a collaborative
            cockpit with instant context and zero lost messages.
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'copilot'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ✨ AI Copilot & Suggested Responses
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'context'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            👤 Rich Customer Context & 360° Profile
          </button>
          <button
            onClick={() => setActiveTab('routing')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'routing'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⚡ Dynamic Assignment & Human Takeover
          </button>
        </div>

        {/* The 3-Column Shared Inbox Concept Visual */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 overflow-hidden">
          {/* Top Bar of Inbox */}
          <div className="bg-slate-50/90 border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-900">WhatsApp Production WABA</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-medium">Auto-Assignment: Active (Round Robin)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-1.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  JD
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  SK
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  AM
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  +5
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-600">8 Agents Online</span>
            </div>
          </div>

          {/* Main 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            {/* Column 1: Conversations List (lg:col-span-4) */}
            <div className="lg:col-span-4 border-r border-slate-200/80 flex flex-col bg-white">
              {/* Filter controls */}
              <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg">All (28)</span>
                  <span className="px-2.5 py-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer">
                    My Leads (6)
                  </span>
                  <span className="px-2.5 py-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer">
                    AI Active (14)
                  </span>
                </div>
              </div>

              {/* Chat list */}
              <div className="divide-y divide-slate-100 overflow-y-auto">
                {/* Active thread */}
                <div className="p-4 bg-blue-50/50 border-l-4 border-blue-600 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        SR
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900">Sophia Reyes</p>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">+1 555-019-2834</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                      Hot Lead
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-2 line-clamp-2 leading-relaxed font-medium">
                    &quot;Can we book an enterprise demonstration for next Tuesday? We have 12 reps ready.&quot;
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Sparkles className="w-3 h-3 text-emerald-500" /> AI Qualified • 98%
                    </span>
                    <span className="font-semibold text-slate-500">2 min ago</span>
                  </div>
                </div>

                {/* Second thread */}
                <div className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        AL
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Alexandre Laurent</p>
                        <p className="text-[11px] text-slate-500 font-mono">+33 6 12 34 56 78</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      Support
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-1">
                    AI Support Agent resolved question on webhook delivery specs.
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-blue-600 font-medium">AI Resolved • Auto-closed</span>
                    <span>14 min ago</span>
                  </div>
                </div>

                {/* Third thread */}
                <div className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                        NK
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Nadia Khan</p>
                        <p className="text-[11px] text-slate-500 font-mono">+44 20 7946 0912</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      Billing
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-1">
                    Requested VAT invoice copy for Q3 annual subscription.
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-slate-500">Assigned: Mark Jensen</span>
                    <span>45 min ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Active Chat Conversation & AI Copilot (lg:col-span-5) */}
            <div className="lg:col-span-5 border-r border-slate-200/80 flex flex-col justify-between bg-slate-50/40 p-4">
              {/* Header */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    SR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">Sophia Reyes</p>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                        VIP Tier
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">VP Operations at Nexa Logistics</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Human Takeover</span>
                  </button>
                </div>
              </div>

              {/* Chat messages */}
              <div className="my-4 space-y-3">
                {/* Incoming WhatsApp message */}
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-1">
                    SR
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm p-3 shadow-2xs text-xs text-slate-800 leading-relaxed">
                    &quot;Can we book an enterprise demonstration for next Tuesday? We have 12 reps ready. Also, can we
                    bring our existing Twilio/WhatsApp number over?&quot;
                    <span className="block text-[10px] text-slate-400 mt-1">11:15 AM • WhatsApp</span>
                  </div>
                </div>

                {/* AI Assistant draft block */}
                <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border border-blue-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>AI Smart Suggestion</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono font-bold">
                        99% Confident
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Knowledge: Porting & Pricing</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white rounded-xl p-2.5 border border-blue-100">
                    &quot;Hi Sophia! Absolutely. You can seamlessly port your existing WhatsApp business number to Wazzi App
                    with zero downtime using Meta Embedded Signup. I have reserved Tuesday at 2:00 PM EST for your 12
                    reps. Would you like me to send the calendar invite?&quot;
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> Drafted in 0.6s
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        Edit
                      </button>
                      <button className="text-xs font-semibold text-white px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-500/20 transition-all">
                        Insert & Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Composer */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button className="hover:text-slate-700 transition-colors flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" /> Attach
                    </button>
                    <button className="hover:text-slate-700 transition-colors flex items-center gap-1">
                      <Smile className="w-3.5 h-3.5" /> Emoji
                    </button>
                    <button className="hover:text-blue-600 transition-colors flex items-center gap-1 text-blue-600 font-medium">
                      <Sparkles className="w-3.5 h-3.5" /> AI Polish
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">Shift + Enter for new line</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="Hi Sophia! Absolutely. You can seamlessly port your existing..."
                    className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none cursor-default"
                  />
                  <button className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Customer Context & 360° Profile (lg:col-span-3) */}
            <div className="lg:col-span-3 bg-white p-4 flex flex-col justify-between">
              <div>
                {/* Profile Card */}
                <div className="text-center pb-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-blue-500/20">
                    SR
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Sophia Reyes</h3>
                  <p className="text-xs text-slate-500">VP Operations, Nexa Logistics</p>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                      Tier 1 Enterprise
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
                      High Intent
                    </span>
                  </div>
                </div>

                {/* Attributes */}
                <div className="py-4 space-y-3 border-b border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Pipeline Value
                    </span>
                    <span className="font-bold text-slate-900">$36,000 / yr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" /> Team Size
                    </span>
                    <span className="font-semibold text-slate-700">450+ Employees</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp WABA
                    </span>
                    <span className="font-mono text-slate-700">+1 555-019-2834</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Next Action
                    </span>
                    <span className="text-blue-600 font-semibold">Demo Scheduled</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="pt-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Applied Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      HubSpot Synced
                    </span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      Porting Inquiry
                    </span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      Multi-Region
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment Box */}
              <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      SK
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900">Sarah Kim</p>
                      <p className="text-[10px] text-slate-500">Enterprise Account Exec</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Assigned
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
