'use client';

import { useEffect, useState } from 'react';
import { FileSearch, Filter } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';

export default function AuditLogsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) qs.set('search', search);
      if (action) qs.set('action', action);
      const r = await fetch(`/api/admin/audit-logs?${qs}`);
      const j = await r.json();
      if (j.status === 'ok') { setData(j.data); setTotal(j.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, search, action]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><FileSearch className="w-6 h-6 text-indigo-400" /> Audit Logs</h1>
        <p className="text-xs text-white/40 mt-1">Login • Logout • User changes • Tenant changes • Plan/Sub/Payment/WhatsApp/AI/Permission • Admin actions • Tenant switching • Limit overrides</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none">
          <option value="">All actions</option>
          {['TENANT_CREATE','TENANT_UPDATE','TENANT_SUSPEND','TENANT_ACTIVATE','TENANT_SWITCH','USER_CREATE','USER_UPDATE','PLAN_CREATE','SUBSCRIPTION_ASSIGN','META_CONFIG_UPDATE','ADMIN_LOGIN'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-[11px] text-white/30">Every sensitive administrative action is auditable — stored in admin_audit_logs + audit_logs</span>
      </div>

      <AdminTable
        columns={[
          { key: 'created_at', header: 'Time', render: (r) => <span className="text-[11px] text-white/40 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</span> },
          { key: 'admin_email', header: 'Admin', render: (r) => <span className="text-xs text-white">{r.admin_email || r.admin_user_id?.slice(0, 8) || '—'}</span> },
          { key: 'action', header: 'Action', render: (r) => <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold whitespace-nowrap">{r.action}</span> },
          { key: 'entity_type', header: 'Entity', render: (r) => <span className="text-xs text-white/70">{r.entity_type}{r.entity_id ? ` • ${r.entity_id.slice(0, 8)}` : ''}</span> },
          { key: 'ip_address', header: 'IP', render: (r) => <span className="text-[11px] text-white/30 font-mono">{r.ip_address || '—'}</span> },
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={20}
        total={total}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search admin, action, entity…"
        onRefresh={load}
      />

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white">Retention</h3>
        <p className="text-xs text-white/40">Audit logs are immutable. Sensitive payload diffs (old→new) are stored as JSONB. For tenant-switch events, workspace & tenant IDs are captured.</p>
      </div>
    </div>
  );
}
