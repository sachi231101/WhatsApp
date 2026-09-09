import {
  Zap,
  MessageSquare,
  Sparkles,
  GitFork,
  ArrowDown,
  Database,
  Calendar,
  Send,
  UserCheck,
  CheckCircle,
  Play,
  Settings2,
} from 'lucide-react';

export default function AutomationShowcase() {
  return (
    <section id="automation" className="py-20 bg-[#FAFAFC] border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Visual Workflow Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Automate the work behind every conversation.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Build intelligent event-driven workflows that qualify leads, sync your CRM, trigger webhooks,
            and route complex issues to the right human experts.
          </p>
        </div>

        {/* Visual Node-Based Workflow Canvas */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 sm:p-10 relative overflow-hidden">
          {/* Subtle Grid Canvas Background */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#0F172A 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Workflow Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-100 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Triage & Calendar Reservation Flow</h3>
                <p className="text-xs text-slate-500">Trigger: Real-time WhatsApp Inbound Webhook</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Workflow Active
              </span>
              <span className="text-xs font-mono text-slate-400">Run count: 12,482</span>
            </div>
          </div>

          {/* Connected Nodes Flow */}
          <div className="space-y-6 relative z-10 flex flex-col items-center">
            {/* Node 1: Trigger */}
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-400 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  01 • Trigger
                </span>
                <span className="text-[11px] text-slate-400">Source: Meta Cloud API</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">New WhatsApp Message Received</h4>
                  <p className="text-[11px] text-slate-500">Inbound message payload captured via webhook</p>
                </div>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-300" />
              <ArrowDown className="w-4 h-4 text-slate-400 -my-1" />
            </div>

            {/* Node 2: AI Intent Classification */}
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-indigo-400 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  02 • AI Intelligence
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Intent: High-Value Demo
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Detect Intent & Extract Entities</h4>
                  <p className="text-[11px] text-slate-500">AI classifies inquiry: Enterprise Demo &amp; Team &gt; 20</p>
                </div>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-300" />
              <ArrowDown className="w-4 h-4 text-slate-400 -my-1" />
            </div>

            {/* Node 3: Condition Branch */}
            <div className="w-full max-w-md bg-amber-50/50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                  03 • Condition Logic
                </span>
                <span className="text-[11px] text-slate-500">Evaluate Priority Score</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <GitFork className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Is Lead Priority &gt;= Tier 1?</h4>
                  <p className="text-[11px] text-slate-600">Branching paths based on CRM deal size &amp; timeline</p>
                </div>
              </div>
            </div>

            {/* Split Branch Visual */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Branch A: High Value Outcome */}
              <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-4 shadow-sm space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Branch: Yes (Tier 1 Priority)
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Immediate VIP Routing</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <Database className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>Enrich CRM &amp; create deal in HubSpot</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Generate dynamic meeting booking link</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-emerald-50 text-emerald-900 font-semibold p-2 rounded-lg border border-emerald-200/60">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Assign to Enterprise Rep (Sarah) + Send SMS alert</span>
                  </div>
                </div>
              </div>

              {/* Branch B: Routine / Autonomous Outcome */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Branch: No (Routine Inquiry)
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">100% Autonomous</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span>AI Support Agent drafts grounded response</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <Send className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>Send WhatsApp response in &lt;1.2 seconds</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Log conversation transcript &amp; auto-resolve</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
