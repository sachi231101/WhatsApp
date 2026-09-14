'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, Eye, Ban, CheckCircle2, Trash2, CreditCard, ExternalLink, Plus, Search } from 'lucide-react';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';
import { AdminModal, ConfirmDialog } from '@/components/admin/AdminModal';

function TenantsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get('status') || '';
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showActions, setShowActions] = useState<any>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; action: string; id: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', plan: 'starter', status: 'active' });

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search) qs.set('search', search);
      if (statusFilter) qs.set('status', statusFilter);
      const res = await fetch(`/api/admin/tenants?${qs}`);
      const json = await res.json();
      if (json.status === 'ok') { setData(json.data); setTotal(json.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, search, statusFilter]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === 'delete') {
        await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
      } else {
        const statusMap: any = { suspend: 'suspended', activate: 'active' };
        await fetch(`/api/admin/tenants/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: statusMap[action], reason: `Admin ${action}` }) });
      }
      setConfirm(null);
      load();
    } catch {}
  };

  const handleSwitch = async (tenantId: string) => {
    try {
      const res = await fetch('/api/admin/switch-tenant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId }) });
      const json = await res.json();
      if (json.status === 'ok') window.location.href = '/dashboard';
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm) });
      const json = await res.json();
      if (json.status === 'ok') { setShowCreate(false); setCreateForm({ name: '', slug: '', plan: 'starter', status: 'active' }); load(); }
      else alert(json.error || 'Failed to create');
    } catch {}
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-400" /> Tenants / Businesses</h1>
          <p className="text-xs text-white/40 mt-1">Manage all tenant businesses • Tenants → Workspaces → Projects hierarchy</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> New Tenant</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: '' },
          { label: 'Active', value: 'active' },
          { label: 'Trial', value: 'trial' },
          { label: 'Suspended', value: 'suspended' },
          { label: 'Deleted', value: 'deleted' },
        ].map((f) => (
          <button
            key={f.value || 'all'}
            onClick={() => { const u = new URL(window.location.href); if (f.value) u.searchParams.set('status', f.value); else u.searchParams.delete('status'); router.push(u.pathname + (u.search ? '?' + u.searchParams.toString() : '')); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${statusFilter === f.value ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08] hover:bg-white/[0.10]'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'name', header: 'Business', render: (r) => <div><p className="font-semibold text-white">{r.name}</p><p className="text-[11px] text-white/40">{r.slug} • {r.plan}</p></div> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'active' ? 'success' : r.status === 'suspended' ? 'danger' : r.status === 'trial' ? 'warning' : 'default'}>{r.status}</AdminBadge> },
          { key: 'workspaceCount', header: 'Workspaces', render: (r) => <span className="text-white/70">{r.workspaceCount ?? 0}</span> },
          { key: 'members', header: 'Members', render: (r) => <span className="text-white/70">{r.members ?? 0}</span> },
          { key: 'created_at', header: 'Created', render: (r) => <span className="text-white/40 text-[11px]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span> },
          { key: 'actions', header: 'Actions', render: (r) => (
            <div className="flex items-center gap-1">
              <Link href={`/admin/tenants/${r.id}`} className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/60 hover:text-white" title="View"><Eye className="w-3.5 h-3.5" /></Link>
              <button onClick={() => handleSwitch(r.id)} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400" title="Switch to Tenant"><ExternalLink className="w-3.5 h-3.5" /></button>
              <button onClick={() => setConfirm({ open: true, action: r.status === 'suspended' ? 'activate' : 'suspend', id: r.id })} className={`p-1.5 rounded-lg ${r.status === 'suspended' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'} `} title={r.status === 'suspended' ? 'Activate' : 'Suspend'}>{r.status === 'suspended' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}</button>
              <button onClick={() => setConfirm({ open: true, action: 'delete', id: r.id })} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )},
        ]}
        data={data}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search business, slug…"
        onRefresh={load}
      />

      <ConfirmDialog
        open={!!confirm?.open}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && handleAction(confirm.action, confirm.id)}
        title={`${confirm?.action === 'delete' ? 'Delete' : confirm?.action === 'suspend' ? 'Suspend' : 'Activate'} tenant?`}
        description={confirm?.action === 'delete' ? 'Tenant will be soft-deleted (status=deleted) and can be restored.' : `Tenant status will be set to ${confirm?.action === 'suspend' ? 'suspended' : 'active'}.`}
        confirmLabel={confirm?.action === 'delete' ? 'Delete' : confirm?.action === 'suspend' ? 'Suspend' : 'Activate'}
        variant={confirm?.action === 'delete' ? 'danger' : 'primary'}
      />

      <AdminModal open={showCreate} onClose={() => setShowCreate(false)} title="New Tenant" description="Create a new tenant business">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/70">Name</label>
            <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Acme Corp" required className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Slug</label>
            <input value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} placeholder="acme-corp" required className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/70">Plan</label>
              <select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                <option value="starter">starter</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/70">Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                <option value="active">active</option>
                <option value="trial">trial</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 hover:text-white cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold cursor-pointer">Create</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/40 text-xs">Loading tenants...</div>}>
      <TenantsContent />
    </Suspense>
  );
}
