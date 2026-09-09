import {
  MessageSquare,
  Bot,
  Zap,
  BarChart3,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  Cpu,
  Lock,
} from 'lucide-react';

export default function TrustSection() {
  const pillars = [
    {
      icon: MessageSquare,
      title: 'WhatsApp',
      subtitle: 'Official Meta Cloud API',
      description:
        'Enterprise-grade WhatsApp throughput with zero bans, verified business profile support, and real-time webhook resilience.',
      badge: 'Meta Certified',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      features: ['Official Cloud API Infrastructure', 'Green Tick Verification Ready', '99.9% Broadcast Deliverability'],
    },
    {
      icon: Bot,
      title: 'AI Agents',
      subtitle: 'Autonomous & Context-Aware',
      description:
        'Deploy custom agents trained on your documentation, FAQs, and product catalogs. Resolve inquiries with zero hallucinations.',
      badge: 'RAG Grounded',
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      iconBg: 'bg-indigo-500/10 text-indigo-600',
      features: ['Multi-Document Knowledge Retrieval', 'Custom Brand Tone & Guardrails', 'Sub-second Intent Detection'],
    },
    {
      icon: Zap,
      title: 'Automation',
      subtitle: 'Visual Workflow Engine',
      description:
        'Automate lead triage, CRM synchronization, appointment booking, and smart notifications without writing a single line of code.',
      badge: 'No-Code Builder',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      iconBg: 'bg-amber-500/10 text-amber-600',
      features: ['Multi-branch Conditional Logic', 'HubSpot / Webhook Webhooks', 'Automated Agent Escalations'],
    },
    {
      icon: BarChart3,
      title: 'Insights',
      subtitle: 'Real-Time Intelligence',
      description:
        'Know what your conversations are producing. Track team velocity, customer satisfaction, conversion funnels, and resolution rates.',
      badge: 'Executive BI',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-500/10 text-blue-600',
      features: ['Granular CSAT & Sentiment Scoring', 'AI Resolution Deflection Rate', 'Team SLA & Response Time Dashboards'],
    },
  ];

  const stats = [
    { value: '10M+', label: 'Conversations Processed', detail: 'Across high-scale businesses' },
    { value: '< 1.2s', label: 'Average AI Latency', detail: 'Instant customer deflection' },
    { value: '78.4%', label: 'Autonomous Resolution', detail: 'Zero human touch required' },
    { value: '99.9%', label: 'Infrastructure Uptime', detail: 'Tier-4 Meta cloud reliability' },
  ];

  return (
    <section className="py-20 bg-white border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tracking-wide uppercase">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>The Wazzi Core Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything your team needs to turn conversations into action.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            A unified conversational architecture engineered for reliability, enterprise security, and measurable
            business conversion.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group relative bg-[#FAFAFC] hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${pillar.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${pillar.badgeColor}`}>
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-0.5">{pillar.title}</h3>
                  <p className="text-xs font-semibold text-blue-600 mb-3">{pillar.subtitle}</p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">{pillar.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-200/60 space-y-2">
                  {pillar.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Stats Row */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 lg:p-10 shadow-xl shadow-slate-900/10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {stats.map((stat, idx) => (
              <div key={stat.label} className={`pt-4 lg:pt-0 ${idx > 0 ? 'lg:pl-8' : ''}`}>
                <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm font-bold text-slate-200">{stat.label}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.detail}</p>
              </div>
            ))}
          </div>

          {/* Compliance & Security Row */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Grade Security • End-to-End Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>SOC2 Type II & GDPR Standard Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Dedicated High-Throughput Cloud Meta Infrastructure</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
