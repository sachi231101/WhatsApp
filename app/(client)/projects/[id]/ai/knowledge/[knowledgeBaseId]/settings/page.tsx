'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, ArrowLeft, Loader2, Archive, AlertTriangle } from 'lucide-react';

export default function KnowledgeBaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const knowledgeBaseId = params.knowledgeBaseId as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKb = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`);
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to load');
      setName(json.data.name);
      setDescription(json.data.description || '');
    } catch (err: any) {
      setError(err.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  }, [projectId, knowledgeBaseId]);

  useEffect(() => {
    fetchKb();
  }, [fetchKb]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to save');
      alert('Knowledge base updated');
      router.push(`/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this knowledge base? Connected AI agents will lose access.')) {
      return;
    }
    try {
      setArchiving(true);
      const res = await fetch(`/api/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'ok') throw new Error(json.error || 'Failed to archive');
      router.push(`/projects/${projectId}/ai/knowledge`);
    } catch (err: any) {
      alert(err.message || 'Archive failed');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 mr-2" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/projects/${projectId}/ai/knowledge/${knowledgeBaseId}`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Knowledge Base
            </Link>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-600" />
            Knowledge Base Settings
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 mb-6">General Configuration</h3>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-extrabold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Archive Knowledge Base
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Archiving this knowledge base hides it from active lists and detaches it from all AI Agents.
              </p>
            </div>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition disabled:opacity-50 shrink-0"
            >
              {archiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
