'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, FolderKanban, Loader2, Plus } from 'lucide-react';

export default function KnowledgeBaseRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveProject() {
      try {
        const res = await fetch('/api/projects?status=active');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
            router.replace(`/projects/${json.data[0].id}/ai/knowledge`);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to resolve project for Knowledge Base:', err);
      } finally {
        setLoading(false);
      }
    }
    resolveProject();
  }, [router]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Knowledge Base...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-2xs text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Create a Project First</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          In Wazzi, Knowledge Bases and RAG are scoped to projects. Create or select a project to manage and attach your knowledge documents.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Go to Projects</span>
        </Link>
      </div>
    </div>
  );
}
