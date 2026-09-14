'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Activity,
  FileSearch,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'DASHBOARD',
    items: [
      { label: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'TENANTS & BUSINESSES',
    items: [
      { label: 'All Businesses', href: '/admin/tenants', icon: Building2 },
      { label: 'Active', href: '/admin/tenants?status=active', icon: Building2 },
      { label: 'Suspended', href: '/admin/tenants?status=suspended', icon: Building2 },
    ],
  },
  {
    title: 'USERS & STAFF',
    items: [
      { label: 'User Directory', href: '/admin/users', icon: Users },
      { label: 'Platform Staff', href: '/admin/users?role=staff', icon: ShieldCheck },
      { label: 'Roles & Permissions', href: '/admin/settings?tab=roles', icon: ShieldCheck },
    ],
  },
  {
    title: 'BILLING & PLANS',
    items: [
      { label: 'Subscription Plans', href: '/admin/billing/plans', icon: CreditCard },
      { label: 'Subscriptions', href: '/admin/billing/subscriptions', icon: CreditCard },
      { label: 'Payments', href: '/admin/billing/payments', icon: CreditCard },
      { label: 'Invoices', href: '/admin/billing/invoices', icon: CreditCard },
    ],
  },
  {
    title: 'WHATSAPP & META',
    items: [
      { label: 'Overview', href: '/admin/whatsapp', icon: MessageSquare },
      { label: 'WABA Accounts', href: '/admin/whatsapp/wabas', icon: Building2 },
      { label: 'Webhook Inspector', href: '/admin/whatsapp/webhooks', icon: Activity },
      { label: 'Meta Configuration', href: '/admin/whatsapp/meta-config', icon: Settings },
    ],
  },
  {
    title: 'SYSTEM & LOGS',
    items: [
      { label: 'System Health', href: '/admin/monitoring', icon: Activity },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileSearch },
      { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = () => setMobileOpen((v) => !v);
    window.addEventListener('toggle-admin-sidebar', handler);
    return () => window.removeEventListener('toggle-admin-sidebar', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href || pathname === '/admin';
    const base = href.split('?')[0];
    return pathname === base || pathname.startsWith(base + '/');
  };

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const SidebarContent = (
    <>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-white tracking-tight truncate">Wazzi Admin</p>
          <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Platform Console</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {navSections.map((section) => {
          const isCollapsed = collapsed[section.title];
          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors cursor-pointer"
              >
                <span>{section.title}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? 'bg-white/[0.08] text-white border border-white/[0.08] shadow-sm'
                            : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-400' : 'text-white/40'}`} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                            {item.badge}
                          </span>
                        )}
                        {active && <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/[0.06] space-y-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-xs font-semibold text-emerald-400 transition-colors"
        >
          <Building2 className="w-4 h-4" />
          <span className="flex-1">Client Portal</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Link>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`w-64 flex-shrink-0 flex flex-col bg-[#0d0f18] border-r border-white/[0.06] min-h-screen transition-transform duration-200 ${
          mobileOpen ? 'fixed inset-y-0 left-0 z-50 shadow-2xl translate-x-0' : 'fixed -translate-x-full lg:relative lg:translate-x-0 z-30 hidden lg:flex'
        }`}
      >
        {SidebarContent}
      </aside>
      {/* Mobile drawer when hidden lg is still needed for toggle */}
      {mounted && (
        <div className="lg:hidden">
          {mobileOpen && (
            <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0d0f18] border-r border-white/[0.06] shadow-2xl flex lg:hidden">
              {SidebarContent}
            </aside>
          )}
        </div>
      )}
    </>
  );
}
