'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  Settings,
  Archive,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hash,
} from 'lucide-react';

interface ProjectDetails {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  slug: string;
  status: string;
  userRole?: string;
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/projects/${projectId}`);
        const json = await res.json();

        if (res.status === 404) {
          setErrorMsg('Project not found or you do not have permission to view its settings.');
          return;
        }

        if (res.ok && json.status === 'ok') {
          setProject(json.data);
          setName(json.data.name || '');
          setDescription(json.data.description || '');
        } else {
          setErrorMsg(json.message || json.error || 'Failed to load project.');
        }
      } catch (err: any) {
        console.error('Error fetching project:', err);
        setErrorMsg('Network error while loading project settings.');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setProject((prev) => prev ? { ...prev, name: json.data.name, description: json.data.description } : null);
        setToastMsg('Project settings saved successfully!');
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        setErrorMsg(json.message || json.error || 'Failed to update project.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating project.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!confirm(`Are you sure you want to archive "${project?.name}"? It will be removed from the active projects list but preserved in the database.`)) {
      return;
    }

    try {
      setArchiving(true);
      setErrorMsg(null);
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setToastMsg('Project archived successfully!');
        setTimeout(() => {
          router.push('/projects');
        }, 1200);
      } else {
        setErrorMsg(json.message || json.error || 'Failed to archive project. Only Owners and Admins can archive projects.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error archiving project.');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestoreProject = async () => {
    try {
      setRestoring(true);
      setErrorMsg(null);
      const res = await fetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setProject((prev) => prev ? { ...prev, status: 'ACTIVE' } : null);
        setToastMsg('Project restored to Active status!');
        setTimeout(() => setToastMsg(null), 3000);
      } else {
        setErrorMsg(json.message || json.error || 'Failed to restore project.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error restoring project.');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading project settings...</p>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="flex-1 p-6 sm:p-8 max-w-3xl mx-auto w-full">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </Link>
        </div>
      </div>
    );
  }

  const isArchived = (project?.status || '').toUpperCase() === 'ARCHIVED';

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-500/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {project?.name || 'Project'}</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Project Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage general configuration and lifecycle for this project.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* General Settings Section */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <h2 className="text-base font-bold text-gray-900 mb-1">General</h2>
        <p className="text-xs text-gray-500 mb-6">Update the primary details for this project.</p>

        <form onSubmit={handleSaveGeneral} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Project name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what operations this project manages..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
            <span>
              Status:{' '}
              <strong className={isArchived ? 'text-gray-700' : 'text-emerald-600'}>
                {isArchived ? 'ARCHIVED' : 'ACTIVE'}
              </strong>
            </span>
            <span className="font-mono text-gray-400">
              Slug: {project?.slug}
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-1 text-rose-600 font-bold text-base">
          <AlertTriangle className="w-5 h-5" />
          <span>Danger Zone</span>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Careful actions affecting the availability of this project.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {isArchived ? 'Restore Project' : 'Archive Project'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-md">
              {isArchived
                ? 'Restore this project back to the active list. All configured assets will be accessible again.'
                : 'Archiving hides the project from active operations. All database records remain safely preserved.'}
            </p>
          </div>

          {isArchived ? (
            <button
              onClick={handleRestoreProject}
              disabled={restoring}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              {restoring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Restore Project</span>
            </button>
          ) : (
            <button
              onClick={handleArchiveProject}
              disabled={archiving}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              <span>Archive Project</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
