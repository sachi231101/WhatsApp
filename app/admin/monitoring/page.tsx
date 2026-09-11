'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function MonitoringPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const r = await fetch('/api/admin/system/health'); const j = await r.json(); if (j.status === 'ok') setData(j.data); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;

  const iconFor = (status: string) => {
    if (status === 'Healthy') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (status === 'Warning') return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Activity className="w-6 h-6 text-emerald-400" /> System Monitoring</h1>
          <p className="text-xs text-white/40 mt-1">API • Database • Redis • Queue • Workers • WhatsApp API • Webhooks • AI Provider • Payment Gateway • Storage • System Errors</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-2 cursor-pointer"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((s) => (
          <div key={s.subsystem} className={`bg-[#11141f] border rounded-2xl p-5 flex gap-4 items-start ${s.status === 'Healthy' ? 'border-emerald-500/20' : s.status === 'Warning' ? 'border-amber-500/20' : 'border-red-500/20'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.status === 'Healthy' ? 'bg-emerald-500/10 border border-emerald-500/20' : s.status === 'Warning' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {iconFor(s.status)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">{s.subsystem}</p>
              <p className={`text-xs font-bold ${s.status === 'Healthy' ? 'text-emerald-400' : s.status === 'Warning' ? 'text-amber-400' : 'text-red-400'}`}>{s.status}</p>
              {s.latencyMs && <p className="text-[11px] text-white/30">{s.latencyMs}ms</p>}
              {s.error && <p className="text-[11px] text-white/40 mt-1">{s.error}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white">Example Status Table</h3>
        <div className="mt-3 space-y-2 font-mono text-xs">
          {data.map((s) => (
            <div key={s.subsystem + '-row'} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <span className="text-white/60">{s.subsystem.padEnd(18)}</span>
              <span className={`${s.status === 'Healthy' ? 'text-emerald-400' : s.status === 'Warning' ? 'text-amber-400' : 'text-red-400'} font-bold`}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
