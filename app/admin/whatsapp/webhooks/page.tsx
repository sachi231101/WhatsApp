'use client';

import { useEffect, useState } from 'react';
import { Webhook, AlertTriangle } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function WebhooksPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (status) qs.set('status', status);
      if (eventType) qs.set('eventType', eventType);
      const r = await fetch(`/api/admin/whatsapp/webhooks?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, status, eventType]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Webhook className="w-6 h-6 text-indigo-400" /> Webhook Monitoring</h1>
        <p className="text-xs text-white/40 mt-1">Incoming event • Event type • WABA • Phone • Workspace • Received • Processing • Queue • Retry • Error</p>
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-4">
        <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Flow</p>
        <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
          {['Webhook', 'Validate', 'Store Raw Event', 'Queue', 'Worker', 'Process', 'Database', 'AI/Automation'].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70">{s}</span>
              {i < 7 && <span className="text-white/20">→</span>}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-white/30 mt-2">Do not block webhook processing with expensive operations.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none">
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="processed">processed</option>
          <option value="failed">failed</option>
        </select>
        <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none">
          <option value="">All event types</option>
          <option value="messages">messages</option>
          <option value="message_template_status_update">template_status</option>
        </select>
      </div>

      <AdminTable
        columns={[
          { key: 'id', header: 'Event ID', render: (r) => <span className="font-mono text-[11px] text-white/60">{r.id.slice(0, 8)}…</span> },
          { key: 'event_type', header: 'Event', render: (r) => <span className="text-xs text-white">{r.event_type || r.field}</span> },
          { key: 'meta_waba_id', header: 'WABA', render: (r) => <span className="text-xs text-white/60">{r.meta_waba_id || '—'}</span> },
          { key: 'workspace_name', header: 'Workspace', render: (r) => <span className="text-xs text-white/60">{r.workspace_name || r.workspace_id?.slice(0, 8) || '—'}</span> },
          { key: 'received_at', header: 'Received', render: (r) => <span className="text-[11px] text-white/40">{r.received_at ? new Date(r.received_at).toLocaleString() : '—'}</span> },
          { key: 'processing_status', header: 'Processing', render: (r) => <AdminBadge variant={r.processing_status === 'failed' ? 'danger' : r.processing_status === 'pending' ? 'warning' : 'success'}>{r.processing_status}</AdminBadge> },
          { key: 'retry_count', header: 'Retry', render: (r) => <span className="text-xs text-white/60">{r.retry_count ?? r.attempts ?? 0}</span> },
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={15}
        total={total}
        onPageChange={setPage}
        onRefresh={load}
      />

      {data.some((d) => d.processing_status === 'failed') && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div><p className="text-sm font-bold text-amber-400">Failures detected</p><p className="text-xs text-white/60">Review failed events, check queue & workers. Retries are automatic via BullMQ.</p></div>
        </div>
      )}
    </div>
  );
}
