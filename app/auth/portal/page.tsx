'use client';

import Link from 'next/link';
import {
  MessageSquare,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  Zap,
  Bot,
  Lock,
} from 'lucide-react';

export default function AuthPortalPage() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight tracking-tight">WazzApp AI</h1>
            <p className="text-xs text-white/40">Enterprise WhatsApp Cloud Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-white/50 bg-white/[0.04] border border-white/[0.08] px-3.5 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Multi-Tenant Auth Active
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-emerald-400 font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Separated Role-Based Portals
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Choose Your Access Portal
          </h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed">
            Please select the appropriate portal for your role. Client businesses and platform administrators maintain separate authentication and workspaces.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Track 1: Client & Business Portal */}
          <div className="relative group bg-[#11131a]/80 backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-500/40 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10">
            <div className="absolute top-6 right-6">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Business & Teams
              </span>
            </div>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                Client Business Portal
              </h3>
              <p className="text-xs text-white/50 leading-relaxed mb-6">
                Log in to access your business workspace, manage AI customer service agents, broadcast marketing campaigns, and collaborate in the shared WhatsApp team inbox.
              </p>

              <div className="space-y-2 mb-8 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Autonomous Chatbots & Knowledge Base</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Shared Team Inbox & Live WhatsApp Chats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Automations, Contacts & Broadcasts</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <Link
                href="/client/login"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In as Client</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
              <Link
                href="/client/register"
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Register New Business Account</span>
              </Link>
            </div>
          </div>

          {/* Track 2: Platform Admin & Developer Console */}
          <div className="relative group bg-[#11131a]/80 backdrop-blur-xl border border-indigo-500/20 hover:border-indigo-500/40 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="absolute top-6 right-6">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Super Admins Only
              </span>
            </div>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                Admin Console
              </h3>
              <p className="text-xs text-white/50 leading-relaxed mb-6">
                System control plane for platform administrators, DevOps, and Meta developers to oversee WhatsApp Business Accounts (WABAs), Webhook events, and multi-tenant tenants.
              </p>

              <div className="space-y-2 mb-8 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Meta Cloud API & WABA Infrastructure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Phone Number Certificates & Webhook Logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Global Organization & Multi-Tenant Oversight</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <Link
                href="/admin/login"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In as Admin</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
              <Link
                href="/admin/register"
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Register Admin (Master Key Required)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Testing Credentials Box */}
        <div className="max-w-2xl mx-auto mt-10 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <p className="text-xs text-white/40 mb-2 font-medium">Demo Testing Accounts (Pre-configured):</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20">
              Client: client@company.com / Client@123456
            </span>
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg border border-indigo-500/20">
              Admin: admin@wazzapp.com / Admin@123456
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-white/30 border-t border-white/[0.05]">
        WazzApp AI WhatsApp Business Platform &bull; Role-separated authentication architecture
      </footer>
    </div>
  );
}
