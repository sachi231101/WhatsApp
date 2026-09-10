'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export default function CreateKnowledgeBasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name for the knowledge base.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/ai/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'ok') {
        setError(json.error || 'Failed to create knowledge base');
        return;
      }

      router.push(`/projects/${projectId}/ai/knowledge/${json.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/projects/${projectId}/ai/knowledge`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Knowledge Bases
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-emerald-600" />
            Create Knowledge Base
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Group documents, URLs, and FAQs into a dedicated knowledge repository for your AI Agents.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Knowledge Base Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Product Documentation, Admissions FAQ, Company Policies"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Choose a descriptive name to easily identify what information this knowledge base contains.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Description (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Describe what documents belong here and what topics this knowledge base covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href={`/projects/${projectId}/ai/knowledge`}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create & Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
