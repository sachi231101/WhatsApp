'use client';

import { Palette } from 'lucide-react';
import Link from 'next/link';

export default function MarketingPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Palette className="w-6 h-6 text-pink-400" /> Marketing / CMS</h1>
        <p className="text-xs text-white/40 mt-1">Landing Page Setup • Page Management • Testimonials • FAQ • Header Banner • SEO</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Landing Page', desc: 'Hero, Features, Pricing, FAQ, CTA', href: '/', cta: 'Open Landing' },
          { title: 'Testimonials', desc: 'Customer stories & social proof', href: '/about', cta: 'Manage' },
          { title: 'FAQ Management', desc: 'Help & onboarding questions', href: '/features', cta: 'Edit FAQs' },
          { title: 'Header Banner', desc: 'Announcement & promo banner', href: '/pricing', cta: 'Configure' },
          { title: 'SEO', desc: 'Title, description, OG image, sitemap', href: '/privacy', cta: 'SEO Settings' },
          { title: 'Page Management', desc: 'About, Contact, Pricing, Features', href: '/contact', cta: 'Pages' },
        ].map((c) => (
          <div key={c.title} className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white">{c.title}</h3>
            <p className="text-xs text-white/40 mt-1">{c.desc}</p>
            <Link href={c.href} className="mt-4 inline-flex px-3 py-2 rounded-xl bg-white text-black text-xs font-bold">{c.cta}</Link>
          </div>
        ))}
      </div>

      <div className="bg-[#11141f] border border-white/[0.06] rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-white">CMS is file-based today</p>
        <p className="text-xs text-white/40 mt-1">Marketing components live in <span className="font-mono text-white/60">components/marketing/*</span> (Hero, FAQ, PricingPreview, etc.). Extend with a headless CMS (e.g. Sanity/Contentful) when needed without touching client SaaS.</p>
      </div>
    </div>
  );
}
