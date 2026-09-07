'use client';

import {
  FileText,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export default function TemplatesPage() {
  const templates = [
    {
      id: 't-01',
      name: 'festival_discount_v2',
      category: 'MARKETING',
      status: 'APPROVED',
      language: 'en_US',
      body: '🎉 Festive Sale: Enjoy up to 25% off on our Pro WhatsApp AI Plans! Use code FESTIVE25 at checkout. Reply STOP to opt out.',
    },
    {
      id: 't-02',
      name: 'order_confirmation',
      category: 'UTILITY',
      status: 'APPROVED',
      language: 'en_US',
      body: 'Hi {{1}}, your order #{{2}} has been confirmed and is being packaged. Track your delivery status here: {{3}}',
    },
    {
      id: 't-03',
      name: 'demo_scheduled_reminder',
      category: 'UTILITY',
      status: 'APPROVED',
      language: 'en_US',
      body: 'Hi {{1}}, this is a quick reminder for your upcoming live demo call with {{2}} scheduled for {{3}}.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Meta Message Templates
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Create, manage and sync official WhatsApp Business templates pre-approved by Meta.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:opacity-90 transition-all cursor-pointer">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-all">
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.05] text-white/60">
                  {t.category}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {t.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white font-mono mb-2">{t.name}</h3>
              <p className="text-xs text-white/60 leading-relaxed bg-[#0f1118] p-3 rounded-xl border border-white/[0.04]">
                {t.body}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-white/30">
              <span>Lang: {t.language}</span>
              <span className="text-emerald-400 font-semibold cursor-pointer hover:underline">Use in Campaign →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
