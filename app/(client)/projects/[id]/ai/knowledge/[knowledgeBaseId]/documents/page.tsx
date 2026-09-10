'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Brain, ArrowLeft, FileText, Loader2, AlertCircle } from 'lucide-react';

export default function KnowledgeBaseDocumentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const knowledgeBaseId = params.knowledgeBaseId as string;

  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}/sources`);
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        throw new Error(json.error || 'Failed to load documents');
      }
      setSources(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId, knowledgeBaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Knowledge Base
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-600" />
            Extracted Knowledge Documents
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Canonical extracted representations and chunk statistics for all ingested sources.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center p-12 text-slate-500 text-xs font-bold gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading documents...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {!loading && !error && sources.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            No documents extracted yet.
          </div>
        )}

        {!loading && !error && sources.length > 0 && (
          <div className="space-y-4">
            {sources.map((s) => (
              <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                      {s.type}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{s.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {s.chunkCount} chunks • ~{s.tokenCount.toLocaleString()} estimated tokens
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'READY'
                        ? 'bg-emerald-50 text-emerald-700'
                        : s.status === 'FAILED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
