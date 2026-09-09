import {
  Users,
  MessageSquare,
  Sparkles,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  Send,
  Sliders,
} from 'lucide-react';

export default function TeamSection() {
  const steps = [
    {
      num: '1',
      title: 'Conversation Initiated',
      desc: 'Inbound message received on your verified WhatsApp Business line.',
      badge: 'WhatsApp API',
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      num: '2',
      title: 'Automated Qualification',
      desc: 'AI assesses customer intent, company size, urgency, and sentiment.',
      badge: 'Intent Analysis',
      icon: Sparkles,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      num: '3',
      title: 'Lead Detected',
      desc: 'High-value criteria matched; deal created and contact enriched.',
      badge: 'CRM Sync',
      icon: CheckCircle2,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      num: '4',
      title: 'Assigned to Team',
      desc: 'Instant round-robin or skill-based routing to the designated account exec.',
      badge: 'Auto Routing',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      num: '5',
      title: 'Human Response',
      desc: 'Agent sends personalized response with AI draft copilot assistance.',
      badge: 'Sub-2m SLA',
      icon: Send,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <section className="py-20 bg-[#FAFAFC] border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>Intelligent Routing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Give every conversation the right owner.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Ensure no customer slips through the cracks. Automatically qualify, tag, and assign incoming
            conversations based on department, language, account tier, or availability.
          </p>
        </div>

        {/* 5-Step Journey Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono flex items-center justify-center">
                      {s.num}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {s.badge}
                    </span>
                  </div>

                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4.5 h-4.5 ${s.color}`} />
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center text-[10px] text-blue-600 font-semibold">
                  <span>Step {idx + 1} of 5</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
