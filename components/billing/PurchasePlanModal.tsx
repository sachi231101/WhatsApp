'use client';

import { useState } from 'react';
import {
  Check,
  Gem,
  ArrowRight,
  X,
  Sparkles,
  Zap,
  Building2,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface PurchasePlanModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onProceedCheckout?: (planDetails: {
    planId: string;
    planName: string;
    cycle: BillingCycle;
    monthlyPrice: number;
    totalPrice: number;
    includeAiAddon: boolean;
  }) => void;
  isEmbedded?: boolean; // When rendered inline in /billing page
}

interface PlanDefinition {
  id: string;
  name: string;
  subtitle: string;
  isNew?: boolean;
  valueTag?: string;
  baseMonthlyPrice: number; // in INR
  isCustom?: boolean;
  featuresHeader?: string;
  features: string[];
  hasAddon?: boolean;
  addonText?: string;
  addonPrice?: number;
}

const PLANS: PlanDefinition[] = [
  {
    id: 'basic',
    name: 'BASIC',
    subtitle: 'Get started fast',
    baseMonthlyPrice: 1500,
    features: [
      'Up to 10 Tags',
      'Up to 5 Custom Attributes',
      'Up to 2 Segments',
      'Up to 10 Lists',
      'Unlimited Contacts',
      'Standard Cloud API Access',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    subtitle: 'Growth Marketer',
    baseMonthlyPrice: 3200,
    featuresHeader: 'All Basic features and:',
    features: [
      'Up to 100 Tags',
      'Up to 20 Custom Attributes',
      'Up to 10 Segments',
      'Up to 25 Lists',
      'Campaign Automation Flows',
      'Shared Inbox & Agent Routing',
    ],
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    subtitle: 'Expert Marketer',
    isNew: true,
    valueTag: 'Features worth ₹43,750 included',
    baseMonthlyPrice: 9100,
    featuresHeader: 'All Pro features and:',
    features: [
      'Priority Support 24/7',
      'Higher Messaging Speed – 250 msgs/sec (₹5,000/mo included)',
      'Custom RAG Knowledge Base',
      'Multi-agent AI Autopilot',
      'Advanced Campaign Analytics',
    ],
  },
  {
    id: 'unlimited',
    name: 'UNLIMITED',
    subtitle: 'Everything, no limits',
    isNew: true,
    valueTag: 'Features worth ₹2,00,000 included',
    baseMonthlyPrice: 45000,
    featuresHeader: 'All Premium features and:',
    features: [
      '3 Custom Webhooks (₹6,000/mo included)',
      'Unlimited Campaign Blasts',
      'Unlimited Contact Segments',
      'Dedicated API Throughput Channel',
    ],
    hasAddon: true,
    addonText: 'AI Chat Agent',
    addonPrice: 3500,
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    subtitle: 'Built for enterprise scale',
    isCustom: true,
    baseMonthlyPrice: 0,
    featuresHeader: 'All Unlimited features and:',
    features: [
      'Custom Segment Limits',
      'Custom List Limits',
      'Dedicated 1:1 Account Manager',
      'Custom SLA & Security Review',
      'Multi-WABA & Multi-Tenant Setup',
    ],
  },
];

export default function PurchasePlanModal({
  isOpen = true,
  onClose,
  onProceedCheckout,
  isEmbedded = false,
}: PurchasePlanModalProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('unlimited');
  const [includeAiAddon, setIncludeAiAddon] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  if (!isOpen && !isEmbedded) return null;

  // Cycle multipliers and discounts
  const discountMultiplier = cycle === 'yearly' ? 0.9 : cycle === 'quarterly' ? 0.95 : 1.0;
  const cycleMonths = cycle === 'yearly' ? 12 : cycle === 'quarterly' ? 3 : 1;

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[3];

  const calculateMonthlyPrice = (base: number) => {
    return Math.round(base * discountMultiplier);
  };

  const calculateTotalPrice = () => {
    if (selectedPlan.isCustom) return 0;
    const monthlyRate = calculateMonthlyPrice(selectedPlan.baseMonthlyPrice);
    const addonMonthly =
      selectedPlan.hasAddon && includeAiAddon ? selectedPlan.addonPrice || 0 : 0;
    return (monthlyRate + addonMonthly) * cycleMonths;
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutSuccess(true);
      if (onProceedCheckout) {
        onProceedCheckout({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          cycle,
          monthlyPrice: calculateMonthlyPrice(selectedPlan.baseMonthlyPrice),
          totalPrice: calculateTotalPrice(),
          includeAiAddon,
        });
      }
    }, 1200);
  };

  const content = (
    <div className="w-full bg-[#12141c] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
      {/* ─── Header: Title & Cycle Selector ─── */}
      <div className="p-6 pb-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Purchase Plan
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Choose the perfect WhatsApp Marketing & AI Automation tier for your business.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Cycle Pills */}
          <div className="flex items-center p-1 bg-[#1a1d28] border border-white/10 rounded-2xl">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cycle === 'monthly'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle('quarterly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cycle === 'quarterly'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Quarterly <span className="text-[10px] text-emerald-200 font-semibold">(5% Off)</span>
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                cycle === 'yearly'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Yearly <span className="text-[10px] text-emerald-200 font-semibold">(10% Off)</span>
            </button>
          </div>

          {onClose && !isEmbedded && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 14-Day Free Trial Promo Banner ─── */}
      <div className="mx-6 mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-teal-950/50 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Gem className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              Unlock Everything for 14 Days—Free!
            </h3>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Access Flows, AI Chat Agents, and all PRO plan features to elevate your marketing strategy.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedPlanId('pro');
            handleCheckout();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-102"
        >
          <span>Start Free Trial Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Plan Cards Grid ─── */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const monthlyRate = calculateMonthlyPrice(plan.baseMonthlyPrice);

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`relative rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-[#181d28] border-2 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/50 scale-[1.02]'
                  : 'bg-[#141620] border border-white/[0.08] hover:border-white/20 hover:bg-[#161924]'
              }`}
            >
              {/* Top Row: Name, Subtitle, Radio Button & New Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    {plan.isNew && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                        ✦ New
                      </span>
                    )}
                    <h3 className="text-base font-black tracking-tight text-white">{plan.name}</h3>
                    <p className="text-[11px] text-emerald-400 font-medium">{plan.subtitle}</p>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500 text-white'
                        : 'border-white/30 bg-transparent'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Price Display */}
                <div className="my-3">
                  {plan.isCustom ? (
                    <div className="py-2">
                      <span className="text-xl font-black text-white">Custom Pricing</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">
                          ₹{monthlyRate.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-white/50">/month</span>
                      </div>
                      {cycle !== 'monthly' && (
                        <p className="text-[10px] text-white/40 line-through">
                          ₹{plan.baseMonthlyPrice.toLocaleString('en-IN')} /mo
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Value tag badge if any */}
                {plan.valueTag && (
                  <div className="mb-3 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                    {plan.valueTag}
                  </div>
                )}

                {/* Feature Header */}
                {plan.featuresHeader && (
                  <p className="text-[11px] font-bold text-white/80 mb-2 border-t border-white/[0.06] pt-2">
                    {plan.featuresHeader}
                  </p>
                )}

                {/* Features List */}
                <div className="space-y-2 text-[11px] text-white/70">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Add-ons for Unlimited */}
                {plan.hasAddon && (
                  <div className="mt-4 pt-3 border-t border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                      ADDONS
                    </span>
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={includeAiAddon}
                        onChange={(e) => setIncludeAiAddon(e.target.checked)}
                        className="mt-0.5 rounded accent-emerald-500 cursor-pointer"
                      />
                      <div className="text-[11px]">
                        <div className="font-bold text-white flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {plan.addonText}
                        </div>
                        <span className="text-[10px] text-white/50">
                          ₹{plan.addonPrice?.toLocaleString('en-IN')}/mo (charged separately)
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Sticky Bottom Checkout Bar ─── */}
      <div className="p-5 px-8 bg-[#0b0c12] border-t border-white/[0.1] flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              SELECTED PLAN
            </span>
            <span className="text-base font-black text-emerald-400">{selectedPlan.name} Plan</span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              BILLING CYCLE
            </span>
            <span className="text-sm font-bold text-white capitalize">{cycle}</span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              TOTAL AMOUNT
            </span>
            {selectedPlan.isCustom ? (
              <span className="text-base font-black text-white">Custom Proposal</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white">
                  ₹{calculateTotalPrice().toLocaleString('en-IN')}.00
                </span>
                <span className="text-xs text-white/50">
                  {cycle === 'yearly' ? '/year' : cycle === 'quarterly' ? '/quarter' : '/month'}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Connecting Checkout...</span>
            </div>
          ) : checkoutSuccess ? (
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="w-4 h-4" />
              <span>Plan Activated!</span>
            </div>
          ) : (
            <>
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-7xl my-8">{content}</div>
    </div>
  );
}
