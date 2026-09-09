import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  DollarSign,
  ArrowUpRight,
  Smile,
  ShieldCheck,
} from 'lucide-react';

export default function AnalyticsShowcase() {
  const metrics = [
    {
      label: 'Total Conversations',
      value: '48,250',
      change: '+18.4%',
      trend: 'up',
      detail: 'Past 30 days via WhatsApp',
    },
    {
      label: 'AI Autonomous Resolution',
      value: '78.4%',
      change: '+6.2%',
      trend: 'up',
      detail: 'Resolved with zero human touch',
    },
    {
      label: 'Avg Response Time',
      value: '1.2 sec',
      change: '-68%',
      trend: 'up',
      detail: 'AI latency vs 4.8m human SLA',
    },
    {
      label: 'Qualified Pipeline',
      value: '$420,000',
      change: '+32.1%',
      trend: 'up',
      detail: '3,412 leads captured & routed',
    },
  ];

  const agentLeaderboard = [
    { name: 'AI Admissions Agent', resolved: '14,210', csat: '4.95 / 5', time: '0.9s' },
    { name: 'Sarah Kim (Enterprise AE)', resolved: '412', csat: '4.98 / 5', time: '2.1m' },
    { name: 'AI Support Agent', resolved: '22,940', csat: '4.89 / 5', time: '1.1s' },
    { name: 'David Silva (Support Lead)', resolved: '684', csat: '4.92 / 5', time: '3.4m' },
  ];

  return (
    <section id="analytics" className="py-20 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Business Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Know what your conversations are actually producing.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Real-time analytics reveal deflection rates, lead conversion velocity, agent response times,
            and customer sentiment across all your connected numbers.
          </p>
        </div>

        {/* Dashboard Container */}
        <div className="bg-[#FAFAFC] rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-900/5 space-y-8">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{m.label}</span>
                  <span className="inline-flex items-center text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                    <ArrowUpRight className="w-3 h-3" /> {m.change}
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{m.value}</p>
                <p className="text-[11px] text-slate-400">{m.detail}</p>
              </div>
            ))}
          </div>

          {/* Charts & Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Volume Trends Chart Visual (lg:col-span-7) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Conversation Volume &amp; AI Deflection</h3>
                    <p className="text-xs text-slate-400">Total volume vs. Automated AI Resolution over time</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    Last 30 Days
                  </span>
                </div>

                {/* Simulated Bar Chart Visual */}
                <div className="pt-6 pb-2">
                  <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 px-2">
                    {[
                      { day: 'W1', total: 60, ai: 45 },
                      { day: 'W2', total: 75, ai: 60 },
                      { day: 'W3', total: 85, ai: 68 },
                      { day: 'W4', total: 92, ai: 74 },
                      { day: 'W5', total: 100, ai: 82 },
                      { day: 'W6', total: 110, ai: 90 },
                    ].map((bar) => (
                      <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          {/* Total volume bar */}
                          <div
                            style={{ height: `${bar.total}%` }}
                            className="w-full max-w-[20px] bg-slate-200 rounded-t-sm hover:bg-slate-300 transition-colors"
                            title={`Total Volume: ${bar.total * 100}`}
                          />
                          {/* AI resolved bar */}
                          <div
                            style={{ height: `${bar.ai}%` }}
                            className="w-full max-w-[20px] bg-blue-600 rounded-t-sm hover:bg-blue-700 transition-colors"
                            title={`AI Resolved: ${bar.ai * 100}`}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">{bar.day}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-xs bg-slate-300" />
                      <span>Total Inbound WhatsApp Volume</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-xs bg-blue-600" />
                      <span>Autonomous AI Resolution</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Peak Traffic: 11:00 AM – 3:00 PM UTC</span>
                <span className="font-semibold text-emerald-600">Deflection Efficiency: 94.2%</span>
              </div>
            </div>

            {/* Right: Team Performance Leaderboard (lg:col-span-5) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Performance &amp; CSAT</h3>
                    <p className="text-xs text-slate-400">Agent &amp; AI model efficiency</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5" /> 4.93 Avg CSAT
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {agentLeaderboard.map((item) => (
                    <div key={item.name} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-400">{item.resolved} conversations</p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-emerald-600">{item.csat}</span>
                        <p className="text-[10px] text-slate-400">Avg {item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Real-time SLA compliance
                </span>
                <span className="font-semibold text-slate-900">99.8% on target</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
