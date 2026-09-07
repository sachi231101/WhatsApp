'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  FolderKanban,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Plus,
  Check,
  Trash2,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  activePlan: string;
  connectedNumber: string;
  createdAt: string;
  isActive: boolean;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [userName, setUserName] = useState('Sachin');
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspaces');
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data)) {
        setProjects(json.data);
        if (json.userName) {
          setUserName(json.userName);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || creating) return;

    try {
      setCreating(true);
      setErrorMsg(null);
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName.trim() }),
      });
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setProjects((prev) => [json.data, ...prev]);
        setProjectName('');
        setToastMsg(`Project "${json.data.name}" created successfully!`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setErrorMsg(json.error || 'Failed to create project');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating project');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    try {
      setSwitchingId(projectId);
      const res = await fetch('/api/workspaces/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: projectId }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to switch project:', err);
      setSwitchingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sep 7, 2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-2xl shadow-emerald-500/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Greeting & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Project Hub
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome, {userName}
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Manage your isolated business projects. Each project connects to its own WhatsApp Business number, contacts, and campaigns.
          </p>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── Create New Project Hero Card ─── */}
      <div className="rounded-3xl bg-gradient-to-br from-[#12231f] via-[#121622] to-[#10131d] border border-emerald-500/25 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-emerald-950/40 relative overflow-hidden group">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Form Content */}
        <div className="max-w-md w-full z-10 space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              Create New Project
            </h2>
            <p className="text-xs text-emerald-200/70 font-medium leading-relaxed">
              One Business Project is associated with one WhatsApp Business API Number
            </p>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-4 pt-1">
            <div>
              <input
                type="text"
                placeholder="Enter your project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-3.5 bg-black/40 border border-white/15 rounded-2xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 shadow-inner transition-all font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={creating || !projectName.trim()}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-extrabold shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 hover:scale-102 active:scale-98"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <span>Create</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Vector Rocket Illustration Graphic */}
        <div className="w-full md:w-auto flex items-center justify-center flex-shrink-0 z-10">
          <div className="w-72 h-56 relative flex items-center justify-center">
            <svg
              viewBox="0 0 300 240"
              className="w-full h-full drop-shadow-2xl"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Tablet screen container */}
              <rect x="70" y="20" width="160" height="200" rx="18" fill="#181d28" stroke="#ffffff1a" strokeWidth="2" />
              <rect x="76" y="30" width="148" height="180" rx="12" fill="#0f141d" />
              <rect x="135" y="215" width="30" height="3" rx="1.5" fill="#334155" />

              {/* Smoke clouds */}
              <circle cx="95" cy="180" r="18" fill="#10b981" opacity="0.3" />
              <circle cx="120" cy="175" r="24" fill="#059669" opacity="0.4" />
              <circle cx="150" cy="182" r="22" fill="#047857" opacity="0.5" />
              <circle cx="180" cy="178" r="20" fill="#10b981" opacity="0.3" />

              {/* Rocket Body */}
              <path
                d="M150 35 C133 60 128 95 128 130 L172 130 C172 95 167 60 150 35 Z"
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="2.5"
              />
              {/* Rocket Nosecone */}
              <path
                d="M150 35 C142 50 137 68 135 78 L165 78 C163 68 158 50 150 35 Z"
                fill="#10b981"
              />
              {/* Window */}
              <circle cx="150" cy="95" r="11" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="150" cy="95" r="6" fill="#a7f3d0" />

              {/* Fins */}
              <path d="M128 115 L110 135 L128 130 Z" fill="#10b981" />
              <path d="M172 115 L190 135 L172 130 Z" fill="#10b981" />

              {/* Flame Exhaust */}
              <path d="M138 132 L150 165 L162 132 Z" fill="#f59e0b" />
              <path d="M142 132 L150 152 L158 132 Z" fill="#fef08a" />

              {/* Character interacting */}
              <circle cx="215" cy="155" r="12" fill="#38bdf8" />
              <path
                d="M205 170 C205 164 210 160 225 160 C235 160 240 164 240 170 L242 195 L203 195 Z"
                fill="#0284c7"
              />
              <path d="M210 175 L180 158" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ─── Recent Projects Section ─── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-emerald-400" />
            Recent Projects
          </h2>
          <span className="text-xs text-white/40">{projects.length} Total Projects</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-white/40 bg-[#13151c] rounded-3xl border border-white/[0.08]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <p className="text-xs font-medium">Loading your projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-10 text-center bg-[#13151c] rounded-3xl border border-white/[0.08] text-white/50">
            <p className="text-sm font-medium">No projects created yet. Use the form above to start!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const isSelected = project.isActive;
              const isSwitching = switchingId === project.id;

              return (
                <div
                  key={project.id}
                  className={`bg-[#13151c] rounded-3xl p-6 border transition-all flex flex-col justify-between group hover:shadow-2xl ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-950/40 scale-101'
                      : 'border-white/[0.08] hover:border-white/20 hover:bg-[#161822]'
                  }`}
                >
                  <div>
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-2 mb-5">
                      <div className="truncate">
                        <h3 className="text-xl font-black text-white tracking-tight leading-tight truncate">
                          {project.name}
                        </h3>
                        <span className="text-[10px] text-white/35 font-mono">
                          ID: {project.id.slice(0, 8)}...
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white/40 bg-white/[0.04]">
                          Standby
                        </span>
                      )}
                    </div>

                    {/* 2-Column Metadata Grid (Matching AiSensy design) */}
                    <div className="grid grid-cols-2 gap-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-xs mb-6">
                      {/* Status */}
                      <div>
                        <span className="text-white/40 text-[11px] block font-medium">Status</span>
                        <span className="font-semibold text-white capitalize">
                          {project.status || 'Created'}
                        </span>
                      </div>

                      {/* Active Plan */}
                      <div>
                        <span className="text-white/40 text-[11px] block font-medium">Active plan</span>
                        <span className="font-black text-emerald-400 tracking-tight">
                          {project.activePlan || 'FREE FOREVER'}
                        </span>
                      </div>

                      {/* Connected Number */}
                      <div className="col-span-2 pt-2 border-t border-white/[0.04]">
                        <span className="text-white/40 text-[11px] block font-medium">Number</span>
                        <span className="font-semibold text-white font-mono text-xs flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          {project.connectedNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="mb-6">
                      <span className="text-[11px] text-white/40 font-medium">
                        Created at {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => handleSelectProject(project.id)}
                    disabled={isSwitching}
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 active:scale-98'
                    }`}
                  >
                    {isSwitching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Entering Project...</span>
                      </>
                    ) : isSelected ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Current Active Project (View)</span>
                      </>
                    ) : (
                      <>
                        <span>View Project</span>
                        <ArrowRight className="w-4 h-4 text-white/40 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
