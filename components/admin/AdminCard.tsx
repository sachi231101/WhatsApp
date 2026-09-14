import React from 'react';

export function AdminStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'text-white',
  iconBg = 'bg-white/[0.06]',
  iconColor = 'text-white/60',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl px-5 py-4 hover:border-white/[0.10] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${iconBg} border border-white/[0.06] flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-extrabold tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="text-[11px] text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminSectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
