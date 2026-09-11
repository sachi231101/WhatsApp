import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Building2,
  MessageSquare,
  Webhook,
  Key,
  Activity,
  LogOut,
  ChevronRight,
  Sparkles,
  Globe,
} from 'lucide-react';

export const metadata = {
  title: 'Platform Administration Console — Wazzi App',
  description: 'Manage Meta WhatsApp Business Accounts, webhooks, and infrastructure.',
};

export default async function AdminHomePage() {
  const user = await getSessionUser();

  // If not logged in, redirect to admin login
  if (!user) {
    redirect('/admin/login');
  }

  // If a client accidentally lands here, send them to their dashboard
  if (user.role !== 'admin' && !user.isSuperAdmin) {
    redirect('/dashboard');
  }

  redirect('/admin/dashboard');

  const adminModules = [
    {
      title: 'WhatsApp Accounts',
      description: 'Manage connected WABAs, phone numbers and embedded signup',
      href: '/my-wabas',
      icon: MessageSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Webhook Events',
      description: 'View and debug incoming Meta webhook payloads',
      href: '/my-webhooks',
      icon: Webhook,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      title: 'Facebook Pages',
      description: 'Connected Facebook Pages for your Meta App',
      href: '/my-pages',
      icon: Globe,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      title: 'Ad Accounts',
      description: 'View Meta Ad accounts linked to your Business',
      href: '/my-ad-accounts',
      icon: Activity,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      title: 'Catalogs',
      description: 'Product catalogs linked through your Meta Business',
      href: '/my-catalogs',
      icon: Building2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      title: 'Datasets',
      description: 'CAPI Datasets and offline event sets',
      href: '/my-datasets',
      icon: Key,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090b10] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 border-b border-white/[0.07] bg-[#0d0f18]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">Wazzi App Admin</span>
              <span className="text-[10px] text-indigo-400 block -mt-1 font-semibold uppercase tracking-wider">
                Platform Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-white/50 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {user.email}
            </div>
            <Link
              href="/api/auth/logout"
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Super Admin Console
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome back, {user.name || 'Admin'} 👋
          </h1>
          <p className="text-sm text-white/50">
            Platform control plane — manage WABAs, webhooks, Meta API infrastructure, and multi-tenant operations.
          </p>
        </div>

        {/* Admin stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Platform Role', value: user.isSuperAdmin ? 'Super Admin' : 'Admin', accent: 'text-indigo-400' },
            { label: 'Session Status', value: 'Active', accent: 'text-emerald-400' },
            { label: 'Admin Email', value: user.email, accent: 'text-white/70' },
            { label: 'Console Version', value: 'v2.0', accent: 'text-purple-400' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#11141f] border border-white/[0.06] rounded-2xl px-5 py-4"
            >
              <p className="text-[11px] text-white/40 mb-1 font-medium uppercase tracking-wider">{stat.label}</p>
              <p className={`text-sm font-bold truncate ${stat.accent}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Module cards */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
            Admin Modules
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group bg-[#11141f] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 flex items-start gap-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/20"
                >
                  <div className={`w-10 h-10 rounded-xl ${mod.bg} border ${mod.border} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-5 h-5 ${mod.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-white/90">{mod.title}</h3>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 flex-shrink-0 transition-colors" />
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">{mod.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Client SaaS section */}
        <div className="mt-8 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Client SaaS Portal</p>
                <p className="text-xs text-white/40">Access the client business dashboard (as Super Admin)</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-2 rounded-xl transition-all"
            >
              Open Client Dashboard
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
