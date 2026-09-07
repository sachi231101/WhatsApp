'use client';

import { useState } from 'react';
import {
  X,
  Bot,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  Phone,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Video,
} from 'lucide-react';

interface AiDemoBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: () => void;
  initialDate?: Date;
}

export function AiDemoBookingModal({
  isOpen,
  onClose,
  onBookingSuccess,
  initialDate,
}: AiDemoBookingModalProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // AI mode state
  const [prompt, setPrompt] = useState(
    'Book a 30-minute product demo with Rahul Sharma tomorrow at 2:00 PM',
  );
  const [contactName, setContactName] = useState('Rahul Sharma');
  const [phoneNumber, setPhoneNumber] = useState('+91 98765 43210');
  const [autoBookNext, setAutoBookNext] = useState(true);

  // Manual mode state
  const defaultDateStr = initialDate
    ? initialDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const [manualDate, setManualDate] = useState(defaultDateStr);
  const [manualTime, setManualTime] = useState('14:00');
  const [manualName, setManualName] = useState('Priya Patel');
  const [manualPhone, setManualPhone] = useState('+91 91234 56789');
  const [manualNotes, setManualNotes] = useState('Interested in WhatsApp API automated sales bot');

  if (!isOpen) return null;

  const quickPrompts = [
    {
      label: 'Demo 1: Rahul at 2:00 PM',
      prompt: 'Book a product demo with Rahul Sharma tomorrow at 2:00 PM',
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
    },
    {
      label: 'Demo 2: Priya at 2:00 PM (Test Conflict!)',
      prompt: 'Book product demo with Priya Patel tomorrow at 2:00 PM',
      name: 'Priya Patel',
      phone: '+91 91234 56789',
    },
    {
      label: 'Demo 3: Vikram on Friday at 11:30 AM',
      prompt: 'Schedule product walkthrough with Vikram Malhotra on Friday at 11:30 AM',
      name: 'Vikram Malhotra',
      phone: '+91 99887 76655',
    },
  ];

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/book-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          contactName,
          phoneNumber,
          autoBookNext,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Failed to book demo');
      } else {
        setResult(json.data);
        onBookingSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const scheduledDateTime = new Date(`${manualDate}T${manualTime}:00`);

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: manualName,
          phoneNumber: manualPhone,
          scheduledAt: scheduledDateTime.toISOString(),
          durationMinutes: 30,
          autoBookNext: true,
          notes: manualNotes,
          bookedBy: 'manual',
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Failed to book demo');
      } else {
        setResult({
          booking: json.data.booking,
          conflictResolved: json.data.conflictResolved,
          message: json.data.message,
          conversationalReply: json.data.message,
          steps: [
            'Manual booking requested.',
            `Slot requested: ${scheduledDateTime.toLocaleString()}`,
            json.data.conflictResolved
              ? `Conflict resolved: Original was full, booked next open slot.`
              : `Slot confirmed immediately.`,
            `Dispatched real-time team notification.`,
          ],
        });
        onBookingSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#13151c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0d0e12]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">AI Demo & Meeting Scheduler</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                  Smart Slot Finder
                </span>
              </div>
              <p className="text-xs text-white/40">
                Automated conflict detection & intelligent slot allocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/[0.06] bg-white/[0.02] px-6">
          <button
            onClick={() => {
              setMode('ai');
              setResult(null);
              setError(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              mode === 'ai'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/[0.05]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            🤖 AI Conversational Booking
          </button>
          <button
            onClick={() => {
              setMode('manual');
              setResult(null);
              setError(null);
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              mode === 'manual'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/[0.05]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            📅 Direct Slot Form
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Card */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div
                className={`p-4 rounded-xl border ${
                  result.conflictResolved
                    ? 'bg-amber-500/[0.08] border-amber-500/25 text-amber-300'
                    : 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {result.conflictResolved ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <h3 className="text-sm font-bold text-white">
                    {result.conflictResolved
                      ? 'Slot Conflict Resolved: Next Open Slot Secured!'
                      : 'Demo Booking Confirmed!'}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-white/80">{result.message}</p>

                {result.booking && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-white/70">
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">Attendee:</span>
                      <span className="font-semibold text-white">{result.booking.contactName}</span> ({result.booking.phoneNumber})
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">Scheduled Time:</span>
                      <span className="font-semibold text-white">
                        {new Date(result.booking.scheduledAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    {result.booking.meetLink && (
                      <div className="col-span-2 mt-1">
                        <span className="text-white/40 block text-[10px] uppercase">Meeting Link:</span>
                        <a
                          href={result.booking.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                        >
                          <Video className="w-3 h-3" />
                          {result.booking.meetLink}
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Execution Reasoning Logs */}
              {result.steps && result.steps.length > 0 && (
                <div className="p-3.5 bg-black/40 border border-white/[0.06] rounded-xl space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3 h-3 text-emerald-400" />
                    AI Execution & Conflict Detection Log
                  </p>
                  <div className="space-y-1 text-[11px] font-mono">
                    {result.steps.map((s: string, idx: number) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 ${
                          s.includes('Conflict') || s.includes('occupied')
                            ? 'text-amber-300'
                            : s.includes('secured') || s.includes('reserved') || s.includes('Confirmed')
                            ? 'text-emerald-300'
                            : 'text-white/60'
                        }`}
                      >
                        <span className="text-white/20 select-none">›</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-all"
                >
                  Book Another Demo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
                >
                  Done & View Calendar
                </button>
              </div>
            </div>
          )}

          {/* Form when not viewing results */}
          {!result && mode === 'ai' && (
            <form onSubmit={handleAiSubmit} className="space-y-4">
              {/* Quick test prompt chips */}
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-2">
                  Test Scenarios (Click to try conflict resolution):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {quickPrompts.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrompt(q.prompt);
                        setContactName(q.name);
                        setPhoneNumber(q.phone);
                      }}
                      className="text-left p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/30 text-[11px] text-white/70 transition-all group"
                    >
                      <span className="font-semibold text-white/90 group-hover:text-emerald-400 block mb-0.5">
                        {q.label}
                      </span>
                      <span className="text-[10px] text-white/40 truncate block">{q.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Natural Language Prompt Input */}
              <div>
                <label className="text-xs font-semibold text-white/75 block mb-1.5">
                  AI Booking Instructions / Prompt:
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Book a demo with John tomorrow at 3 PM"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    required
                  />
                  <Sparkles className="absolute right-3 top-3 w-4 h-4 text-emerald-400/50 pointer-events-none" />
                </div>
              </div>

              {/* Attendee Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/75 block mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    Attendee Name:
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/75 block mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-white/40" />
                    WhatsApp Number:
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Conflict Resolver Toggle */}
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Smart Conflict Resolver</p>
                    <p className="text-[10px] text-white/50">
                      If requested slot is occupied, automatically search & book next open slot (e.g. 2:30 PM)
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBookNext}
                    onChange={(e) => setAutoBookNext(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      AI Verifying Slots & Booking...
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      Book Demo with AI
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!result && mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/75 block mb-1.5 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-white/40" />
                    Meeting Date:
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/75 block mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    Time Slot:
                  </label>
                  <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full bg-[#13151c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {[
                      '09:00',
                      '09:30',
                      '10:00',
                      '10:30',
                      '11:00',
                      '11:30',
                      '12:00',
                      '12:30',
                      '13:00',
                      '13:30',
                      '14:00',
                      '14:30',
                      '15:00',
                      '15:30',
                      '16:00',
                      '16:30',
                      '17:00',
                      '17:30',
                    ].map((t) => (
                      <option key={t} value={t}>
                        {new Date(`2000-01-01T${t}:00`).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/75 block mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    Client Name:
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/75 block mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-white/40" />
                    Phone Number:
                  </label>
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/75 block mb-1.5">
                  Meeting Agenda / Notes:
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking & Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
