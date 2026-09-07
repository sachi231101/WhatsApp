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
    <div className={`${inter.variable} flex h-screen bg-[#0f1117] text-white overflow-hidden`}>
      {/* Sidebar */}
      <ClientSidebar />
      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ClientTopbar />
        <main className="flex-1 overflow-y-auto bg-[#0f1117] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
