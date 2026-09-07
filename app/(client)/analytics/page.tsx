'use client';

import {
  BarChart3,
  Clock,
  CheckCircle2,
  Bot,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Analytics & Performance Insights
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Monitor response speeds, AI resolution ratios, and campaign conversion rates.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-white/70 hover:text-white transition-all">
          <Clock className="w-3.5 h-3.5" />
          Past 30 Days
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: '42,910', change: '+18.4%', icon: MessageSquare, color: 'text-blue-400' },
          { label: 'Delivery Rate', value: '98.8%', change: '+0.6%', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'AI Resolution Ratio', value: '68.4%', change: '+14.2%', icon: Bot, color: 'text-purple-400' },
          { label: 'Avg First Response', value: '1.4 min', change: '-42s', icon: Clock, color: 'text-yellow-400' },
        ].map((m) => (
          <div key={m.label} className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <m.icon className={`w-5 h-5 ${m.color}`} />
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> {m.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{m.value}</p>
            <p className="text-xs text-white/40">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-1">Message Volume by Time of Day</h3>
          <p className="text-xs text-white/40 mb-6">Peak traffic occurs between 2:00 PM and 6:00 PM IST.</p>

          <div className="h-44 flex items-end gap-3 pt-6 border-b border-white/[0.06]">
            {[
              { time: '9 AM', height: '40%' },
              { time: '11 AM', height: '65%' },
              { time: '1 PM', height: '55%' },
              { time: '3 PM', height: '95%' },
              { time: '5 PM', height: '85%' },
              { time: '7 PM', height: '70%' },
              { time: '9 PM', height: '35%' },
            ].map((bar) => (
              <div key={bar.time} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full bg-gradient-to-t from-cyan-600 to-blue-500 rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: bar.height }}
                />
                <span className="text-[10px] text-white/30">{bar.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Breakdown */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-1">Resolution Breakdown</h3>
          <p className="text-xs text-white/40 mb-6">Autonomous AI handling vs Human operator handoffs.</p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/80 font-medium">🤖 Autonomous AI Resolution</span>
                <span className="text-purple-400 font-bold">68.4%</span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '68.4%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/80 font-medium">👤 Human Agent Assisted</span>
                <span className="text-emerald-400 font-bold">24.2%</span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '24.2%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/80 font-medium">⚡ Escalated to Senior Sales</span>
                <span className="text-yellow-400 font-bold">7.4%</span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '7.4%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
