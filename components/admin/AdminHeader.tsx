'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Calendar, Bell, Menu, X, Globe } from 'lucide-react';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AdminHeader({ title = 'Platform Administration', subtitle = 'Super Admin Console' }: AdminHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [viewAs, setViewAs] = useState<{ workspaceId: string; workspaceName: string } | null>(null);

  useEffect(() => {
    try {
      const raw = document.cookie.split('; ').find(c => c.startsWith('wazzapp_view_as='))?.split('=')[1];
      if (raw) {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(atob(decoded));
        if (parsed?.workspaceId) setViewAs(parsed);
      }
    } catch {}
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (json.status === 'ok') setResults(json.data || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleRefresh = () => router.refresh();
  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'));
  const exitViewAs = async () => {
    document.cookie = 'wazzapp_view_as=; Max-Age=0; path=/';
    document.cookie = 'wazzapp_workspace_id=; Max-Age=0; path=/';
    location.reload();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d0f18]/80 backdrop-blur-xl">
      {viewAs && (
        <div className="bg-amber-500 text-black text-xs font-semibold px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Viewing as tenant: <strong>{viewAs.workspaceName}</strong> ({viewAs.workspaceId.slice(0, 8)}…)
          </span>
          <button onClick={exitViewAs} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black text-white text-[11px] font-bold hover:bg-black/80 cursor-pointer">
            <X className="w-3 h-3" /> Exit tenant mode
          </button>
        </div>
      )}
      <div className="px-4 lg:px-6 py-3 flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.10] cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block min-w-0">
          <h1 className="text-sm font-bold text-white tracking-tight truncate">{title}</h1>
          <p className="text-[11px] text-white/40 truncate">{subtitle}</p>
        </div>

        <div className="flex-1 max-w-xl mx-2 lg:mx-6 relative">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setShowResults(false); }}
              onFocus={() => { if (results.length) setShowResults(true); }}
              placeholder="Search businesses, users, WABA, phone, payments…"
              className="w-full bg-white/[0.06] border border-white/[0.08] focus:border-indigo-500/40 focus:bg-white/[0.08] rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-white/30 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white text-black text-[11px] font-bold hover:bg-white/90 disabled:opacity-50 cursor-pointer"
            >
              {searching ? '…' : 'Search'}
            </button>
          </form>
          {showResults && (
            <div className="absolute top-full mt-2 w-full bg-[#11141f] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-50">
              <div className="p-3 flex items-center justify-between border-b border-white/[0.06]">
                <span className="text-xs font-bold text-white">Results for “{query}”</span>
                <button onClick={() => setShowResults(false)} className="p-1 rounded-lg hover:bg-white/[0.06] text-white/40 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              {results.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40">No results found.</div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {results.map((r: any, i: number) => (
                    <div key={i} className="px-4 py-3 hover:bg-white/[0.04] cursor-pointer">
                      <p className="text-xs font-semibold text-white">{r.label || r.name || r.email || r.id}</p>
                      <p className="text-[11px] text-white/40">{r.type} • {r.id?.slice?.(0, 12)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.10] cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="hidden sm:flex p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white cursor-pointer">
            <Calendar className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white cursor-pointer relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0d0f18]" />
          </button>
        </div>
      </div>
    </header>
  );
}
