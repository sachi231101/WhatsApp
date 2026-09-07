'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Bot,
  Brain,
  Zap,
  Megaphone,
  BarChart3,
  UserPlus,
  Settings,
  HelpCircle,
  ChevronDown,
  Zap as ZapIcon,
  Crown,
  ArrowRight,
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  isAI?: boolean;
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageSquare, label: 'Inbox', href: '/inbox', badge: '12' },
  { icon: Users, label: 'Contacts', href: '/contacts' },
];

const aiNav: NavItem[] = [
  { icon: Bot, label: 'AI Agents', href: '/ai-agents' },
  { icon: Brain, label: 'Knowledge Base', href: '/knowledge-base' },
  { icon: Zap, label: 'Automations', href: '/automations' },
  { icon: Megaphone, label: 'Campaigns', href: '/campaigns' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
];

const bottomNav: NavItem[] = [
  { icon: UserPlus, label: 'Team', href: '/team' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function ClientSidebar() {
  const pathname = usePathname();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-[#4F6EF7] text-white shadow-md shadow-blue-500/25'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
        <item.icon className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-gray-400'}`} style={{ width: 18, height: 18 }} />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-500'}`}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] flex items-center justify-center shadow-lg">
            <ZapIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Wazzi App</p>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 leading-snug ml-0.5 pl-11">Your WhatsApp business,<br />powered by AI.</p>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 mb-3">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all border border-gray-100"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-800 truncate">ABC Academy</p>
            <p className="text-[10px] text-gray-400 truncate">Workspace</p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* AI Section */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">AI</p>
        </div>
        {aiNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="px-3 pb-2 space-y-0.5 border-t border-gray-100 pt-3">
        {bottomNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Plan Badge */}
      <div className="px-3 pb-3 pt-1">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-semibold text-amber-800">You&apos;re on</p>
          </div>
          <p className="text-sm font-bold text-amber-900 mb-2">Professional Plan</p>
          <button className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
            Upgrade <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* User Footer */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-600 flex-shrink-0">
            SK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">Sachin Kumar</p>
            <p className="text-[10px] text-gray-400 truncate">sachin@abcacademy.com</p>
          </div>
          <div className="text-gray-400">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Help & Support at bottom */}
      <div className="px-3 pb-4">
        <Link
          href="/help"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all"
        >
          <HelpCircle className="w-4 h-4 text-gray-400" />
          Help &amp; Support
        </Link>
      </div>
    </aside>
  );
}
