'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Calendar,
  Flame,
  Tag,
  Plus,
  Edit2,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Sliders,
  Send,
  User,
  Check,
} from 'lucide-react';

interface ContactTag {
  id: string;
  name: string;
  color: string;
}

interface PhoneNumberItem {
  id: string;
  phoneNumber: string;
  displayPhoneNumber: string;
  type: string;
  isPrimary: boolean;
  verified: boolean;
}

interface EmailItem {
  id: string;
  email: string;
  type: string;
  isPrimary: boolean;
  verified: boolean;
}

interface CustomFieldItem {
  definitionId: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
  options: string[];
  value: any;
}

interface ContactNote {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}

interface TimelineActivity {
  id: string;
  type: string;
  actorName: string;
  description: string;
  metadata: any;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  status: string;
  channel: string;
  handlingMode: string;
  priority: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadCount: number;
  assignedUser?: { id: string; name: string } | null;
}

export default function Customer360ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const contactId = params.contactId as string;

  // Contact state
  const [contact, setContact] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-resource states
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([]);
  const [projectTags, setProjectTags] = useState<ContactTag[]>([]);

  // Note form state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Quick Score edit state
  const [isEditingScore, setIsEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState<number>(50);
  const [updatingScore, setUpdatingScore] = useState(false);

  // Edit contact modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phone: '',
    email: '',
    company: '',
    status: 'ACTIVE',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Tag selector state
  const [showAddTagDropdown, setShowAddTagDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Contact Profile & Relational data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [contactRes, notesRes, actRes, convRes, cfRes, tagsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/contacts/${contactId}`),
        fetch(`/api/projects/${projectId}/contacts/${contactId}/notes`).catch((): Response | null => null),
        fetch(`/api/projects/${projectId}/contacts/${contactId}/activities`).catch((): Response | null => null),
        fetch(`/api/projects/${projectId}/contacts/${contactId}/conversations`).catch((): Response | null => null),
        fetch(`/api/projects/${projectId}/contacts/${contactId}/custom-fields`).catch((): Response | null => null),
        fetch(`/api/projects/${projectId}/tags`).catch((): Response | null => null),
      ]);

      const contactJson = await contactRes.json();

      if (contactRes.status === 404) {
        setError('Contact not found or does not belong to this project.');
        return;
      }

      if (contactRes.ok && contactJson.status === 'ok') {
        const c = contactJson.data;
        setContact(c);
        setScoreInput(c.leadScore ?? 50);
        setEditFormData({
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          displayName: c.displayName || '',
          phone: c.phoneNumber || '',
          email: c.email || '',
          company: c.company || '',
          status: c.status || 'ACTIVE',
        });
      } else {
        setError(contactJson.error || 'Failed to load contact profile.');
      }

      if (notesRes && notesRes.ok) {
        const nJson = await notesRes.json();
        if (nJson.status === 'ok') setNotes(nJson.data || []);
      }

      if (actRes && actRes.ok) {
        const aJson = await actRes.json();
        if (aJson.status === 'ok') setActivities(aJson.data || []);
      }

      if (convRes && convRes.ok) {
        const cJson = await convRes.json();
        if (cJson.status === 'ok') setConversations(cJson.data || []);
      }

      if (cfRes && cfRes.ok) {
        const cfJson = await cfRes.json();
        if (cfJson.status === 'ok') setCustomFields(cfJson.data || []);
      }

      if (tagsRes && tagsRes.ok) {
        const tJson = await tagsRes.json();
        if (tJson.status === 'ok') setProjectTags(tJson.data || []);
      }
    } catch (err: any) {
      console.error('Error loading Customer 360 profile:', err);
      setError('Network error while loading contact profile.');
    } finally {
      setLoading(false);
    }
  }, [projectId, contactId]);

  useEffect(() => {
    if (projectId && contactId) {
      loadProfile();
    }
  }, [projectId, contactId, loadProfile]);

  // Handle Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || submittingNote) return;

    try {
      setSubmittingNote(true);
      const res = await fetch(`/api/projects/${projectId}/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setNotes([json.data, ...notes]);
        setNewNoteContent('');
        showToast('Internal note added.');
        // Refresh activities
        const actRes = await fetch(`/api/projects/${projectId}/contacts/${contactId}/activities`);
        if (actRes.ok) {
          const aJson = await actRes.json();
          if (aJson.status === 'ok') setActivities(aJson.data || []);
        }
      } else {
        showToast(json.error || 'Failed to add note.');
      }
    } catch {
      showToast('Network error while adding note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Score Update
  const handleSaveScore = async () => {
    try {
      setUpdatingScore(true);
      const res = await fetch(`/api/projects/${projectId}/contacts/${contactId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: scoreInput }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setContact((prev: any) => ({ ...prev, leadScore: json.data.leadScore }));
        setIsEditingScore(false);
        showToast(`Lead score updated to ${json.data.leadScore}`);
        // Refresh activities
        const actRes = await fetch(`/api/projects/${projectId}/contacts/${contactId}/activities`);
        if (actRes.ok) {
          const aJson = await actRes.json();
          if (aJson.status === 'ok') setActivities(aJson.data || []);
        }
      } else {
        showToast(json.error || 'Failed to update score.');
      }
    } catch {
      showToast('Error saving lead score.');
    } finally {
      setUpdatingScore(false);
    }
  };

  // Handle Edit Contact Details
  const handleSaveContactEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/projects/${projectId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setContact((prev: any) => ({ ...prev, ...json.data }));
        setShowEditModal(false);
        showToast('Contact details updated successfully.');
        loadProfile();
      } else {
        showToast(json.error || 'Failed to update contact.');
      }
    } catch {
      showToast('Network error while updating contact.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Add Tag to Contact
  const handleAddTag = async (tagId?: string, name?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId, name }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setShowAddTagDropdown(false);
        setNewTagName('');
        showToast('Tag added to contact.');
        loadProfile();
      } else {
        showToast(json.error || 'Failed to add tag.');
      }
    } catch {
      showToast('Error adding tag.');
    }
  };

  // Handle Remove Tag
  const handleRemoveTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts/${contactId}/tags/${tagId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Tag removed.');
        loadProfile();
      } else {
        showToast('Failed to remove tag.');
      }
    } catch {
      showToast('Error removing tag.');
    }
  };

  // Activity Icon Helper
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE_RECEIVED':
      case 'MESSAGE_SENT':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'AI_REPLY':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'NOTE_ADDED':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'TAG_ADDED':
      case 'TAG_REMOVED':
        return <Tag className="w-4 h-4 text-indigo-600" />;
      case 'LEAD_SCORE_CHANGED':
        return <Flame className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatRelative = (dateStr: string) => {
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading Customer 360 profile...</p>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Contact Not Found</h3>
            <p className="text-sm text-red-600">{error || 'This contact does not exist or you do not have permission to view it.'}</p>
            <Link
              href={`/projects/${projectId}/contacts`}
              className="inline-flex items-center gap-2 text-xs font-bold text-red-700 underline mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Contacts</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = (contact.displayName || 'C')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isHighIntent = (contact.leadScore ?? 0) >= 70;

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gray-900 text-white text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back to contacts */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}/contacts`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contacts</span>
        </Link>
      </div>

      {/* ── Customer 360 Header ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar + Primary Info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl flex-shrink-0 shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {contact.displayName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    contact.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : contact.status === 'BLOCKED'
                      ? 'bg-red-50 text-red-700 border border-red-200/60'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {contact.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 font-medium text-gray-700">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>{contact.displayPhoneNumber || contact.phoneNumber}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Score & Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Lead Score Widget */}
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Lead Score
                </p>
                {isEditingScore ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(Number(e.target.value))}
                      className="w-16 px-2 py-0.5 text-xs font-bold bg-white border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={handleSaveScore}
                      disabled={updatingScore}
                      className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {updatingScore ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditingScore(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-extrabold text-gray-900">
                      {contact.leadScore}
                    </span>
                    <span className="text-xs text-gray-400">/ 100</span>
                    {isHighIntent && <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    <button
                      onClick={() => setIsEditingScore(true)}
                      className="text-[11px] text-blue-600 hover:underline font-bold ml-1 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Contact Button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
              <span>Edit Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Customer 360 Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Details, Tags, Custom Fields */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Information Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Customer Information
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-400 font-medium">Primary Phone</p>
                <p className="text-gray-900 font-semibold mt-0.5">
                  {contact.displayPhoneNumber || contact.phoneNumber}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Email</p>
                <p className="text-gray-900 font-semibold mt-0.5">
                  {contact.email || <span className="text-gray-300 italic">Not provided</span>}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Company</p>
                <p className="text-gray-900 font-semibold mt-0.5">
                  {contact.company || <span className="text-gray-300 italic">Not provided</span>}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Acquisition Source</p>
                <p className="text-gray-900 font-semibold mt-0.5 inline-flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                    {contact.source}
                  </span>
                </p>
              </div>

              <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                <span>Created</span>
                <span className="font-semibold text-gray-600">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Last Active</span>
                <span className="font-semibold text-gray-600">
                  {formatRelative(contact.lastActivityAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Tags
              </h3>
              <button
                onClick={() => setShowAddTagDropdown(!showAddTagDropdown)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tag</span>
              </button>
            </div>

            {/* Add Tag Popover */}
            {showAddTagDropdown && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 animate-in fade-in">
                <p className="text-[11px] font-bold text-gray-500">Select or create tag:</p>
                {/* Available Project Tags */}
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {projectTags
                    .filter((pt) => !contact.tags?.some((ct: any) => ct.id === pt.id))
                    .map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => handleAddTag(pt.id)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 transition-colors cursor-pointer"
                      >
                        + {pt.name}
                      </button>
                    ))}
                </div>

                {/* Create Tag Input */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200">
                  <input
                    type="text"
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (newTagName.trim()) handleAddTag(undefined, newTagName.trim());
                    }}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Current Tags Badges */}
            <div className="flex flex-wrap gap-1.5">
              {contact.tags && contact.tags.length > 0 ? (
                contact.tags.map((tag: ContactTag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60"
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="hover:text-red-600 text-blue-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No tags assigned.</p>
              )}
            </div>
          </div>

          {/* Custom Fields Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Custom Fields
            </h3>

            {customFields.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No custom fields defined for this project.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {customFields.map((cf) => (
                  <div key={cf.definitionId} className="border-b border-gray-50 pb-2 last:border-0">
                    <p className="text-gray-400 font-medium">{cf.name}</p>
                    <p className="text-gray-800 font-semibold mt-0.5">
                      {cf.value !== null && cf.value !== undefined ? String(cf.value) : <span className="text-gray-300 italic">Empty</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Columns: Internal Notes, Activity Timeline, Conversation History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Conversation History Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Conversation History</h3>
                  <p className="text-xs text-gray-400">All WhatsApp interactions in this project</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
              </span>
            </div>

            {conversations.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-500 font-medium">No conversations yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/projects/${projectId}/inbox?conversationId=${conv.id}`}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-blue-50/30 -mx-2 px-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            conv.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {conv.status}
                        </span>
                        <span className="text-xs font-semibold text-gray-400">
                          {conv.handlingMode === 'AI_HANDLING' ? 'AI Automated' : 'Human Handled'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-800 mt-1 truncate max-w-md">
                        {conv.lastMessagePreview || 'No preview available'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <span className="text-[11px] text-gray-400">
                        {formatRelative(conv.lastMessageAt)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Internal Notes Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Internal Notes</h3>
                  <p className="text-xs text-gray-400">Private team notes. Never sent to WhatsApp.</p>
                </div>
              </div>
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2.5">
              <textarea
                rows={2}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write an internal note about this contact..."
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNoteContent.trim() || submittingNote}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                >
                  {submittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Add Note</span>
                </button>
              </div>
            </form>

            {/* Notes List */}
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No notes yet.</p>
            ) : (
              <div className="space-y-3 divide-y divide-gray-50">
                {notes.map((note) => (
                  <div key={note.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span className="font-semibold text-gray-700">{note.authorName}</span>
                      <span>{formatRelative(note.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-800 leading-relaxed bg-amber-50/40 p-3 rounded-2xl border border-amber-100/60">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Activity Timeline</h3>
                <p className="text-xs text-gray-400">Chronological history of interactions and events</p>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-500 font-medium">No activity yet.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {activities.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-3 text-xs">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 leading-tight">
                        {act.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span>by {act.actorName}</span>
                        <span>•</span>
                        <span>{formatRelative(act.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Contact Modal ────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Contact</h3>
            <p className="text-xs text-gray-400 mb-5">Update identity and details for this contact</p>

            <form onSubmit={handleSaveContactEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={editFormData.company}
                  onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#1b59f8] text-white text-xs font-bold hover:bg-blue-600 cursor-pointer flex items-center gap-2"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
