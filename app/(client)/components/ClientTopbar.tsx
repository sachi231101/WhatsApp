'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Command,
  Menu,
} from 'lucide-react';

export default function ClientTopbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount] = useState(3);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((j) => { if (j.authenticated) setCurrentUser(j.user); })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/portal');
  };

  const pathname = usePathname();

  const getSearchPlaceholder = () => {
    if (pathname.includes('/contacts')) return 'Search contacts, tags, or filters...';
    if (pathname.includes('/inbox')) return 'Search conversations, contacts...';
    return 'Search messages, contacts, or campaigns...';
  };

  const displayName = 'Sachin Kumar';
  const displayRole = 'Admin';

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 sm:gap-4">
      {/* Mobile Menu Trigger */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
        className="md:hidden p-1.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label="Open Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            className="w-full pl-9 pr-16 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-400 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[11px] text-gray-400 font-medium">
            <Command className="w-3 h-3" /> K
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all border border-gray-200 cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5 text-gray-700" style={{ width: 18, height: 18 }} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                <span className="text-[11px] text-blue-500 font-medium cursor-pointer hover:underline">Mark all read</span>
              </div>
              {[
                { text: 'New lead from Rahul Sharma', time: '2 min ago', dot: 'bg-blue-500' },
                { text: 'AI resolved 12 conversations', time: '15 min ago', dot: 'bg-green-500' },
                { text: 'Campaign report is ready', time: '1 hr ago', dot: 'bg-purple-500' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.dot}`} />
                  <div>
                    <p className="text-xs text-gray-700 font-medium">{n.text}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-gray-50 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
              SK
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{displayName}</p>
              <p className="text-[11px] text-gray-400 leading-tight">{displayRole}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-800 truncate">{currentUser?.name || 'User'}</p>
                <p className="text-[11px] text-gray-400 truncate">{currentUser?.email || ''}</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-all">
                  <User className="w-3.5 h-3.5 text-gray-400" /> My Profile
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-all">
                  <Settings className="w-3.5 h-3.5 text-gray-400" /> Settings
                </button>
                <div className="border-t border-gray-50 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
