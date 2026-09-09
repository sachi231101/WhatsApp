'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ArrowRight,
  Sparkles,
  Zap,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export default function PricingPreview() {
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

  return (
    <section id="pricing" className="py-20 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>Flexible Plans</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Start small. Scale with your conversations.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Transparent pricing designed for growing businesses. Upgrade, downgrade, or customize anytime.
          </p>

          {/* Billing Switch */}
          <div className="pt-4 flex items-center justify-center gap-3">
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

        {/* 3 Tier Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 ${
                t.highlighted
                  ? 'bg-gradient-to-b from-blue-50/50 via-white to-white border-2 border-blue-600 shadow-xl shadow-blue-500/10 relative'
                  : 'bg-[#FAFAFC] border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-lg'
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
                  <h3 className="text-xl font-bold text-slate-900">{t.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {t.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 min-h-[36px] mb-6">{t.description}</p>

                {/* Price */}
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
                      Includes 20% annual discount applied at checkout
                    </p>
                  )}
                </div>

                {/* Features */}
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
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg'
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

        {/* Link to Full Pricing Matrix */}
        <div className="mt-12 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>Compare all features in detailed comparison matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
