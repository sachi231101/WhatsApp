// Client Portal Layout — WhatsApp AI SaaS
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

import ClientSidebar from './components/ClientSidebar';
import ClientTopbar from './components/ClientTopbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Dashboard — WazzApp AI',
  description: 'AI-powered WhatsApp Business Platform',
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} flex h-screen bg-[#f5f6fa] text-gray-900 overflow-hidden`}>
      {/* Sidebar */}
      <ClientSidebar />
      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ClientTopbar />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
