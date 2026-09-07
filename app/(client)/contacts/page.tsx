'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  MessageSquare,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Tag,
  Sparkles,
} from 'lucide-react';
import CsvContactImporterModal from '@/components/contacts/CsvContactImporterModal';

interface Contact {
  id: string;
  wa_id: string;
  phone_number: string;
  profile_name: string;
  custom_attributes?: Record<string, any>;
  created_at: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('Hot Lead');
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = async (query = '') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.status === 'ok') {
        setContacts(json.data);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(search);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: newPhone,
          profile_name: newName,
          tags: [newTag],
          score: newTag === 'Hot Lead' ? 85 : 50,
        }),
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setShowModal(false);
        setNewPhone('');
        setNewName('');
        fetchContacts();
        setToastMsg('Contact added successfully!');
        setTimeout(() => setToastMsg(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create contact:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-2xl shadow-emerald-500/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Contacts & Leads
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Manage your customer database, AI lead qualification scores, and WhatsApp communication history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-sm font-semibold text-white transition-all cursor-pointer border border-white/10 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-sm font-semibold text-white shadow-lg shadow-green-900/30 hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-[#13151c] p-3 rounded-2xl border border-white/[0.06]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/30" />
          <input
            type="text"
            placeholder="Search by name, phone or WA ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{contacts.length} total contacts</span>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-white/40 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Phone Number</th>
                <th className="px-5 py-3">Tags & Variables</th>
                <th className="px-5 py-3">Lead Score</th>
                <th className="px-5 py-3">Added</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-green-400" />
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/40">
                    <div className="max-w-sm mx-auto space-y-3">
                      <p>No contacts found. Get started by importing a CSV or adding a contact manually.</p>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Upload Contacts CSV</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((c) => {
                  const score = c.custom_attributes?.score || 50;
                  const tags = c.custom_attributes?.tags || (c.custom_attributes?.tag ? [c.custom_attributes.tag] : ['Lead']);
                  const isHot = score >= 75 || tags.some((t: string) => t.toLowerCase().includes('hot') || t.toLowerCase().includes('vip'));

                  // Extract custom variables other than internal keys
                  const internalKeys = new Set(['tags', 'tag', 'score', 'stage', 'imported_at']);
                  const customKeys = Object.keys(c.custom_attributes || {}).filter((k) => !internalKeys.has(k));

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-bold text-xs text-white border border-white/10">
                            {(c.profile_name || c.phone_number || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white/90">{c.profile_name || 'Anonymous'}</p>
                            <p className="text-[11px] text-white/35 font-mono">{c.wa_id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-white/70 font-mono font-medium">{c.phone_number}</td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {tags.slice(0, 2).map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isHot
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              {isHot && tIdx === 0 && '✦ '}
                              {tag}
                            </span>
                          ))}

                          {customKeys.slice(0, 2).map((k) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-mono text-amber-300 border border-white/[0.08]"
                              title={`${k}: ${c.custom_attributes?.[k]}`}
                            >
                              {k}: {String(c.custom_attributes?.[k]).slice(0, 10)}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${score > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="font-semibold text-white/70">{score}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-white/40">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href="/inbox"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-green-500/15 text-white/70 hover:text-green-400 transition-all font-medium text-xs border border-white/[0.06]"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Chat
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#181a24] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add New WhatsApp Contact</h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">WhatsApp Phone Number *</label>
                <input
                  type="text"
                  placeholder="+919876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-1">Tag / Category</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3 py-2 bg-[#13151c] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                >
                  <option value="Hot Lead">Hot Lead</option>
                  <option value="Customer">Customer</option>
                  <option value="VIP">VIP</option>
                  <option value="Subscriber">Subscriber</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-xs font-bold text-white"
                >
                  {submitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Contact Importer Modal */}
      <CsvContactImporterModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={(summary) => {
          fetchContacts();
          setToastMsg(
            `Successfully processed ${summary.total} contacts (${summary.inserted} added, ${summary.updated} updated)!`,
          );
          setTimeout(() => setToastMsg(null), 4000);
        }}
      />
    </div>
  );
}
