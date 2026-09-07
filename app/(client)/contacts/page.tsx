'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  ArrowUpRight,
  Flame,
  UserPlus,
  MessageSquare,
  Filter,
  Download,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  Building,
  Tag,
  Snowflake,
  Sun,
  Shield,
  ArrowUpDown,
} from 'lucide-react';
import CsvContactImporterModal from '@/components/contacts/CsvContactImporterModal';

interface ContactItem {
  id: string;
  name: string;
  subtitle: string;
  avatar?: string;
  initials?: string;
  phone: string;
  email: string;
  tags: { label: string; color: string }[];
  leadScore: number;
  status: 'Hot' | 'Warm' | 'Cold';
  assignedTo: { name: string; avatar?: string; initials?: string };
  lastActivity: string;
}

const DEFAULT_CONTACTS: ContactItem[] = [
  {
    id: 'c1',
    name: 'Rahul Sharma',
    subtitle: 'ABC Academy',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@gmail.com',
    tags: [
      { label: 'Interested', color: 'bg-blue-100 text-blue-600' },
      { label: 'Data Science', color: 'bg-purple-100 text-purple-600' },
    ],
    leadScore: 87,
    status: 'Hot',
    assignedTo: { name: 'Priya', initials: 'P' },
    lastActivity: '2m ago',
  },
  {
    id: 'c2',
    name: 'Priya Patel',
    subtitle: 'Self Employed',
    phone: '+91 98765 67890',
    email: 'priya.patel@gmail.com',
    tags: [
      { label: 'Demo Class', color: 'bg-green-100 text-green-600' },
      { label: 'Follow Up', color: 'bg-purple-100 text-purple-600' },
    ],
    leadScore: 72,
    status: 'Warm',
    assignedTo: { name: 'Vikram', initials: 'V' },
    lastActivity: '10m ago',
  },
  {
    id: 'c3',
    name: 'Amit Kumar',
    subtitle: 'Tech Solutions',
    initials: 'AK',
    phone: '+91 99887 66554',
    email: 'amit.kumar@example.com',
    tags: [
      { label: 'Business', color: 'bg-blue-100 text-blue-600' },
      { label: 'High Value', color: 'bg-pink-100 text-pink-600' },
    ],
    leadScore: 65,
    status: 'Warm',
    assignedTo: { name: 'Neha', initials: 'N' },
    lastActivity: '25m ago',
  },
  {
    id: 'c4',
    name: 'Sneha Reddy',
    subtitle: 'Reddy Consultants',
    phone: '+91 98765 11223',
    email: 'sneha.reddy@gmail.com',
    tags: [
      { label: 'Support', color: 'bg-gray-100 text-gray-600' },
      { label: 'Existing', color: 'bg-green-100 text-green-600' },
    ],
    leadScore: 40,
    status: 'Cold',
    assignedTo: { name: 'Unassigned' },
    lastActivity: '1h ago',
  },
  {
    id: 'c5',
    name: 'Vikrant Tiwari',
    subtitle: 'Tiwari Enterprises',
    initials: 'VT',
    phone: '+91 91234 56789',
    email: 'vikrant@tiwari.com',
    tags: [
      { label: 'Interested', color: 'bg-blue-100 text-blue-600' },
      { label: 'Pricing', color: 'bg-purple-100 text-purple-600' },
    ],
    leadScore: 78,
    status: 'Hot',
    assignedTo: { name: 'Arjun', initials: 'A' },
    lastActivity: '2h ago',
  },
  {
    id: 'c6',
    name: 'Neha Gupta',
    subtitle: 'Gupta Education',
    phone: '+91 87654 32109',
    email: 'neha.gupta@gmail.com',
    tags: [
      { label: 'Demo Class', color: 'bg-green-100 text-green-600' },
      { label: 'Student', color: 'bg-blue-100 text-blue-600' },
    ],
    leadScore: 55,
    status: 'Warm',
    assignedTo: { name: 'Priya', initials: 'P' },
    lastActivity: '3h ago',
  },
  {
    id: 'c7',
    name: 'Rohan Mehta',
    subtitle: 'Mehta & Co.',
    initials: 'RM',
    phone: '+91 99876 54321',
    email: 'rohan.mehta@example.com',
    tags: [
      { label: 'Business', color: 'bg-blue-100 text-blue-600' },
      { label: 'Enterprise', color: 'bg-purple-100 text-purple-600' },
    ],
    leadScore: 68,
    status: 'Warm',
    assignedTo: { name: 'Vikram', initials: 'V' },
    lastActivity: '4h ago',
  },
  {
    id: 'c8',
    name: 'Kavya Nair',
    subtitle: 'Nair Technologies',
    phone: '+91 98712 34567',
    email: 'kavya.nair@gmail.com',
    tags: [
      { label: 'Support', color: 'bg-gray-100 text-gray-600' },
      { label: 'Bug Report', color: 'bg-gray-100 text-gray-600' },
    ],
    leadScore: 35,
    status: 'Cold',
    assignedTo: { name: 'Neha', initials: 'N' },
    lastActivity: '6h ago',
  },
  {
    id: 'c9',
    name: 'Arjun Singh',
    subtitle: 'Singh & Associates',
    phone: '+91 87654 87654',
    email: 'arjun.singh@gmail.com',
    tags: [
      { label: 'Interested', color: 'bg-blue-100 text-blue-600' },
      { label: 'Follow Up', color: 'bg-purple-100 text-purple-600' },
    ],
    leadScore: 60,
    status: 'Warm',
    assignedTo: { name: 'Unassigned' },
    lastActivity: '1d ago',
  },
  {
    id: 'c10',
    name: 'Meera Iyer',
    subtitle: 'Iyer Learning',
    phone: '+91 93456 78901',
    email: 'meera.iyer@gmail.com',
    tags: [
      { label: 'Demo Class', color: 'bg-green-100 text-green-600' },
      { label: 'Parent', color: 'bg-blue-100 text-blue-600' },
    ],
    leadScore: 48,
    status: 'Cold',
    assignedTo: { name: 'Priya', initials: 'P' },
    lastActivity: '1d ago',
  },
];

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>(DEFAULT_CONTACTS);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form state for Add Contact
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTag, setFormTag] = useState('Interested');
  const [formStatus, setFormStatus] = useState<'Hot' | 'Warm' | 'Cold'>('Hot');
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);

  // Fetch real contacts if any
  useEffect(() => {
    fetch(`/api/contacts?q=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.status === 'ok' && Array.isArray(j.data) && j.data.length > 0) {
          const mapped: ContactItem[] = j.data.map((c: any) => {
            const tags = Array.isArray(c.custom_attributes?.tags)
              ? c.custom_attributes.tags.map((t: string) => ({
                  label: t,
                  color: 'bg-blue-100 text-blue-600',
                }))
              : [{ label: 'Lead', color: 'bg-blue-100 text-blue-600' }];
            const score = c.custom_attributes?.score || 50;
            const status: 'Hot' | 'Warm' | 'Cold' =
              score >= 75 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold';

            return {
              id: c.id,
              name: c.profile_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.phone_number,
              subtitle: c.custom_attributes?.company || 'Business',
              phone: c.phone_number,
              email: c.custom_attributes?.email || `${(c.profile_name || 'user').toLowerCase().replace(/\s+/g, '.')}@example.com`,
              tags,
              leadScore: score,
              status,
              assignedTo: { name: 'Priya', initials: 'P' },
              lastActivity: 'just now',
            };
          });

          const realIds = new Set(mapped.map((m) => m.id));
          const rest = DEFAULT_CONTACTS.filter((d) => !realIds.has(d.id));
          setContacts([...mapped, ...rest]);
        }
      })
      .catch(() => {});
  }, [search]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone.trim() || !formName.trim()) return;

    try {
      setSubmitting(true);
      const score = formStatus === 'Hot' ? 85 : formStatus === 'Warm' ? 65 : 40;
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formPhone,
          profile_name: formName,
          tags: [formTag],
          score,
          company: formCompany,
          email: formEmail,
        }),
      });

      const json = await res.json();
      if (json.status === 'ok') {
        const newContact: ContactItem = {
          id: json.data?.id || `new-${Date.now()}`,
          name: formName,
          subtitle: formCompany || 'Independent',
          phone: formPhone,
          email: formEmail || `${formName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
          tags: [{ label: formTag, color: 'bg-blue-100 text-blue-600' }],
          leadScore: score,
          status: formStatus,
          assignedTo: { name: 'Priya', initials: 'P' },
          lastActivity: 'just now',
        };

        setContacts((prev) => [newContact, ...prev]);
        setShowAddModal(false);
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setFormCompany('');
        setToastMsg('Contact added successfully!');
        setTimeout(() => setToastMsg(null), 3000);
      }
    } catch {
      setToastMsg('Failed to create contact');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const csvHeader = 'Name,Phone,Email,Tags,LeadScore,Status,LastActivity\n';
    const csvRows = contacts
      .map(
        (c) =>
          `"${c.name}","${c.phone}","${c.email}","${c.tags.map((t) => t.label).join(';')}","${c.leadScore}","${c.status}","${c.lastActivity}"`
      )
      .join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setTagFilter([]);
    setAgentFilter([]);
  };

  const filteredContacts = contacts.filter((c) => {
    if (statusFilter.length > 0 && !statusFilter.includes(c.status)) return false;
    if (tagFilter.length > 0 && !c.tags.some((t) => tagFilter.includes(t.label))) return false;
    if (agentFilter.length > 0 && !agentFilter.includes(c.assignedTo.name)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your customers, leads, and business relationships.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            Import Contacts
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* ── 4 Metric Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <Users className="w-4.5 h-4.5 text-blue-500" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">1,248</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 12% vs last month
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center mb-2">
              <Flame className="w-4.5 h-4.5 text-orange-500" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Hot Leads</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">320</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 18% vs last month
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
              <UserPlus className="w-4.5 h-4.5 text-blue-500" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">New Contacts</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">86</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 25% vs last month
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
              <MessageSquare className="w-4.5 h-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Active This Week</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">432</p>
            <p className="text-[11px] font-semibold text-green-600 flex items-center gap-1 mt-1">
              <span>↑</span> 14% vs last month
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Section: Table (75%) + Filter Sidebar (25%) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* Contacts Table (Col span 3) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">All Contacts</h2>
                <p className="text-[11px] text-gray-400">1,248 contacts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-52 placeholder-gray-400"
                />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-all">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                Filter
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                      <span>Name</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Tags</th>
                  <th className="py-3 px-3">Lead Score</th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Assigned To</th>
                  <th className="py-3 px-3">Last Activity</th>
                  <th className="py-3 px-3 text-right">•••</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact.id)}
                        onChange={(e) => toggleSelect(contact.id, e as any)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                          {contact.initials || contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{contact.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{contact.phone}</td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{contact.email}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${t.color}`}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          contact.leadScore >= 70
                            ? 'bg-emerald-100 text-emerald-700'
                            : contact.leadScore >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {contact.leadScore}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          contact.status === 'Hot'
                            ? 'bg-orange-100 text-orange-600'
                            : contact.status === 'Warm'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {contact.status === 'Hot' && <Flame className="w-3 h-3" />}
                        {contact.status === 'Warm' && <Sun className="w-3 h-3" />}
                        {contact.status === 'Cold' && <Snowflake className="w-3 h-3" />}
                        {contact.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {contact.assignedTo.initials ? (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                            {contact.assignedTo.initials}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                            <Users className="w-3 h-3" />
                          </div>
                        )}
                        <span className="text-xs text-gray-700 font-medium">
                          {contact.assignedTo.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-400 whitespace-nowrap">{contact.lastActivity}</td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing 1-10 of 1,248 contacts</span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-[#1b59f8] text-white font-bold flex items-center justify-center">
                1
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                2
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                3
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                4
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                5
              </button>
              <span className="px-1 text-gray-400">...</span>
              <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                125
              </button>
              <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Filters Sidebar (Col span 1) ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Filters</h3>
            </div>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>

          {/* Lead Status Filter */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">Lead Status</p>
            <div className="space-y-1.5 text-xs text-gray-600">
              {[
                { label: 'Hot', count: 320 },
                { label: 'Warm', count: 482 },
                { label: 'Cold', count: 446 },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(item.label)}
                    onChange={() =>
                      setStatusFilter((prev) =>
                        prev.includes(item.label)
                          ? prev.filter((i) => i !== item.label)
                          : [...prev, item.label]
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-gray-700">{item.label}</span>
                  <span className="text-[11px] text-gray-400 font-medium">({item.count})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">Tags</p>
            <div className="space-y-1.5 text-xs text-gray-600">
              {[
                { label: 'Interested', count: 420 },
                { label: 'Demo Class', count: 312 },
                { label: 'Pricing', count: 186 },
                { label: 'Student', count: 142 },
                { label: 'Business', count: 128 },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tagFilter.includes(item.label)}
                    onChange={() =>
                      setTagFilter((prev) =>
                        prev.includes(item.label)
                          ? prev.filter((i) => i !== item.label)
                          : [...prev, item.label]
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-gray-700">{item.label}</span>
                  <span className="text-[11px] text-gray-400 font-medium">({item.count})</span>
                </label>
              ))}
              <button className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 pt-1">
                Show more
              </button>
            </div>
          </div>

          {/* Assigned Agent Filter */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-2">Assigned Agent</p>
            <div className="space-y-1.5 text-xs text-gray-600">
              {[
                { label: 'Priya Patel', count: 320, initials: 'P' },
                { label: 'Vikram Shah', count: 284, initials: 'V' },
                { label: 'Neha Joshi', count: 246, initials: 'N' },
                { label: 'Arjun Singh', count: 198, initials: 'A' },
                { label: 'Unassigned', count: 200 },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agentFilter.includes(item.label.split(' ')[0])}
                    onChange={() => {
                      const key = item.label.split(' ')[0];
                      setAgentFilter((prev) =>
                        prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
                      );
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[9px] font-bold">
                    {item.initials || 'U'}
                  </div>
                  <span className="flex-1 text-gray-700 truncate">{item.label}</span>
                  <span className="text-[11px] text-gray-400 font-medium">({item.count})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Created */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-1.5">Date Created</p>
            <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-100 transition-all">
              <span>All time</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Last Activity */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-1.5">Last Activity</p>
            <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-100 transition-all">
              <span>All time</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Lead Score */}
          <div>
            <p className="text-xs font-bold text-gray-800 mb-1.5">Lead Score</p>
            <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-100 transition-all">
              <span>All scores</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Apply Filters Button */}
          <button
            onClick={() => setToastMsg('Filters applied!')}
            className="w-full py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* ── Add Contact Modal ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Add New Contact</h3>
                  <p className="text-[11px] text-gray-400">Add a customer or lead to your directory</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  WhatsApp Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Org</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Academy"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Tag</label>
                  <select
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  >
                    <option value="Interested">Interested</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Demo Class">Demo Class</option>
                    <option value="Business">Business</option>
                    <option value="High Value">High Value</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lead Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50"
                  >
                    <option value="Hot">🔥 Hot Lead</option>
                    <option value="Warm">☀️ Warm</option>
                    <option value="Cold">❄️ Cold</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#1b59f8] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <CsvContactImporterModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            setToastMsg('Contacts imported successfully!');
            setTimeout(() => setToastMsg(null), 3000);
          }}
        />
      )}
    </div>
  );
}
