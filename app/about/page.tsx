import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import FinalCTA from '@/components/marketing/FinalCTA';
import {
  Sparkles,
  ShieldCheck,
  Users,
  TrendingUp,
  Cpu,
  Globe2,
  HeartHandshake,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us — Wazzi App',
  description:
    'Learn how Wazzi App is transforming customer conversations into business engines using autonomous AI, shared team inbox, and official Meta WhatsApp Cloud API.',
};

export default function AboutPage() {
  const values = [
    {
      title: 'AI + Human Synergy',
      description:
        'We believe AI should empower human teams, not replace them. Wazzi automates repetitive inquiries so your experts can focus on empathy, complex negotiations, and building lasting client relationships.',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Zero Hallucinations',
      description:
        'Accuracy is non-negotiable in business communications. Our models are strictly grounded in your verified company documents, catalogs, and URLs with transparent citation tracing.',
      icon: Cpu,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Enterprise Privacy & Isolation',
      description:
        'Your conversations and customer records belong exclusively to you. We maintain strict tenant isolation, end-to-end encryption, and never use customer data to train public foundation models.',
      icon: Lock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Measurable Outcomes',
      description:
        'We measure our success by your conversion rates, CSAT gains, and deflection efficiency. Every feature is engineered to deliver a tangible, verifiable return on investment.',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="py-20 bg-gradient-to-b from-blue-50/40 via-white to-[#FAFAFC] border-b border-slate-200/70 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Our Mission</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Turn conversations into your most powerful business engine.
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Over 2.5 billion people communicate on WhatsApp every day. Wazzi App bridges the gap between customer
              messaging and modern enterprise software.
            </p>
          </div>
        </section>

        {/* The Story / Problem & Solution */}
        <section className="py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Built from the ground up for the AI era.
              </h2>
              <p className="text-slate-600 leading-relaxed text-base">
                For years, businesses attempted to manage WhatsApp through clunky personal phones, disconnected web
                extensions, or rudimentary keyword auto-responders that frustrated customers. Meanwhile, modern teams
                demanded CRM synchronization, collaborative internal notes, strict SLAs, and intelligent automation.
              </p>
              <p className="text-slate-600 leading-relaxed text-base">
                Wazzi App was founded to solve this dilemma. By combining official Meta WhatsApp Business Cloud APIs
                with state-of-the-art autonomous AI agents and shared team queues, we created an enterprise-grade
                platform where conversations convert directly into qualified leads, delighted customers, and lasting
                growth.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              {[
                { label: 'Founded', value: '2024' },
                { label: 'Official Partner', value: 'Meta Cloud API' },
                { label: 'Uptime Standard', value: '99.9%' },
                { label: 'Data Security', value: 'SOC2 & GDPR' },
              ].map((s) => (
                <div key={s.label} className="bg-[#FAFAFC] p-4 rounded-2xl border border-slate-200 text-center">
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-20 bg-[#FAFAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Our Core Principles</h2>
              <p className="text-slate-600 text-base">
                The architectural principles and values that guide how we engineer Wazzi App every day.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-2xs hover:shadow-lg transition-all space-y-4"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${v.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${v.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{v.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{v.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
