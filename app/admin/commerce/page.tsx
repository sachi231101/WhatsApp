'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Package, CreditCard, Calendar } from 'lucide-react';
import { AdminStatCard } from '@/components/admin/AdminCard';

export default function CommercePage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch('/api/admin/commerce').then(r=>r.json()).then(j=>{ if(j.status==='ok') setData(j.data); }); }, []);
  if (!data) return <div className="p-6 text-white/40 text-sm">Loading commerce…</div>;
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-amber-400" /> Commerce — Platform</h1>
        <p className="text-xs text-white/40 mt-1">Products • Services • Courses • Digital Products • Orders • Bookings • Payments • Analytics</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Products" value={data.totalProducts ?? 0} icon={Package} iconBg="bg-blue-500/10" iconColor="text-blue-400" />
        <AdminStatCard label="Orders" value={data.totalOrders ?? 0} icon={ShoppingBag} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
        <AdminStatCard label="Bookings" value={data.totalBookings ?? 0} icon={Calendar} iconBg="bg-purple-500/10" iconColor="text-purple-400" />
        <AdminStatCard label="Revenue" value={`$${data.revenue ?? 0}`} icon={CreditCard} accent="text-emerald-400" iconBg="bg-emerald-500/10" iconColor="text-emerald-400" />
      </div>
      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-8 text-center">
        <p className="text-sm font-bold text-white">Commerce monitoring</p>
        <p className="text-xs text-white/40 mt-1 max-w-xl mx-auto">Product catalog, orders, bookings and commerce payments will appear here when commerce is enabled in workspaces. This view provides platform-level aggregation once commerce tables are populated.</p>
      </div>
    </div>
  );
}
