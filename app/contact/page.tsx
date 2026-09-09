'use client';

import { useState } from 'react';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import {
  MessageSquare,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Phone,
  Send,
} from 'lucide-react';

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    teamSize: '11-50',
    inquiryType: 'Enterprise Sales & Demo',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate submission state
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900 selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Get In Touch</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              Talk to our product &amp; sales specialists.
            </h1>
            <p className="text-base sm:text-lg text-slate-600">
              Whether you need an enterprise demo, pricing quote, or technical onboarding assistance,
              we are here to help your team succeed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
            {/* Left: Contact Form (lg:col-span-7) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xl shadow-slate-900/5">
              {formSubmitted ? (
                <div className="py-12 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Message Received!</h2>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Thank you, <span className="font-semibold text-slate-800">{formData.name}</span>. A dedicated
                    enterprise solution specialist from Wazzi App will review your requirements and respond to{' '}
                    <span className="font-semibold text-slate-800">{formData.email}</span> within 2 hours.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => setFormSubmitted(false)}
                      className="px-6 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 mb-2">Send us a message</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-xs font-bold text-slate-700">
                        Full Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Sarah Connor"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-xs font-bold text-slate-700">
                        Work Email *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="sarah@company.com"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="company" className="text-xs font-bold text-slate-700">
                        Company Name *
                      </label>
                      <input
                        id="company"
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Global Inc."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="text-xs font-bold text-slate-700">
                        WhatsApp / Phone Number
                      </label>
                      <input
                        id="phone"
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="teamSize" className="text-xs font-bold text-slate-700">
                        Team Size
                      </label>
                      <select
                        id="teamSize"
                        value={formData.teamSize}
                        onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      >
                        <option value="1-10">1 – 10 Team Members</option>
                        <option value="11-50">11 – 50 Team Members</option>
                        <option value="51-200">51 – 200 Team Members</option>
                        <option value="200+">200+ Enterprise</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="inquiryType" className="text-xs font-bold text-slate-700">
                        Inquiry Purpose
                      </label>
                      <select
                        id="inquiryType"
                        value={formData.inquiryType}
                        onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      >
                        <option value="Enterprise Sales & Demo">Enterprise Sales &amp; Demo</option>
                        <option value="Custom AI Agent Architecture">Custom AI Agent Architecture</option>
                        <option value="Pricing & Volume Quote">Pricing &amp; Volume Quote</option>
                        <option value="Partnership / Integration">Partnership / Integration</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-xs font-bold text-slate-700">
                      How can we help your business? *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your current WhatsApp volume, use cases, or specific AI agent needs..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-6 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <span>Submit Request</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right: Direct Channels & Information (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              {/* WhatsApp Quick Connect Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-3xl border border-emerald-500/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Chat with Wazzi on WhatsApp</h3>
                    <p className="text-xs text-emerald-700 font-medium">Instant AI Demo Experience</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Want to see our autonomous AI agents in action right now? Send a WhatsApp message to our verified
                  demonstration channel.
                </p>
                <a
                  href="https://wa.me/message/wazziapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 rounded-xl shadow-2xs hover:bg-emerald-50 transition-colors"
                >
                  <span>Open WhatsApp Chat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Direct Info */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Contact</h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-700">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">sales@wazzapp.com</p>
                      <p className="text-slate-400 text-[11px]">Enterprise consultations &amp; custom quotes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-900">&lt; 15 Minute First Response</p>
                      <p className="text-slate-400 text-[11px]">Monday – Friday, 24-hour global coverage</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Official Meta Cloud API Partner</p>
                      <p className="text-slate-400 text-[11px]">Compliant and certified business operations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
