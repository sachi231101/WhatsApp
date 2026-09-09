'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  Filter,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle2,
  X,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

interface ContactTag {
  id: string;
  name: string;
  color: string;
}

interface Contact {
  id: string;
  workspaceId: string;
  projectId: string;
  waId?: string | null;
  phoneNumber: string;
  displayPhoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
  company?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
  leadScore: number;
  source: string;
  lastActivityAt: string;
  createdAt: string;
  tags?: ContactTag[];
}

export default function ProjectContactsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean>(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'new' | 'high_intent' | 'recently_active' | 'tagged'>('all');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    leadScore: 50,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check WhatsApp Connection Status for CTA
  useEffect(() => {
    async function checkWhatsApp() {
      try {
        const res = await fetch(`/api/projects/${projectId}/whatsapp`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'ok' && json.data?.status === 'CONNECTED') {
            setWhatsappConnected(true);
          }
        }
      } catch {
        // Silently fallback to false
      }
    }
    if (projectId) checkWhatsApp();
  }, [projectId]);

  // Load Contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * limit;
      const queryParams = new URLSearchParams({
        filter: activeFilter,
        limit: String(limit),
        offset: String(offset),
      });

      if (search.trim()) {
        queryParams.set('search', search.trim());
      }

      const res = await fetch(`/api/projects/${projectId}/contacts?${queryParams.toString()}`);
      const json = await res.json();

      if (res.status === 404) {
        setError('Project not found or you do not have access to it.');
        return;
      }

      if (res.ok && json.status === 'ok') {
        setContacts(json.data || []);
        setTotalCount(json.totalCount || 0);
      } else {
        setError(json.error || 'Failed to load contacts.');
      }
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError('Network error while loading contacts.');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, limit, activeFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounced Search Reset Page
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  // Submit Add Contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (res.ok && json.status === 'ok') {
        setShowAddModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          company: '',
          leadScore: 50,
        });
        await fetchContacts();
      } else {
        setFormError(json.error || 'Failed to create contact.');
      }
    } catch (err: any) {
      console.error('Error creating contact:', err);
      setFormError('Network error while creating contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Relative Time Helper
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Project Overview</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customers and understand every interaction in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b59f8] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-600 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => fetchContacts()}
            disabled={loading}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
            title="Refresh contacts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'new', label: 'New' },
            { id: 'high_intent', label: 'High Intent' },
            { id: 'recently_active', label: 'Recently Active' },
            { id: 'tagged', label: 'Tagged' },
          ].map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFilterChange(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex-shrink-0 ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <h4 className="text-sm font-bold">Failed to load contacts</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Contacts Table / Content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">
              No contacts yet
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Customers who interact with your WhatsApp number will appear here.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {!whatsappConnected ? (
                <Link
                  href={`/projects/${projectId}/whatsapp`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Connect WhatsApp</span>
                </Link>
              ) : null}
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Tags</th>
                  <th className="py-3.5 px-6">Lead Score</th>
                  <th className="py-3.5 px-6">Last Activity</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map((c) => {
                  const initials = (c.displayName || 'C')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const isHighIntent = c.leadScore >= 70;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/projects/${projectId}/contacts/${c.id}`)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Name Column */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {c.displayName}
                            </p>
                            {c.company ? (
                              <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                <span>{c.company}</span>
                              </p>
                            ) : c.email ? (
                              <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{c.email}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Phone Column */}
                      <td className="py-3.5 px-6 text-xs text-gray-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{c.displayPhoneNumber || c.phoneNumber}</span>
                        </div>
                      </td>

                      {/* Tags Column */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.tags && c.tags.length > 0 ? (
                            c.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60"
                              >
                                {tag.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-300 italic">No tags</span>
                          )}
                          {c.tags && c.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-semibold">
                              +{c.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lead Score Column */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                              isHighIntent
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {isHighIntent && <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            <span>{c.leadScore}/100</span>
                          </span>
                        </div>
                      </td>

                      {/* Last Activity Column */}
                      <td className="py-3.5 px-6 text-xs text-gray-400">
                        {formatTimeAgo(c.lastActivityAt)}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          href={`/projects/${projectId}/contacts/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <span>View 360</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Showing <span className="font-semibold text-gray-900">{contacts.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> contacts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Contact</h3>
                <p className="text-xs text-gray-400">Add a new customer to this project</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Rahul"
                    className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Sharma"
                    className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210 or 15551234567"
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. rahul@example.com"
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Company <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Initial Lead Score (0–100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.leadScore}
                  onChange={(e) => setFormData({ ...formData, leadScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#1b59f8] text-white text-xs font-bold hover:bg-blue-600 transition-colors cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Contact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
