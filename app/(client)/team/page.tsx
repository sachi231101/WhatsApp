'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  Eye,
  Mail,
  User,
  Trash2,
} from 'lucide-react';

type Role = 'Owner' | 'Manager' | 'Agent' | 'Viewer';
type Status = 'Active' | 'Inactive';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  role: Role;
  status: Status;
}

const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Sachin Kumar',
    email: 'sachin@abcacademy.com',
    initials: 'SK',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    role: 'Owner',
    status: 'Active',
  },
  {
    id: 'tm-2',
    name: 'Rahul Sharma',
    email: 'rahul@abcacademy.com',
    initials: 'RS',
    avatarBg: 'bg-red-100',
    avatarText: 'text-red-700',
    role: 'Agent',
    status: 'Active',
  },
  {
    id: 'tm-3',
    name: 'Priya Verma',
    email: 'priya@abcacademy.com',
    initials: 'PV',
    avatarBg: 'bg-emerald-100',
    avatarText: 'text-emerald-700',
    role: 'Agent',
    status: 'Active',
  },
  {
    id: 'tm-4',
    name: 'Amit Patel',
    email: 'amit@abcacademy.com',
    initials: 'AP',
    avatarBg: 'bg-amber-100',
    avatarText: 'text-amber-700',
    role: 'Manager',
    status: 'Active',
  },
  {
    id: 'tm-5',
    name: 'Sneha Iyer',
    email: 'sneha@abcacademy.com',
    initials: 'SI',
    avatarBg: 'bg-purple-100',
    avatarText: 'text-purple-700',
    role: 'Agent',
    status: 'Active',
  },
  {
    id: 'tm-6',
    name: 'Vikram Singh',
    email: 'vikram@abcacademy.com',
    initials: 'VS',
    avatarBg: 'bg-cyan-100',
    avatarText: 'text-cyan-700',
    role: 'Agent',
    status: 'Inactive',
  },
  {
    id: 'tm-7',
    name: 'Neha Gupta',
    email: 'neha@abcacademy.com',
    initials: 'NG',
    avatarBg: 'bg-pink-100',
    avatarText: 'text-pink-700',
    role: 'Viewer',
    status: 'Active',
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_TEAM);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Agent');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, searchQuery]);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const initials = inviteName
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const colorPairs = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      { bg: 'bg-amber-100', text: 'text-amber-700' },
    ];
    const picked = colorPairs[members.length % colorPairs.length];

    const newMember: TeamMember = {
      id: 'tm-' + Date.now(),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      initials,
      avatarBg: picked.bg,
      avatarText: picked.text,
      role: inviteRole,
      status: 'Active',
    };

    setMembers((prev) => [...prev, newMember]);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('Agent');
    showToast(`Invitation sent to ${newMember.email}`);
  };

  const handleToggleStatus = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus: Status = m.status === 'Active' ? 'Inactive' : 'Active';
          showToast(`${m.name} is now ${nextStatus}`);
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
    setActiveMenuId(null);
  };

  const handleRoleChange = (id: string, newRole: Role) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          showToast(`${m.name}'s role updated to ${newRole}`);
          return { ...m, role: newRole };
        }
        return m;
      })
    );
    setActiveMenuId(null);
  };

  const handleRemoveMember = (id: string) => {
    const member = members.find((m) => m.id === id);
    if (!member) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setActiveMenuId(null);
    showToast(`Removed ${member.name} from team`);
  };

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case 'Owner':
        return 'bg-purple-100 text-purple-700';
      case 'Manager':
        return 'bg-amber-100 text-amber-700';
      case 'Agent':
        return 'bg-blue-100 text-blue-700';
      case 'Viewer':
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusBadgeClass = (status: Status) => {
    return status === 'Active'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] px-8 py-8 min-h-screen">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Team</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your workspace members.</p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Invite Member
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          {/* Search Input */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team members..."
              className="w-full pl-10 pr-4 py-2.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400 transition-all"
            />
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500">
                  <th className="pb-3 px-4 font-semibold">Name</th>
                  <th className="pb-3 px-4 font-semibold">Role</th>
                  <th className="pb-3 px-4 font-semibold">Status</th>
                  <th className="pb-3 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Name & Avatar */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-full ${member.avatarBg} ${member.avatarText} flex items-center justify-center text-xs font-bold flex-shrink-0`}
                        >
                          {member.initials}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{member.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${getRoleBadgeClass(
                          member.role
                        )}`}
                      >
                        {member.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${getStatusBadgeClass(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-6 text-right relative">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuId(activeMenuId === member.id ? null : member.id)
                        }
                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === member.id && (
                        <div className="absolute right-6 top-12 z-20 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1 text-left animate-in fade-in zoom-in-95">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                            Change Role
                          </div>
                          {(['Owner', 'Manager', 'Agent', 'Viewer'] as Role[]).map((r) => (
                            <button
                              key={r}
                              onClick={() => handleRoleChange(member.id, r)}
                              className={`w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 flex items-center justify-between cursor-pointer ${
                                member.role === r ? 'font-bold text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              {r}
                              {member.role === r && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                            </button>
                          ))}

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            onClick={() => handleToggleStatus(member.id)}
                            className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            Mark as {member.status === 'Active' ? 'Inactive' : 'Active'}
                          </button>

                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove Member
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {filteredMembers.length} team {filteredMembers.length === 1 ? 'member' : 'members'}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-xl bg-[#1b59f8] text-white flex items-center justify-center text-xs font-bold shadow-xs"
              >
                1
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Invite Team Member</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Send an email invitation to collaborate on your WhatsApp workspace.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full pl-10 pr-3 py-2 text-xs text-gray-900 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. ramesh@abcacademy.com"
                    className="w-full pl-10 pr-3 py-2 text-xs text-gray-900 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="Agent">Agent (Can view and answer customer chats)</option>
                  <option value="Manager">Manager (Can manage team and campaigns)</option>
                  <option value="Owner">Owner (Full admin access to billing and workspace)</option>
                  <option value="Viewer">Viewer (Read-only access to analytics)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1b59f8] hover:bg-blue-700 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
