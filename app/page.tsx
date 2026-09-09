import type { Metadata } from 'next';
import Navbar from '@/components/marketing/Navbar';
import Hero from '@/components/marketing/Hero';
import TrustSection from '@/components/marketing/TrustSection';
import InboxShowcase from '@/components/marketing/InboxShowcase';
import AIAgentsShowcase from '@/components/marketing/AIAgentsShowcase';
import AutomationShowcase from '@/components/marketing/AutomationShowcase';
import AnalyticsShowcase from '@/components/marketing/AnalyticsShowcase';
import HowItWorks from '@/components/marketing/HowItWorks';
import AICollaboration from '@/components/marketing/AICollaboration';
import TeamSection from '@/components/marketing/TeamSection';
import PricingPreview from '@/components/marketing/PricingPreview';
import FAQ from '@/components/marketing/FAQ';
import FinalCTA from '@/components/marketing/FinalCTA';
import Footer from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: 'Wazzi App — Turn WhatsApp conversations into your business engine',
  description:
    'Connect WhatsApp, automate conversations, empower your team with AI, and turn every customer interaction into measurable business outcomes.',
  openGraph: {
    title: 'Wazzi App — AI-Powered WhatsApp Business Platform',
    description:
      'Shared team inbox, custom AI agents, visual workflow automation, and real-time conversation analytics on the official Meta Cloud API.',
    siteName: 'Wazzi App',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wazzi App — Turn WhatsApp conversations into your business engine',
    description:
      'Connect WhatsApp, automate conversations, empower your team with AI, and turn every customer interaction into measurable business outcomes.',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. Navbar */}
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* 2. Hero */}
        <Hero />

        {/* 3. Positioning / Trust Section */}
        <TrustSection />

        {/* 4. WhatsApp Shared Inbox Showcase */}
        <InboxShowcase />

        {/* 5. AI Agents Showcase */}
        <AIAgentsShowcase />

        {/* 6. Automation Showcase */}
        <AutomationShowcase />

        {/* 7. Analytics Showcase */}
        <AnalyticsShowcase />

        {/* 8. How Wazzi Works */}
        <HowItWorks />

        {/* 9. AI + Human Collaboration */}
        <AICollaboration />

        {/* 10. Team Collaboration */}
        <TeamSection />

        {/* 11. Pricing Preview */}
        <PricingPreview />

        {/* 12. FAQ */}
        <FAQ />

        {/* 13. Final CTA */}
        <FinalCTA />
      </main>

      {/* 14. Footer */}
      <Footer />
    </div>
  );
}
