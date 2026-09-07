'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function AdminRegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          adminKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Admin registration failed.');
      }

      router.push(data.redirectUrl || '/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultKey = () => {
    setAdminKey('admin-secret-2026');
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/10 rounded-full blur-[110px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/auth/portal" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-tight">WazzApp Platform</span>
            <span className="text-[10px] text-indigo-400 block -mt-1 font-semibold uppercase tracking-wider">
              Admin Console
            </span>
          </div>
        </Link>
        <Link
          href="/admin/login"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          Already an admin? <span className="text-indigo-400 font-semibold">Sign In</span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-8">
        <div className="bg-[#10131c] border border-indigo-500/20 rounded-3xl p-8 shadow-2xl shadow-indigo-500/10">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Register Admin</h1>
            <p className="text-xs text-white/50 mt-1">
              Create a Super Administrator account with platform control privileges
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
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Platform Engineer"
                  required
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-indigo-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@wazzapp.com"
                  required
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-indigo-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Admin Password (min. 6 chars)
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
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-indigo-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white/70">
                  Master Admin Secret Key
                </label>
                <button
                  type="button"
                  onClick={fillDefaultKey}
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Use dev key
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter ADMIN_SECRET_KEY"
                  required
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-indigo-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none font-mono transition-all"
                />
              </div>
              <p className="text-[10px] text-white/30 mt-1">
                Required security pass to prevent unauthorized administrative escalation.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Admin...</span>
                </>
              ) : (
                <>
                  <span>Create Administrator Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account */}
          <div className="mt-5 text-center text-xs text-white/50 pt-4 border-t border-white/[0.06]">
            Already have an administrator account?{' '}
            <Link
              href="/admin/login"
              className="text-indigo-400 font-semibold hover:underline"
            >
              Sign In here
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 text-center text-[11px] text-white/30">
        WazzApp AI Platform Administration &bull; High-Security Access Plane
      </footer>
    </div>
  );
}
