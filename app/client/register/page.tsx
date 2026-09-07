'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function ClientRegisterPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          name,
          email,
          phoneNumber,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      router.push(data.redirectUrl || '/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f15] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[110px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/auth/portal" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-tight">WazzApp AI</span>
            <span className="text-[10px] text-emerald-400 block -mt-1 font-semibold uppercase tracking-wider">
              Client Portal
            </span>
          </div>
        </Link>
        <Link
          href="/client/login"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          Already have an account? <span className="text-emerald-400 font-semibold">Sign In</span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="relative z-10 w-full max-w-lg mx-auto px-6 py-8">
        <div className="bg-[#131620] border border-emerald-500/20 rounded-3xl p-8 shadow-2xl shadow-emerald-500/5">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Register Your Business</h1>
            <p className="text-xs text-white/50 mt-1">
              Create your organization and launch your AI WhatsApp assistant
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Company / Organization Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Global or Swift Logistics"
                  required
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full bg-[#0a0c10] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full bg-[#0a0c10] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Set Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
                  minLength={6}
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-white/40 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Automatically provisions your private business workspace</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Full access to AI Chatbots, Broadcasts & Team Inbox</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Launch Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <div className="mt-5 text-center text-xs text-white/50 pt-4 border-t border-white/[0.06]">
            Already registered?{' '}
            <Link
              href="/client/login"
              className="text-emerald-400 font-semibold hover:underline"
            >
              Sign In to your workspace
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 text-center text-[11px] text-white/30">
        WazzApp AI Client Portal &bull; Multi-Tenant Business Architecture
      </footer>
    </div>
  );
}
