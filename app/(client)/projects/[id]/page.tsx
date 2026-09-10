'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  Settings,
  MessageSquare,
  Bot,
  Users,
  Zap,
  Megaphone,
  BarChart3,
  Brain,
  ExternalLink,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  Hash,
} from 'lucide-react';

interface ProjectDetails {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  slug: string;
  status: string;
  createdAt: string;
  workspaceName?: string;
  userRole?: string;
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [connection, setConnection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        setError(null);
        const [projRes, connRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/whatsapp`).catch((): null => null),
        ]);

        const json = await projRes.json();

        if (projRes.status === 404) {
          setError('Project not found or you do not have access to it.');
          return;
        }

        if (projRes.ok && json.status === 'ok') {
          setProject(json.data);
        } else {
          setError(json.message || json.error || 'Failed to load project details.');
        }

        if (connRes && connRes.ok) {
          const connJson = await connRes.json();
          if (connJson.status === 'ok') {
            setConnection(connJson.data);
          }
        }
      } catch (err: any) {
        console.error('Error fetching project:', err);
        setError('Network error while loading project.');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Project Unavailable</h2>
          <p className="text-sm text-gray-500 mb-6">{error || 'Project not found.'}</p>
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

  const isArchived = (project.status || '').toUpperCase() === 'ARCHIVED';
  const isWhatsAppConnected = connection && connection.status === 'CONNECTED';

  const modules = [
    {
      title: 'WhatsApp Connection',
      status: isWhatsAppConnected ? 'Connected' : connection?.status === 'DISCONNECTED' ? 'Disconnected' : 'Not connected',
      description: isWhatsAppConnected
        ? `Connected to ${connection.displayPhoneNumber || connection.wabaId}`
        : 'Connect your Meta Business WhatsApp number to this project.',
      icon: MessageSquare,
      href: `/projects/${project.id}/whatsapp`,
      cta: isWhatsAppConnected ? 'Manage WhatsApp' : 'Connect WhatsApp',
      disabled: false,
    },
    {
      title: 'Team Inbox',
      status: isWhatsAppConnected ? 'Active' : 'Ready to connect',
      description: 'Shared multi-agent team inbox with live customer messaging, assignment, and internal notes.',
      icon: MessageSquare,
      href: `/projects/${project.id}/inbox`,
      cta: 'Open Team Inbox',
      disabled: false,
    },
    {
      title: 'AI Agents',
      status: 'Active',
      description: 'Configure and publish autonomous AI agents with custom instructions and guardrails.',
      icon: Bot,
      href: `/projects/${project.id}/ai/agents`,
      cta: 'Manage AI Agents',
    },
    {
      title: 'Contacts & Audiences',
      status: 'Active',
      description: 'Manage contacts, tags, and Customer 360 profiles for this project.',
      icon: Users,
      href: `/projects/${project.id}/contacts`,
      cta: 'View Contacts',
    },
    {
      title: 'Knowledge Base',
      status: 'Active',
      description: 'Upload documents, FAQs, and URLs for grounding your AI agents.',
      icon: Brain,
      href: `/projects/${project.id}/ai/knowledge`,
      cta: 'Manage Knowledge Base',
    },
    {
      title: 'Automations',
      status: 'Active',
      description: 'Set up event-driven workflows and message routing.',
      icon: Zap,
      href: `/projects/${project.id}/automations`,
      cta: 'Manage Automations',
    },
    {
      title: 'Campaigns',
      status: 'Not configured',
      description: 'Run targeted WhatsApp broadcast campaigns.',
      icon: Megaphone,
      href: `/projects/${project.id}/campaigns`,
      cta: 'View Campaigns',
    },
    {
      title: 'Analytics & Reporting',
      status: 'Not configured',
      description: 'Real-time performance metrics and conversation analytics.',
      icon: BarChart3,
      href: `/projects/${project.id}/analytics`,
      cta: 'View Analytics',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>

        <Link
          href={`/projects/${project.id}/settings`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          <span>Project Settings</span>
        </Link>
      </div>

      {/* Project Header Banner */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FolderKanban className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {project.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isArchived
                      ? 'bg-gray-100 text-gray-600 border border-gray-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                  }`}
                >
                  {isArchived ? 'Archived' : 'Active'}
                </span>
              </div>
              <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                {project.description || 'No description set for this project.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs text-gray-400 self-start">
            <span className="flex items-center gap-1 font-mono text-[11px] text-gray-500">
              <Hash className="w-3.5 h-3.5" />
              slug: {project.slug}
            </span>
            {project.workspaceName && (
              <span className="text-[11px] text-gray-400">
                Workspace: <span className="font-semibold text-gray-600">{project.workspaceName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary WhatsApp Connection Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Connection</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isWhatsAppConnected
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : connection?.status === 'DISCONNECTED'
                  ? 'bg-gray-100 text-gray-700 border-gray-300'
                  : 'bg-white text-emerald-700 border-emerald-200'
              }`}
            >
              {isWhatsAppConnected ? 'Connected ✓' : connection?.status === 'DISCONNECTED' ? 'Disconnected' : 'Not connected'}
            </span>
          </div>
          <p className="text-xs text-emerald-900/80 max-w-xl">
            {isWhatsAppConnected
              ? `Connected number: ${connection.displayPhoneNumber || connection.wabaId}. Ready to receive messages and run automations.`
              : 'Each project operates as an independent business unit with its own phone number, agents, and contacts.'}
          </p>
        </div>

        <Link
          href={`/projects/${project.id}/whatsapp`}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <span>{isWhatsAppConnected ? 'Manage WhatsApp →' : 'Connect WhatsApp →'}</span>
        </Link>
      </div>

      {/* Module Configuration States Grid (No Fake Business Data) */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Project Modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div
              key={m.title}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
                    <m.icon className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600">
                    {m.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{m.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{m.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-50">
                {m.href ? (
                  <Link
                    href={m.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <span>{m.cta}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-[11px] font-semibold text-gray-400">
                    Not configured
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
