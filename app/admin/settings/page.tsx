'use client';

import { useState, Suspense } from 'react';
import { Settings, ShieldCheck, Globe, CreditCard, Mail, Database, Languages, KeyRound, Palette } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const tabs = [
  { id: 'general', label: 'General', icon: Settings, desc: 'System preferences • Branding • Localization • Maintenance' },
  { id: 'auth', label: 'Authentication', icon: KeyRound, desc: 'Auth pages • Login • Registration • OTP • Password policy • Social login' },
  { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, desc: 'Platform roles: SUPER_ADMIN • PLATFORM_ADMIN • SUPPORT • FINANCE • OPERATIONS' },
  { id: 'meta', label: 'Meta', icon: Globe, desc: 'Meta configuration • Embedded signup • Webhooks • System User • API' },
  { id: 'channels', label: 'Channels', icon: Globe, desc: 'WhatsApp • Instagram • Facebook Messenger • Telegram' },
  { id: 'ai', label: 'AI', icon: Settings, desc: 'AI Providers • Models • Configuration • Cost controls' },
  { id: 'billing', label: 'Billing', icon: CreditCard, desc: 'Payment gateways • Currency • Tax • Invoice settings' },
  { id: 'email', label: 'Email', icon: Mail, desc: 'Email provider • SMTP • Templates' },
  { id: 'storage', label: 'Storage', icon: Database, desc: 'Provider • File limits' },
  { id: 'limits', label: 'Limits', icon: Settings, desc: 'File • API • Platform limits' },
];

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get('tab') || 'general';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Settings className="w-6 h-6 text-indigo-400" /> Platform Settings</h1>
        <p className="text-xs text-white/40 mt-1">General • Auth • Meta • Channels • AI • Billing • Email • Storage • Localization • Limits</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => router.push(`/admin/settings?tab=${t.id}`)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${isActive ? 'bg-white text-black border-white' : 'bg-white/[0.06] text-white/60 border-white/[0.08] hover:bg-white/[0.10]'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6">
        {active === 'general' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">System Preferences</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><p className="font-bold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-indigo-400" /> Branding</p><p className="text-white/40 mt-1">Logo, favicon, primary color, app name — Wazzi App</p></div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><p className="font-bold text-white flex items-center gap-2"><Languages className="w-4 h-4 text-emerald-400" /> Localization</p><p className="text-white/40 mt-1">Languages • Currency • Timezone (default UTC, per-workspace override)</p></div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><p className="text-xs font-bold text-amber-400">Maintenance Mode</p><p className="text-xs text-white/60">Toggle to show maintenance banner to clients. Stored as platform setting.</p><button className="mt-3 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold opacity-60 cursor-not-allowed">Enable Maintenance</button></div>
          </div>
        )}

        {active === 'roles' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Roles & Permissions</h3>
            <div className="space-y-3">
              {[
                { role: 'SUPER_ADMIN', level: 100, perms: 'All platform permissions (PLATFOMR_SUPER)', color: 'purple' },
                { role: 'PLATFORM_ADMIN', level: 80, perms: 'Tenants, Users, Billing view, WhatsApp view, Analytics, Monitoring', color: 'indigo' },
                { role: 'FINANCE_ADMIN', level: 60, perms: 'Billing view/manage/refund, Tenants view, Analytics', color: 'emerald' },
                { role: 'OPERATIONS_ADMIN', level: 60, perms: 'WhatsApp manage, AI, Campaigns, Automations, Monitoring', color: 'blue' },
                { role: 'SUPPORT_ADMIN', level: 40, perms: 'Tenants view, Users view, Support manage, Audit view', color: 'amber' },
              ].map((r) => (
                <div key={r.role} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex justify-between">
                  <div><p className="text-sm font-bold text-white">{r.role}</p><p className="text-xs text-white/40">Level {r.level} • {r.perms}</p></div>
                  <span className="px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-bold text-white/60 h-fit">Level {r.level}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/30">Workspace roles: OWNER &gt; ADMIN &gt; MANAGER &gt; MEMBER &gt; AGENT &gt; VIEWER (unchanged for tenant isolation).</p>
            <p className="text-[11px] text-white/30 font-mono">lib/auth/roles.ts • lib/auth/permissions.ts — PLATFORM_ROLE_PERMISSIONS</p>
          </div>
        )}

        {active === 'auth' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Authentication</h3>
            <p className="text-xs text-white/40">Auth Page Setup • Login • Registration • Forgot Password • OTP • Password Policy • Social Login (Auth0) • Admin master key registration at /admin/register</p>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><p className="text-xs font-bold text-white">ADMIN_SECRET_KEY</p><p className="text-[11px] text-white/40 font-mono">env: ADMIN_SECRET_KEY=admin-secret-2026 (change in production)</p></div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><p className="text-xs font-bold text-white">Client vs Admin portals</p><p className="text-xs text-white/40">Middleware routes: /admin/* requires wazzapp_role=admin + isSuperAdmin; /dashboard/* requires workspace. Separate login pages: /admin/login vs /client/login vs /auth/portal.</p></div>
          </div>
        )}

        {active === 'meta' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Meta</h3>
            <p className="text-xs text-white/40">Centralize FB_APP_ID, FB_APP_SECRET, FB_VERIFY_TOKEN, ABLY_KEY, etc. Env vars remain primary; DB meta_configurations provides UI-editable overlay with encryption.</p>
            <Link href="/admin/whatsapp/meta-config" className="inline-flex px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold">Open Meta Configuration →</Link>
          </div>
        )}

        {active === 'billing' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Billing</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><p className="text-xs font-bold text-white">Payment Gateways</p><p className="text-xs text-white/40">Razorpay • Stripe — configure keys in environment (mock mode when unset)</p></div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><p className="text-xs font-bold text-white">Currency / Tax / Invoices</p><p className="text-xs text-white/40">Default USD • tax_percent per plan • invoice_number unique • due_date • paid_at</p></div>
            </div>
          </div>
        )}

        {active !== 'general' && active !== 'roles' && active !== 'auth' && active !== 'meta' && active !== 'billing' && (
          <div>
            <h3 className="text-sm font-bold text-white capitalize">{active}</h3>
            <p className="text-xs text-white/40 mt-1">{tabs.find((t) => t.id === active)?.desc}</p>
            <div className="mt-4 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-xs text-white/30">Configuration UI for <strong className="text-white/60">{active}</strong> — extend as platform needs grow. All settings are platform-scoped and audited.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white">Limits</h3>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"><p className="font-bold text-white">File Limits</p><p className="text-white/40">Max upload, storage provider</p></div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"><p className="font-bold text-white">API Limits</p><p className="text-white/40">Rate limit per second (campaigns default 50)</p></div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"><p className="font-bold text-white">Platform Limits</p><p className="text-white/40">Plan entitlements → subscription override_limits</p></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/40 text-xs">Loading platform settings...</div>}>
      <AdminSettingsContent />
    </Suspense>
  );
}
