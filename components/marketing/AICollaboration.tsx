import {
  Sparkles,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Bot,
  User,
  GitBranch,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function AICollaboration() {
  return (
    <section className="py-20 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI + Human Synergy</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            AI handles the conversation. Your team handles what matters.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Eliminate repetitive inquiries with instant AI deflection, while seamlessly passing complex negotiations
            and VIP accounts to human specialists with complete context.
          </p>
        </div>

        {/* Visual Flow Diagram */}
        <div className="bg-[#FAFAFC] rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xl shadow-slate-900/5">
          {/* Top: Inbound Flow Source */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-3 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Customer Message via WhatsApp</p>
                <p className="text-[11px] text-slate-500">Inbound question received &amp; evaluated in real time</p>
              </div>
            </div>

            <div className="w-0.5 h-8 bg-slate-300 my-1" />

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-6 py-2.5 shadow-md shadow-blue-500/20 flex items-center gap-2 text-xs font-bold">
              <Bot className="w-4 h-4" />
              <span>Wazzi AI Evaluation Engine (~150ms)</span>
            </div>
          </div>

          {/* Split Paths: Simple vs Complex */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Path 1: Simple Questions (100% Autonomous AI) */}
            <div className="bg-white rounded-2xl border-2 border-blue-500/40 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                    Path A: Routine / High Frequency
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> 78% of Inquiries
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">Simple Question = Instant AI Response</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Questions regarding pricing tables, operating hours, delivery tracking, return guidelines,
                  and syllabus prerequisites are answered immediately with zero wait time.
                </p>

                {/* Example box */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700">Customer:</p>
                  <p className="text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                    &quot;What are your international shipping rates to Singapore?&quot;
                  </p>
                  <p className="font-semibold text-blue-700">AI Response (&lt;1.2s):</p>
                  <p className="text-slate-700 bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                    &quot;We offer 3-day express courier to Singapore for $22, or complimentary freight on orders over $150.&quot;
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ticket Auto-Resolved • Team Time Saved</span>
              </div>
            </div>

            {/* Path 2: Complex / High-Value (Seamless Human Handoff) */}
            <div className="bg-white rounded-2xl border-2 border-indigo-500/40 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                    Path B: High-Value / Escalation
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Warm Agent Handoff
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">Complex Inquiries = Smart Human Handoff</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When a large enterprise opportunity or sensitive issue is detected, the AI silently pauses,
                  summarizes the customer intent, and alerts the designated specialist.
                </p>

                {/* Example box */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700">Customer:</p>
                  <p className="text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                    &quot;We need a custom Master Services Agreement with European data residency for 500 seats.&quot;
                  </p>
                  <p className="font-semibold text-indigo-700">AI Context Brief for Agent:</p>
                  <p className="text-slate-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 font-mono text-[11px]">
                    [VIP LEAD DETECTED]: 500 seats ($180k ARR). Assigned to Sarah Kim. Slack alert dispatched.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <UserCheck className="w-4 h-4" />
                <span>Human Takes Over With Full Conversation History</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
