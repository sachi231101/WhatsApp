'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import FinalCTA from '@/components/marketing/FinalCTA';
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  const tiers = [
    {
      name: 'Starter',
      badge: 'For Early-Stage Businesses',
      description: 'Everything you need to launch WhatsApp business messaging and AI automated deflection.',
      monthlyPrice: '$49',
      annualPrice: '$39',
      unit: '/ month billed annually',
      highlighted: false,
      ctaText: 'Start Free Trial',
      ctaHref: '/client/register',
      features: [
        '1 Official WhatsApp Business Number',
        '1,000 Included Conversations / mo',
        '2 Custom AI Agents (RAG Grounded)',
        '3 Team Member Seats',
        'Shared Inbox & Internal Notes',
        'Standard Email & Chat Support',
      ],
    },
    {
      name: 'Growth',
      badge: 'Most Popular for Scaling Teams',
      description: 'Advanced multi-agent collaboration, workflow automations, CRM syncing, and high volume.',
      monthlyPrice: '$149',
      annualPrice: '$119',
      unit: '/ month billed annually',
      highlighted: true,
      ctaText: 'Start Free Trial',
      ctaHref: '/client/register',
      features: [
        'Up to 3 WhatsApp Business Numbers',
        '5,000 Included Conversations / mo',
        'Unlimited AI Agents & Personas',
        '10 Team Member Seats',
        'Visual Workflow & Automation Builder',
        'HubSpot, Shopify & Webhook Integrations',
        'Real-time Analytics & CSAT Reports',
        'Priority 24/7 SLA Support',
      ],
    },
    {
      name: 'Enterprise',
      badge: 'For High-Volume Operations',
      description: 'Dedicated cloud infrastructure, custom LLM fine-tuning, security audits, and tailored SLAs.',
      monthlyPrice: 'Custom',
      annualPrice: 'Custom',
      unit: 'Tailored to your scale',
      highlighted: false,
      ctaText: 'Contact Enterprise Sales',
      ctaHref: '/contact',
      features: [
        'Unlimited WhatsApp Numbers & WABAs',
        '100,000+ Scalable Conversations',
        'Custom Fine-Tuned AI Models & Prompts',
        'Unlimited Team Seats & Granular RBAC',
        'Dedicated Cloud Architecture & Meta VIP Routing',
        'Custom Data Residency & SOC2 Audit Reports',
        'Dedicated Technical Account Manager',
        'Custom Integration & Onboarding SLAs',
      ],
    },
  ];

  const comparisonRows = [
    { feature: 'Official Meta Cloud API', starter: 'Yes', growth: 'Yes', enterprise: 'Yes (Dedicated)' },
    { feature: 'Included Conversations / mo', starter: '1,000', growth: '5,000', enterprise: '100,000+' },
    { feature: 'Team Member Seats', starter: '3 seats', growth: '10 seats', enterprise: 'Unlimited' },
    { feature: 'Custom AI Agents', starter: '2 agents', growth: 'Unlimited', enterprise: 'Unlimited + Fine-Tuned' },
    { feature: 'Knowledge Base (RAG)', starter: '10 docs / URLs', growth: 'Unlimited', enterprise: 'Custom Enterprise RAG' },
    { feature: 'Visual Workflow Builder', starter: false, growth: 'Unlimited', enterprise: 'Unlimited + Multi-branch' },
    { feature: 'Broadcast Campaigns', starter: 'Basic', growth: 'Advanced Segmentation', enterprise: 'High-Throughput Enterprise' },
    { feature: 'HubSpot & Webhook Sync', starter: false, growth: true, enterprise: true },
    { feature: 'Real-time CSAT Analytics', starter: 'Standard', growth: 'Detailed', enterprise: 'Custom BI + Raw Data Export' },
    { feature: 'Data Residency & Compliance', starter: 'US / EU Standard', growth: 'US / EU Standard', enterprise: 'Dedicated Regional Host' },
    { feature: 'Support SLA', starter: '24h Response', growth: '4h Priority', enterprise: '15m Dedicated TAM' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="py-18 bg-gradient-to-b from-blue-50/40 via-white to-[#FAFAFC] border-b border-slate-200/70 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transparent &amp; Scalable Plans</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Start small. Scale with your conversations.
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Every plan includes official Meta WhatsApp Cloud API access, sub-second AI latency, and our shared team inbox.
            </p>

            {/* Annual switch */}
            <div className="pt-6 flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className="relative w-12 h-6.5 bg-slate-200 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Toggle Annual Billing"
              >
                <div
                  className={`w-5.5 h-5.5 bg-blue-600 rounded-full transition-transform ${
                    annual ? 'translate-x-5.5 bg-blue-600' : 'translate-x-0 bg-white shadow-xs'
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
                  Annual Billing
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
              {tiers.map((t) => (
                <div
                  key={t.name}
                  className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 ${
                    t.highlighted
                      ? 'bg-gradient-to-b from-blue-50/50 via-white to-white border-2 border-blue-600 shadow-xl shadow-blue-500/10 relative'
                      : 'bg-white border border-slate-200/90 shadow-2xs hover:shadow-lg'
                  }`}
                >
                  {t.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="px-3.5 py-1 text-xs font-bold text-white bg-blue-600 rounded-full shadow-md shadow-blue-500/25">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold text-slate-900">{t.name}</h2>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 min-h-[36px] mb-6">{t.description}</p>

                    <div className="mb-6 pb-6 border-b border-slate-200/70">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                          {annual ? t.annualPrice : t.monthlyPrice}
                        </span>
                        {t.annualPrice !== 'Custom' && (
                          <span className="text-xs text-slate-500 font-medium">{t.unit}</span>
                        )}
                      </div>
                      {annual && t.annualPrice !== 'Custom' && (
                        <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Includes 20% annual discount
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 mb-8">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">What&apos;s Included:</p>
                      {t.features.map((feat) => (
                        <div key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Link
                      href={t.ctaHref}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-2 ${
                        t.highlighted
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      <span>{t.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Comparison Matrix Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-6 sm:p-10 overflow-hidden">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Detailed Feature Comparison</h2>
                <p className="text-xs text-slate-500 mt-1">Everything mapped out side-by-side.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 font-bold text-slate-900">Capability</th>
                      <th className="py-3 px-4 text-center">Starter</th>
                      <th className="py-3 px-4 text-center text-blue-600">Growth</th>
                      <th className="py-3 px-4 text-center">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparisonRows.map((row) => (
                      <tr key={row.feature} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{row.feature}</td>
                        <td className="py-3.5 px-4 text-center text-slate-600">
                          {typeof row.starter === 'boolean' ? (
                            row.starter ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            row.starter
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-blue-600">
                          {typeof row.growth === 'boolean' ? (
                            row.growth ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            row.growth
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {typeof row.enterprise === 'boolean' ? (
                            row.enterprise ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            row.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
