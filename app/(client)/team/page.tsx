'use client';

import { useState } from 'react';
import {
  UserPlus,
  Users,
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Agent';
  status: 'Active' | 'Invited';
  assignedChats: number;
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-01',
    name: 'Sachin (You)',
    email: 'sachin@acmecorp.com',
    role: 'Owner',
    status: 'Active',
    assignedChats: 14,
  },
  {
    id: 'mem-02',
    name: 'Priya Mehta',
    email: 'priya@acmecorp.com',
    role: 'Admin',
    status: 'Active',
    assignedChats: 28,
  },
  {
    id: 'mem-03',
    name: 'Vikram Singh',
    email: 'vikram@acmecorp.com',
    role: 'Agent',
    status: 'Active',
    assignedChats: 42,
  },
  {
    id: 'mem-04',
    name: 'Sneha Patel',
    email: 'sneha@acmecorp.com',
    role: 'Agent',
    status: 'Invited',
    assignedChats: 0,
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Admin' | 'Agent'>('Agent');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const newMember: Member = {
      id: 'mem-' + Date.now(),
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
      role,
      status: 'Invited',
      assignedChats: 0,
    };

    setMembers((prev) => [...prev, newMember]);
    setShowModal(false);
    setEmail('');
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Team Members & Roles
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Manage agents, assign roles, and distribute customer conversations across your team.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 hover:opacity-90 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Invite Teammate
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.02] border-b border-white/[0.06] text-white/40 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Assigned Chats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-700 to-purple-900 flex items-center justify-center font-bold text-xs text-white border border-white/10">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-white/90">{m.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-white/60">{m.email}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {m.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      m.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-white font-semibold">{m.assignedChats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141620] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Invite Team Member</h3>
            <p className="text-xs text-white/40 mb-5">
              Send an email invitation to collaborate on your WhatsApp Business workspace.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  placeholder="agent@acmecorp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Priya Mehta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Workspace Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs bg-[#1a1d27] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="Agent">Agent (Can view and answer assigned chats)</option>
                  <option value="Admin">Admin (Can manage agents, campaigns & templates)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-900/30 hover:opacity-90 transition-all cursor-pointer"
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
