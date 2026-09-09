import {
  Smartphone,
  Sliders,
  Zap,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Connect',
      subtitle: 'Connect WhatsApp Business',
      description:
        'Connect your official WhatsApp Business Account in under 3 minutes via Meta Embedded Signup. Keep your existing numbers or provision new dedicated channels.',
      icon: Smartphone,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      bullets: ['Meta Embedded Signup', 'Zero Number Downtime', 'Instant Webhook Sync'],
    },
    {
      step: '02',
      title: 'Configure',
      subtitle: 'Configure AI agents & knowledge',
      description:
        'Upload your product catalogs, FAQs, and support policies. Define system prompts, personas, and custom guardrails for each agent.',
      icon: Sliders,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200',
      bullets: ['PDF & URL Knowledge Ingestion', 'Persona & Voice Customization', 'Strict Guardrail Rules'],
    },
    {
      step: '03',
      title: 'Automate',
      subtitle: 'Build workflows & routing rules',
      description:
        'Design visual conditional flows for lead qualification, instant calendar booking, CRM data syncing, and department escalation.',
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      bullets: ['Visual Drag-and-Drop Builder', 'HubSpot & Webhook Actions', 'Smart Round-Robin Routing'],
    },
    {
      step: '04',
      title: 'Grow',
      subtitle: 'Measure conversations & scale',
      description:
        'Monitor conversation volume, deflection efficiency, agent SLAs, and revenue conversions with comprehensive real-time dashboards.',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      bullets: ['Live CSAT & Sentiment Tracking', 'Team Velocity & Resolution Times', 'Full Audit Logs & Exports'],
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#FAFAFC] border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>Simple 4-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How Wazzi works
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            From official WhatsApp connectivity to autonomous AI resolution in minutes. No complex code
            or lengthy enterprise onboarding required.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-slate-200 font-mono">{s.step}</span>
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="text-xs font-semibold text-blue-600 mb-2">{s.subtitle}</p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">{s.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {s.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-14 text-center">
          <Link
            href="/client/register"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:gap-3"
          >
            <span>Get Started in 5 Minutes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
