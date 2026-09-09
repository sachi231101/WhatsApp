'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Loader2, AlertCircle, Building2, Globe } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setWorkspaceName(val);
    if (!slugTouched) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
      setSlug(generated);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/workspace/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName.trim(),
          slug: slug.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'We couldn’t load your workspace. Try again.');
      }

      // Redirect directly to the client application
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'We couldn’t create your workspace. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f15] text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Wazzi App</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-8">
        <div className="bg-[#131620] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-blue-500/5">
          {/* Welcome Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome to Wazzi App</h1>
            <p className="text-xs text-white/50 mt-1.5">
              Let&apos;s create your workspace.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Creation Form */}
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div>
              <label htmlFor="workspace-name" className="block text-xs font-semibold text-white/70 mb-1.5">
                Workspace name
              </label>
              <div className="relative">
                <input
                  id="workspace-name"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Global"
                  required
                  autoFocus
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="workspace-url" className="block text-xs font-semibold text-white/70 mb-1.5">
                Workspace URL
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs text-white/30 select-none flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  wazzi.app/
                </span>
                <input
                  id="workspace-url"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="acme-global"
                  required
                  className="w-full bg-[#0a0c10] border border-white/10 focus:border-blue-500/50 rounded-xl pl-24 pr-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !workspaceName.trim()}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading your workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto px-6 py-6 text-center text-[11px] text-white/30">
        Wazzi App &bull; Multi-Tenant Business Messaging
      </footer>
    </div>
  );
}
