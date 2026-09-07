// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import Link from 'next/link';
import {
  MessageSquare,
  ShieldCheck,
  Building2,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  Bot,
  Zap,
} from 'lucide-react';
import publicConfig from '@/app/publicConfig';
import { getAppDetails } from '@/app/api/beUtils';

export default async function LoggedOut() {
  const { appId } = publicConfig;
  const appDetails = await getAppDetails(appId);
  const appName = appDetails._configError ? 'WazzApp AI' : appDetails.name;

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white flex flex-col justify-between p-4 sm:p-8 selection:bg-emerald-500 selection:text-white">
      {/* Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center max-w-2xl mx-auto pt-4 sm:pt-10 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-emerald-400 font-semibold mb-4">
          <MessageSquare className="w-4 h-4" />
          {appName} Cloud Platform
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Sign In to Your Portal
        </h1>
        <p className="text-sm sm:text-base text-white/60">
          Client businesses and platform administrators are strictly separated into dedicated access portals.
        </p>
      </div>

      {/* Two Column Portal Selection */}
      <div className="relative z-10 w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-12">
        {/* Track 1: Client Portal */}
        <div className="bg-[#11131a]/90 border border-emerald-500/25 hover:border-emerald-500/50 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 shadow-2xl shadow-emerald-500/5 hover:shadow-emerald-500/15">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Client Portal
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Business & User Access</h2>
            <p className="text-xs text-white/50 leading-relaxed mb-6">
              Access your business WhatsApp CRM, configure autonomous AI agents, trigger broadcast marketing campaigns, and manage team chats.
            </p>

            <div className="space-y-2 mb-6 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Agents & Customer Support</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Agent Shared Inbox</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Marketing Campaigns & Contacts</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
            <Link
              href="/client/login"
              className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Client Sign In</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/client/register"
              className="flex items-center justify-center w-full px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 rounded-xl font-semibold text-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400 mr-2" />
              <span>Register New Business</span>
            </Link>
          </div>
        </div>

        {/* Track 2: Admin Console */}
        <div className="bg-[#11131a]/90 border border-indigo-500/25 hover:border-indigo-500/50 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 shadow-2xl shadow-indigo-500/5 hover:shadow-indigo-500/15">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Admin Console
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Platform Administration</h2>
            <p className="text-xs text-white/50 leading-relaxed mb-6">
              Administrative control plane for platform operators to manage Meta WhatsApp Business Accounts, phone certificates, and webhooks.
            </p>

            <div className="space-y-2 mb-6 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Meta WABAs & Cloud API Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Phone Registration & Webhook Debugger</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>System Configuration & Multi-Tenant</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
            <Link
              href="/admin/login"
              className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Admin Sign In</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/admin/register"
              className="flex items-center justify-center w-full px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 rounded-xl font-semibold text-xs transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400 mr-2" />
              <span>Register Admin Account</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-2 text-xs text-white/40 pb-4">
        <p>
          By continuing, you agree to the{' '}
          <a
            href="https://opensource.fb.com/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="https://opensource.fb.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
