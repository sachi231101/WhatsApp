'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  HelpCircle,
  ChevronDown,
  FolderKanban,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  connectedNumber: string;
  isActive: boolean;
}

export default function ClientTopbar() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data)) {
        setWorkspaces(json.data);
        const current = json.data.find((w: Workspace) => w.isActive) || json.data[0];
        setActiveWorkspace(current || null);
      }
    } catch (err) {
      console.error('Failed to load topbar workspaces:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch topbar notifications:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchNotifications();

    const handleUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('wazzapp:notification-update', handleUpdate);
    return () => {
      window.removeEventListener('wazzapp:notification-update', handleUpdate);
    };
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) {
      setDropdownOpen(false);
      return;
    }

    try {
      setSwitching(true);
      const res = await fetch('/api/workspaces/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) {
        setDropdownOpen(false);
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 bg-[#13151c] border-b border-white/[0.06] z-20">
      {/* Left side: Project Selector + Search */}
      <div className="flex items-center gap-4">
        {/* Project Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-white transition-all cursor-pointer"
          >
            <FolderKanban className="w-4 h-4 text-emerald-400" />
            <span className="max-w-[140px] truncate">
              {activeWorkspace?.name || 'Default Project'}
            </span>
            <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#181a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-white/[0.06]">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Switch Business Project
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto py-1">
                {workspaces.map((ws) => {
                  const isCurrent = ws.id === activeWorkspace?.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws.id)}
                      disabled={switching}
                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-white/[0.05] transition-colors cursor-pointer ${
                        isCurrent ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-white/80'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="block truncate">{ws.name}</span>
                        <span className="text-[10px] text-white/35 font-mono">
                          {ws.connectedNumber !== 'N/A' ? ws.connectedNumber : 'No WhatsApp Linked'}
                        </span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-2 border-t border-white/[0.06] bg-black/20">
                <Link
                  href="/projects"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-all"
                >
                  <span>All Projects & Create</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Global Search */}
        <div className="flex items-center gap-2 w-64 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 group focus-within:border-emerald-500/40 transition-all hidden md:flex">
          <Search className="w-3.5 h-3.5 text-white/25 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Search conversations, contacts..."
            className="bg-transparent text-xs text-white/60 placeholder-white/25 outline-none flex-1"
          />
          <kbd className="text-[10px] text-white/20 font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Right side: WhatsApp status + Actions */}
      <div className="flex items-center gap-3">
        {/* WhatsApp status badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-medium">
            {activeWorkspace?.connectedNumber && activeWorkspace.connectedNumber !== 'N/A'
              ? activeWorkspace.connectedNumber
              : 'WhatsApp Ready'}
          </span>
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              notifOpen
                ? 'bg-white/[0.08] text-white'
                : 'text-white/40 hover:text-white/75 hover:bg-white/[0.05]'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-emerald-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white/20 rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#13151c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0d0e12]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[10px] text-emerald-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.linkUrl || '/dashboard'}
                      onClick={() => setNotifOpen(false)}
                      className={`block p-3.5 hover:bg-white/[0.04] transition-all group ${
                        !n.isRead ? 'bg-emerald-500/[0.03]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/90 group-hover:text-emerald-300 transition-colors">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 mt-0.5">
                            {n.message}
                          </p>
                          <p className="text-[9px] text-white/30 mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-white/40">
                    <p className="font-medium text-white/60 mb-0.5">No notifications yet</p>
                    <p className="text-[11px] text-white/30">
                      When AI books a demo, you&apos;ll be notified here!
                    </p>
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-white/[0.06] bg-white/[0.01] text-center">
                <Link
                  href="/dashboard"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] text-white/40 hover:text-white transition-colors"
                >
                  View Calendar on Dashboard →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User profile avatar linking to /projects */}
        <Link
          href="/projects"
          className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-lg hover:bg-white/[0.05] transition-all"
          title="Switch Projects"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e65100] to-[#ff9800] flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
            S
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-white/80 leading-none">Sachin</p>
            <p className="text-[10px] text-white/30 leading-none mt-0.5">Admin</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
