'use client';

import { useState } from 'react';
import {
  CreditCard,
  Download,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  TrendingUp,
  Receipt,
  FileText,
  ExternalLink,
} from 'lucide-react';
import PurchasePlanModal, { type BillingCycle } from '@/components/billing/PurchasePlanModal';

interface Invoice {
  id: string;
  date: string;
  plan: string;
  amount: string;
  status: 'paid' | 'pending';
  receiptUrl: string;
}

const PAST_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-0891',
    date: 'Sep 1, 2026',
    plan: 'Unlimited Plan + AI Chat Agent',
    amount: '₹48,500.00',
    status: 'paid',
    receiptUrl: '#',
  },
  {
    id: 'INV-2026-0742',
    date: 'Aug 1, 2026',
    plan: 'Pro Plan',
    amount: '₹3,200.00',
    status: 'paid',
    receiptUrl: '#',
  },
  {
    id: 'INV-2026-0610',
    date: 'Jul 1, 2026',
    plan: 'Basic Plan',
    amount: '₹1,500.00',
    status: 'paid',
    receiptUrl: '#',
  },
];

export default function BillingPage() {
  const [showModal, setShowModal] = useState(false);
  const [activePlan, setActivePlan] = useState('Unlimited Plan');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePlanCheckout = (planDetails: {
    planId: string;
    planName: string;
    cycle: BillingCycle;
    monthlyPrice: number;
    totalPrice: number;
  }) => {
    setActivePlan(`${planDetails.planName} Plan`);
    setToastMessage(`Successfully switched to ${planDetails.planName} (${planDetails.cycle})!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-2xl shadow-emerald-500/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Subscription & Billing Plans
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Choose from flexible self-serve plans, add AI chat capabilities, and manage invoices.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-bold text-white transition-all cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-emerald-400" />
          <span>Open as Modal</span>
        </button>
      </div>

      {/* Current Subscription Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#13151c] border border-white/[0.08] rounded-2xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1">
            CURRENT PLAN
          </span>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-black text-white">{activePlan}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
              Active
            </span>
          </div>
          <span className="text-xs text-white/50">Next renewal on Oct 1, 2026</span>
        </div>

        <div className="bg-[#13151c] border border-white/[0.08] rounded-2xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1">
            BILLING CYCLE
          </span>
          <span className="text-lg font-black text-white">Monthly</span>
          <p className="text-xs text-emerald-400 mt-1">Switch to Yearly to save 10%</p>
        </div>

        <div className="bg-[#13151c] border border-white/[0.08] rounded-2xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1">
            META API BALANCE
          </span>
          <span className="text-lg font-black text-white">₹14,250.00</span>
          <p className="text-xs text-white/40 mt-1">Prepaid WhatsApp Conversation Credits</p>
        </div>

        <div className="bg-[#13151c] border border-white/[0.08] rounded-2xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-1">
            AI CHAT AGENT ADD-ON
          </span>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-lg font-black text-amber-300">Enabled</span>
          </div>
          <p className="text-xs text-white/40 mt-1">₹3,500/mo active subscription</p>
        </div>
      </div>

      {/* ─── Embedded Purchase Plan Matrix ─── */}
      <div>
        <PurchasePlanModal
          isOpen={true}
          isEmbedded={true}
          onProceedCheckout={handlePlanCheckout}
        />
      </div>

      {/* ─── Invoices & Billing History ─── */}
      <div className="bg-[#13151c] border border-white/[0.08] rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Billing History & GST Invoices</h2>
          </div>
          <span className="text-xs text-white/40">Invoices include 18% GST for India billing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-white/40 font-semibold">
                <th className="pb-3 font-medium">Invoice Number</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Plan Description</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {PAST_INVOICES.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 font-bold text-white">{inv.id}</td>
                  <td className="py-3.5 text-white/60">{inv.date}</td>
                  <td className="py-3.5 text-white/80">{inv.plan}</td>
                  <td className="py-3.5 font-bold text-white">{inv.amount}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 capitalize">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => alert(`Downloading ${inv.id}.pdf...`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standalone Popup Modal for Testing */}
      {showModal && (
        <PurchasePlanModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onProceedCheckout={(details) => {
            handlePlanCheckout(details);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
