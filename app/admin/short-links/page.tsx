'use client';

import { Link2, QrCode } from 'lucide-react';
export default function ShortLinksPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Link2 className="w-6 h-6 text-blue-400" /> Short Links</h1>
        <p className="text-xs text-white/40 mt-1">All Links • Create Link • QR Codes • Click Analytics • Conversion Analytics</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Link2 className="w-4 h-4 text-indigo-400" /> Short Links</h3>
          <p className="text-xs text-white/40 mt-1">Create branded short URLs for campaigns & messages.</p>
          <button className="mt-4 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold opacity-60 cursor-not-allowed">Create Link (coming)</button>
        </div>
        <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><QrCode className="w-4 h-4 text-emerald-400" /> QR Codes</h3>
          <p className="text-xs text-white/40 mt-1">Generate QR codes for each short link.</p>
          <button className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/60 cursor-not-allowed">Generate QR</button>
        </div>
      </div>
      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6 text-center">
        <p className="text-xs text-white/30">Click & conversion analytics will appear here once links are created.</p>
      </div>
    </div>
  );
}
