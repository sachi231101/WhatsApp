'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MessageSquare,
  Edit2,
  MoreVertical,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  Tag,
  Plus,
  Flame,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Bot,
  User,
  Zap,
  Check,
  FileText,
  Clock,
  ChevronDown,
  Share2,
  Bookmark,
  CheckSquare,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

export default function ContactDetailsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'activity' | 'notes' | 'custom'>('overview');
  const [leadStatus, setLeadStatus] = useState('Hot');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Back Navigation ─────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to contacts
        </Link>
      </div>

      {/* ── Contact Header Card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md">
              RS
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">Rahul Sharma</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                  Active
                </span>
              </div>

              {/* Contact Meta Row 1 */}
              <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91 98765 43210</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span>rahul.sharma@gmail.com</span>
                </div>
              </div>

              {/* Contact Meta Row 2 */}
              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>ABC Academy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Bangalore, Karnataka</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Added 12 Jan 2025</span>
                </div>
              </div>

              {/* Tags Row */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-600">
                  Interested
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-600">
                  Data Science
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-pink-100 text-pink-600">
                  High Value
                </span>
                <button
                  onClick={() => showToast('Add tag modal')}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Tag
                </button>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <Link
              href="/inbox"
              className="flex items-center gap-2 px-4 py-2 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </Link>
            <button
              onClick={() => showToast('Edit contact modal')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
              Edit Contact
            </button>
            <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
              More
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8 text-xs font-semibold">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'conversations', label: 'Conversations' },
            { key: 'activity', label: 'Activity' },
            { key: 'notes', label: 'Notes' },
            { key: 'custom', label: 'Custom Fields' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3.5 transition-all relative ${
                activeTab === tab.key
                  ? 'text-[#1b59f8]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b59f8] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3-Column Content Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── COLUMN 1: Contact Info, Tags, Custom Fields (3.5 / 12) ─────────── */}
        <div className="lg:col-span-4 space-y-5">
          {/* Contact Information */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Contact Information</h3>
              <button
                onClick={() => showToast('Edit contact info')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Full Name</p>
                  <p className="font-medium text-gray-900">Rahul Sharma</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Phone Number</p>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">+91 98765 43210</p>
                    <button className="px-2 py-0.5 rounded-md border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                      Call
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Email Address</p>
                  <p className="font-medium text-gray-900">rahul.sharma@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Company</p>
                  <p className="font-medium text-gray-900">ABC Academy</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Location</p>
                  <p className="font-medium text-gray-900">Bangalore, Karnataka</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Share2 className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Source</p>
                  <p className="font-medium text-gray-900">Website</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400">Date Added</p>
                  <p className="font-medium text-gray-900">12 Jan 2025, 10:24 AM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Tags</h3>
              <button
                onClick={() => showToast('Manage tags modal')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Manage Tags
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Interested', color: 'bg-blue-100 text-blue-600' },
                { label: 'Data Science', color: 'bg-purple-100 text-purple-600' },
                { label: 'Demo Class', color: 'bg-green-100 text-green-600' },
                { label: 'High Value', color: 'bg-pink-100 text-pink-600' },
                { label: 'Follow Up', color: 'bg-purple-100 text-purple-600' },
              ].map((t) => (
                <span
                  key={t.label}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${t.color}`}
                >
                  {t.label}
                </span>
              ))}
              <button
                onClick={() => showToast('Add tag')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                <Plus className="w-3 h-3" /> Add Tag
              </button>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Custom Fields</h3>
              <button
                onClick={() => showToast('Edit custom fields')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <p className="text-[11px] text-gray-400">Course Interest</p>
                <p className="font-medium text-gray-800">Data Science</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Preferred Batch</p>
                <p className="font-medium text-gray-800">Weekend</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Budget Range</p>
                <p className="font-medium text-gray-800">₹20,000 - ₹50,000</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Enquiry Type</p>
                <p className="font-medium text-gray-800">New Admission</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Referred By</p>
                <p className="font-medium text-gray-800">Google</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Notes</p>
                <p className="font-medium text-gray-800">
                  Looking for online classes with certification.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Activity Timeline (4.5 / 12) ───────────────────────────── */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Activity Timeline</h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-all">
              <span>All Activity</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Timeline Items */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {/* Event 1 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center ring-4 ring-white">
                <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Customer sent a message</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Can you tell me the course price?</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">2m ago</span>
            </div>

            {/* Event 2 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center ring-4 ring-white">
                <Bot className="w-2.5 h-2.5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">AI Agent responded</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Shared course details and brochure.</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">3m ago</span>
            </div>

            {/* Event 3 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center ring-4 ring-white">
                <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Lead score increased</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Score changed from 65 to 87</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">15m ago</span>
            </div>

            {/* Event 4 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-white">
                <User className="w-2.5 h-2.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Assigned to Priya Patel</p>
                <p className="text-[11px] text-gray-500 mt-0.5">By Sachin Kumar</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">20m ago</span>
            </div>

            {/* Event 5 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center ring-4 ring-white">
                <Mail className="w-2.5 h-2.5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Campaign message delivered</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Data Science Course Campaign</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">2h ago</span>
            </div>

            {/* Event 6 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center ring-4 ring-white">
                <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Customer replied</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Thank you! Can I get a demo class?</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">2h ago</span>
            </div>

            {/* Event 7 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center ring-4 ring-white">
                <Zap className="w-2.5 h-2.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Automation triggered</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Demo Class Follow-up</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">2h ago</span>
            </div>

            {/* Event 8 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center ring-4 ring-white">
                <Check className="w-2.5 h-2.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Lead status changed</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Warm → Hot</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">3h ago</span>
            </div>

            {/* Event 9 */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center ring-4 ring-white">
                <FileText className="w-2.5 h-2.5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Note added</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Customer is very interested. Follow up on Saturday.
                </p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">3h ago</span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => showToast('Loaded earlier activities')}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
            >
              ↓ Load more activity
            </button>
          </div>
        </div>

        {/* ── COLUMN 3: Lead Score, AI Insights, Agent, Actions (3.5 / 12) ──── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Lead Score Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lead Score</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-gray-900">Hot Lead</span>
              </div>
              <span className="text-base font-bold text-gray-900">
                87 <span className="text-xs font-normal text-gray-400">/ 100</span>
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                style={{ width: '87%' }}
              />
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2 text-[11px] text-emerald-800">
              <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">High purchase intent detected</p>
                <p className="text-[10px] text-emerald-700 mt-0.5 leading-snug">
                  Customer is actively asking about pricing, course details and has requested a demo class.
                </p>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-gray-900">AI Insights</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-600">
                AI
              </span>
            </div>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Customer is highly interested in Data Science course.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Has asked about pricing and payment options.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Requested a demo class.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Likely to convert in next 7-14 days.</span>
              </li>
            </ul>
            <button
              onClick={() => showToast('Full AI Analysis')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 pt-1"
            >
              View Full AI Analysis →
            </button>
          </div>

          {/* Assigned Agent Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Assigned Agent
              </p>
              <button
                onClick={() => showToast('Change agent modal')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Change
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                  PP
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Priya Patel</p>
                  <p className="text-[11px] text-gray-400">Sales Manager</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Online</span>
              </div>
            </div>
          </div>

          {/* Lead Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Lead Status
            </p>
            <button className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 hover:bg-gray-100 transition-all">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Hot</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/inbox"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                Send Message
              </Link>
              <button
                onClick={() => showToast('Add note modal')}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                Add Note
              </button>
              <button
                onClick={() => showToast('Add tag modal')}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                Add Tag
              </button>
              <button
                onClick={() => showToast('Create task modal')}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5 text-gray-500" />
                Create Task
              </button>
              <button
                onClick={() => showToast('Start automation modal')}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Start Auto...
              </button>
              <button
                onClick={() => showToast('Add to campaign modal')}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-purple-500" />
                Add to Camp...
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
