'use client';

import { useState } from 'react';
import {
  Megaphone,
  Plus,
  Send,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  template: string;
  audience: string;
  status: 'completed' | 'scheduled' | 'running';
  sent: number;
  readRate: number;
  replyRate: number;
  date: string;
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-01',
    name: 'Diwali Festive Launch 2026',
    template: 'festival_discount_v2',
    audience: 'All Contacts (4,200)',
    status: 'completed',
    sent: 4200,
    readRate: 74,
    replyRate: 21,
    date: 'Sep 3, 2026',
  },
  {
    id: 'camp-02',
    name: 'Product Pro Plan Announcement',
    template: 'pro_upgrade_announcement',
    audience: 'Hot Leads & Opportunities (1,800)',
    status: 'completed',
    sent: 1800,
    readRate: 61,
    replyRate: 18,
    date: 'Aug 28, 2026',
  },
  {
    id: 'camp-03',
    name: 'Weekend Flash Sale 20% Off',
    template: 'flash_sale_reminder',
    audience: 'All Contacts (3,600)',
    status: 'scheduled',
    sent: 3600,
    readRate: 0,
    replyRate: 0,
    date: 'Tomorrow at 10:00 AM',
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('All Contacts');
  const [template, setTemplate] = useState('festival_discount_v2');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCamp: Campaign = {
      id: 'camp-' + Date.now(),
      name: name.trim(),
      template,
      audience,
      status: 'completed',
      sent: audience === 'All Contacts' ? 4200 : 1200,
      readRate: 82,
      replyRate: 24,
      date: 'Just now',
    };

    setCampaigns((prev) => [newCamp, ...prev]);
    setShowModal(false);
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            WhatsApp Broadcast Campaigns
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Send bulk Meta-approved template notifications, seasonal promotions, and personalized announcements.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-white/40 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Template Used</th>
                <th className="px-5 py-3">Audience</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sent</th>
                <th className="px-5 py-3">Read Rate</th>
                <th className="px-5 py-3">Reply Rate</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 font-semibold text-white/90">{c.name}</td>
                  <td className="px-5 py-4 font-mono text-emerald-400 text-[11px]">{c.template}</td>
                  <td className="px-5 py-4 text-white/70">{c.audience}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        c.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white font-bold">{c.sent.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.readRate}%` }} />
                      </div>
                      <span className="text-white/80 font-semibold">{c.readRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.replyRate}%` }} />
                      </div>
                      <span className="text-emerald-400 font-semibold">{c.replyRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/40">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141620] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Broadcast Campaign</h3>
            <p className="text-xs text-white/40 mb-5">
              Broadcast pre-approved Meta message templates directly to your targeted customer segments.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Campaign Name *</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Customer VIP Access 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#1a1d27] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-green-500/50"
                >
                  <option value="All Contacts">All Contacts (4,200)</option>
                  <option value="Hot Leads">Hot Leads (47)</option>
                  <option value="Recent Inquiries">Recent Inquiries (320)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Meta Approved Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#1a1d27] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-green-500/50"
                >
                  <option value="festival_discount_v2">festival_discount_v2 (Marketing)</option>
                  <option value="pro_upgrade_announcement">pro_upgrade_announcement (Marketing)</option>
                  <option value="order_confirmation">order_confirmation (Utility)</option>
                  <option value="hello_world">hello_world (Utility)</option>
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
