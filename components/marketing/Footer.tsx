import Link from 'next/link';
import { Sparkles, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
          {/* Brand Column (md:col-span-2) */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Wazzi App</span>
            </Link>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              AI-powered customer conversations for modern businesses. Turn WhatsApp into your primary revenue and
              retention engine with autonomous agents, shared inbox, and visual workflows.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Official Meta WhatsApp Business Cloud API Partner</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Product</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#ai-agents" className="hover:text-white transition-colors">
                  AI Agents
                </Link>
              </li>
              <li>
                <Link href="/#automation" className="hover:text-white transition-colors">
                  Automations
                </Link>
              </li>
              <li>
                <Link href="/#inbox-showcase" className="hover:text-white transition-colors">
                  Shared Inbox
                </Link>
              </li>
              <li>
                <Link href="/#analytics" className="hover:text-white transition-colors">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Company</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Legal */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Resources &amp; Legal</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Help Center / FAQ
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Wazzi App. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Engineered with precision for modern global businesses</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
