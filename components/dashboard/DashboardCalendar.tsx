'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  MessageSquare,
  Bot,
  User,
  Plus,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Loader2,
  Phone,
} from 'lucide-react';
import { AiDemoBookingModal } from './AiDemoBookingModal';

export interface DemoBookingItem {
  id: string;
  workspaceId: string;
  contactId?: string | null;
  contactName: string;
  contactEmail?: string | null;
  phoneNumber: string;
  title: string;
  scheduledAt: string; // ISO string
  durationMinutes: number;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';
  bookedBy: 'ai' | 'manual' | 'customer';
  meetLink?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface DashboardCalendarProps {
  onNotificationUpdate?: () => void;
}

export function DashboardCalendar({ onNotificationUpdate }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<DemoBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch bookings for the current month view (including adjacent week boundaries)
      const startOfMonth = new Date(year, month - 1, 20);
      const endOfMonth = new Date(year, month + 1, 10);

      const res = await fetch(
        `/api/bookings?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`,
      );
      const json = await res.json();
      if (json.status === 'ok') {
        setBookings(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleBookingSuccess = () => {
    fetchBookings();
    if (onNotificationUpdate) {
      onNotificationUpdate();
    }
  };

  const handleCancelBooking = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel this demo meeting?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Helper to check if two dates are the same calendar day
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Filter bookings for selected date
  const selectedDateBookings = bookings.filter((b) =>
    isSameDay(new Date(b.scheduledAt), selectedDate),
  );

  // Group bookings by date string (YYYY-MM-DD)
  const bookingsByDate: Record<string, DemoBookingItem[]> = {};
  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    const d = new Date(b.scheduledAt);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (!bookingsByDate[key]) bookingsByDate[key] = [];
    bookingsByDate[key].push(b);
  }

  // Next upcoming bookings across all dates
  const upcomingBookings = bookings
    .filter((b) => b.status !== 'cancelled' && new Date(b.scheduledAt) >= new Date(Date.now() - 3600000))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  return (
    <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden p-6 space-y-6">
      {/* Calendar Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Demo & Meeting Calendar</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              {bookings.filter((b) => b.status !== 'cancelled').length} Scheduled
            </span>
          </div>
          <p className="text-xs text-white/40">
            Real-time calendar synced with WhatsApp AI Agent booking & conflict detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBookings}
            disabled={loading}
            title="Refresh bookings"
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            Today
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 hover:opacity-90 transition-all group"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Book Demo with AI</span>
            <Sparkles className="w-3 h-3 text-emerald-200 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Grid: Month Calendar on Left (2 cols), Schedule Details on Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Interactive Calendar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Month Header & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {monthNames[month]} {year}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-white/40 mb-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Prev month fill days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-20 rounded-xl p-1.5 bg-white/[0.01] border border-white/[0.02] text-white/20 select-none flex flex-col justify-between"
                >
                  <span className="text-xs">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(year, month, dayNum);
              const isToday = isSameDay(cellDate, new Date());
              const isSelected = isSameDay(cellDate, selectedDate);
              const dateKey = `${year}-${month + 1}-${dayNum}`;
              const dayBookings = bookingsByDate[dateKey] || [];
              const hasBookings = dayBookings.length > 0;

              return (
                <div
                  key={`cur-${dayNum}`}
                  onClick={() => setSelectedDate(cellDate)}
                  className={`h-20 rounded-xl p-2 cursor-pointer transition-all border flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                      : isToday
                      ? 'bg-white/[0.04] border-emerald-500/30 hover:bg-white/[0.07]'
                      : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold rounded-md w-5 h-5 flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isToday
                          ? 'text-emerald-400 font-bold'
                          : 'text-white/80 group-hover:text-white'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>

                  {/* Booking Badges */}
                  <div className="space-y-1 overflow-hidden">
                    {hasBookings && (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span
                          className={`text-[10px] font-medium truncate px-1 rounded ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-white/[0.06] text-white/70'
                          }`}
                        >
                          {dayBookings.length} {dayBookings.length === 1 ? 'Demo' : 'Demos'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Column: Selected Date Schedule & Next Upcoming */}
        <div className="space-y-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Day Schedule
                </h3>
                <p className="text-xs font-semibold text-white/80 mt-0.5">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs flex items-center gap-1"
                title="Book a demo on this day"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">Book</span>
              </button>
            </div>

            {/* List of demos for selected day */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-6 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Loading schedule...
                </div>
              ) : selectedDateBookings.length > 0 ? (
                selectedDateBookings.map((booking) => {
                  const bDate = new Date(booking.scheduledAt);
                  const timeFormatted = bDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <div
                      key={booking.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                            {timeFormatted}
                          </span>
                          {booking.bookedBy === 'ai' ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-[9px] font-semibold text-purple-300 flex items-center gap-1">
                              <Bot className="w-2.5 h-2.5" />
                              AI Booked
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 text-[9px] font-semibold text-blue-300 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              Manual
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleCancelBooking(booking.id, e)}
                          disabled={deletingId === booking.id}
                          className="text-white/20 hover:text-red-400 transition-colors p-1"
                          title="Cancel meeting"
                        >
                          {deletingId === booking.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {booking.contactName}
                      </h4>
                      <p className="text-[11px] text-white/40 truncate">{booking.title}</p>

                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1 text-white/50">
                          <Phone className="w-3 h-3 text-white/30" />
                          <span>{booking.phoneNumber}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {booking.meetLink && (
                            <a
                              href={booking.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center gap-1 font-semibold transition-all"
                            >
                              <Video className="w-3 h-3" />
                              Meet
                            </a>
                          )}
                          <Link
                            href="/inbox"
                            className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center gap-1 transition-all"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Chat
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto text-white/30">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-white/50">No demos scheduled on this day.</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    + Book Demo with AI
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Demos Snippet */}
          {upcomingBookings.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">
                Next Upcoming Demos
              </p>
              <div className="space-y-1.5">
                {upcomingBookings.slice(0, 2).map((up) => (
                  <div
                    key={up.id}
                    onClick={() => setSelectedDate(new Date(up.scheduledAt))}
                    className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] cursor-pointer text-xs flex items-center justify-between"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-white/80 block truncate">
                        {up.contactName}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {new Date(up.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(up.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold flex-shrink-0">
                      View
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Demo Booking Modal */}
      <AiDemoBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookingSuccess={handleBookingSuccess}
        initialDate={selectedDate}
      />
    </div>
  );
}
