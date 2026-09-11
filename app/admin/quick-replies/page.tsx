'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function QuickRepliesPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><MessageCircle className="w-6 h-6 text-emerald-400" /> Quick Replies</h1>
        <p className="text-xs text-white/40 mt-1">Quick Reply List • Create • Categories • Usage</p>
      </div>
      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-8 text-center">
        <p className="text-sm font-bold text-white">Quick Replies</p>
        <p className="text-xs text-white/40 mt-1">Tenant-crafted canned responses for inbox. Platform view aggregates usage by workspace. Manage templates at <Link href="/templates" className="text-indigo-400 hover:underline">/templates</Link> (client) or create global defaults here.</p>
        <div className="mt-4 flex justify-center gap-2">
          <span className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/60">Categories: Greeting • Pricing • Support</span>
          <span className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/60">Usage analytics soon</span>
        </div>
      </div>
    </div>
  );
}
