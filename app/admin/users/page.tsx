'use client';

import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Plus, Eye, Ban, CheckCircle2, Trash2, KeyRound, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AdminTable, AdminBadge } from '@/components/admin/AdminTable';
import { AdminModal, ConfirmDialog } from '@/components/admin/AdminModal';

export default function UsersPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ action: string; id: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'client', companyName: '', isSuperAdmin: false });
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (search) qs.set('search', search);
      if (roleFilter) qs.set('role', roleFilter);
      const res = await fetch(`/api/admin/users?${qs}`);
      const json = await res.json();
      if (json.status === 'ok') { setData(json.data); setTotal(json.total); }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, search, roleFilter]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === 'delete') await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      else if (action === 'suspend') await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'suspended' }) });
      else if (action === 'activate') await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
      setConfirm(null);
      load();
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.status === 'ok') { setShowCreate(false); setForm({ email: '', name: '', password: '', role: 'client', companyName: '', isSuperAdmin: false }); load(); }
      else alert(json.error || 'Failed');
    } catch {}
  };

  const viewUser = async (id: string) => {
    try { const r = await fetch(`/api/admin/users/${id}`); const j = await r.json(); if (j.status === 'ok') setDetail(j.data); } catch {}
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Users className="w-6 h-6 text-indigo-400" /> Users</h1>
          <p className="text-xs text-white/40 mt-1">Manage platform users • staff • roles & permissions • invitations • sessions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add User</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: '' },
          { label: 'Clients', value: 'client' },
          { label: 'Admins', value: 'admin' },
          { label: 'Staff', value: 'staff' },
        ].map((f) => (
          <button key={f.value || 'all'} onClick={() => setRoleFilter(f.value)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${roleFilter === f.value ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{f.label}</button>
        ))}
      </div>

      <AdminTable
        columns={[
          { key: 'email', header: 'User', render: (r) => <div><p className="font-semibold text-white">{r.name || '—'}</p><p className="text-[11px] text-white/40">{r.email}</p></div> },
          { key: 'role', header: 'Role', render: (r) => <span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${r.isSuperAdmin ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : r.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-white/[0.06] text-white/60 border-white/[0.08]'}`}>{r.isSuperAdmin ? 'Super Admin' : r.role}</span> },
          { key: 'status', header: 'Status', render: (r) => <AdminBadge variant={r.status === 'active' ? 'success' : r.status === 'suspended' ? 'danger' : 'default'}>{r.status}</AdminBadge> },
          { key: 'workspaces', header: 'Workspaces', render: (r) => <span className="text-white/60 text-xs">{r.workspaces?.length ?? 0}</span> },
          { key: 'created_at', header: 'Joined', render: (r) => <span className="text-white/40 text-[11px]">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span> },
          { key: 'actions', header: 'Actions', render: (r) => (
            <div className="flex items-center gap-1">
              <button onClick={() => viewUser(r.id)} className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/60 hover:text-white cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={() => setConfirm({ action: r.status === 'suspended' ? 'activate' : 'suspend', id: r.id })} className={`p-1.5 rounded-lg ${r.status === 'suspended' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'} cursor-pointer`}>{r.status === 'suspended' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}</button>
              <button onClick={() => setConfirm({ action: 'delete', id: r.id })} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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
        searchPlaceholder="Search email, name…"
        onRefresh={load}
      />

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && handleAction(confirm.action, confirm.id)} title={`${confirm?.action} user?`} variant={confirm?.action === 'delete' ? 'danger' : 'primary'} />

      <AdminModal open={showCreate} onClose={() => setShowCreate(false)} title="Add User" description="Create a new platform or client user">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/60">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required type="email" placeholder="user@company.com" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
            <div><label className="text-xs text-white/60">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          </div>
          <div><label className="text-xs text-white/60">Password</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required type="password" placeholder="••••••••" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/60">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full bg-[#11141f] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none"><option value="client">client</option><option value="admin">admin</option><option value="staff">staff</option></select></div>
            <div><label className="text-xs text-white/60">Company</label><input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Acme" className="mt-1 w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white outline-none" /></div>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer"><input type="checkbox" checked={form.isSuperAdmin} onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })} className="rounded" /> Super Admin</label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white/70 cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer">Create</button></div>
        </form>
      </AdminModal>

      <AdminModal open={!!detail} onClose={() => setDetail(null)} title={detail?.user?.email || 'User Detail'} maxWidth="max-w-xl">
        {detail && (
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-indigo-400" /></div>
              <div><p className="text-sm font-bold text-white">{detail.user.name}</p><p className="text-xs text-white/40">{detail.user.email} • {detail.user.role}{detail.user.isSuperAdmin ? ' • Super Admin' : ''}</p><p className="text-[11px] text-white/30">Status {detail.user.status} • Joined {new Date(detail.user.created_at).toLocaleString()}</p></div>
            </div>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Workspaces</p>
              {(detail.workspaces || []).length === 0 ? <p className="text-xs text-white/30">No workspaces</p> : (detail.workspaces || []).map((w: any) => <div key={w.id} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] mb-1"><p className="text-xs text-white">{w.name} • {w.slug}</p><p className="text-[11px] text-white/40">{w.tenant_name} • {w.role}</p></div>)}
            </div>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Reset Password</p>
              <ResetPasswordForm userId={detail.user.id} onDone={() => { setDetail(null); load(); }} />
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const json = await res.json();
      if (json.status === 'ok') { alert('Password reset'); onDone(); } else alert(json.error || 'Failed');
    } catch {} finally { setLoading(false); }
  };
  return (
    <form onSubmit={handle} className="flex gap-2">
      <input value={pw} onChange={(e) => setPw(e.target.value)} required type="password" placeholder="New password" className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none placeholder-white/30" />
      <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><KeyRound className="w-3.5 h-3.5" /> {loading ? '…' : 'Reset'}</button>
    </form>
  );
}
