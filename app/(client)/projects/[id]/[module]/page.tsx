'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, MessageSquare, Users, Bot, Brain, Zap, Megaphone, BarChart3, type LucideIcon } from 'lucide-react';
import EmptyStateModule from '@/components/ui/EmptyStateModule';

const moduleMeta: Record<string, { title: string; icon: LucideIcon }> = {
  inbox: { title: 'Project Inbox', icon: MessageSquare },
  contacts: { title: 'Project Contacts', icon: Users },
  ai: { title: 'Project AI Agents', icon: Bot },
  knowledge: { title: 'Project Knowledge Base', icon: Brain },
  automations: { title: 'Project Automations', icon: Zap },
  campaigns: { title: 'Project Campaigns', icon: Megaphone },
  analytics: { title: 'Project Analytics', icon: BarChart3 },
};

export default function ProjectModulePlaceholderPage() {
  const params = useParams();
  const projectId = params.id as string;
  const moduleName = (params.module as string) || 'feature';

  const meta = moduleMeta[moduleName] || {
    title: `Project ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`,
    icon: Sparkles,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Project Overview</span>
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-2xs">
        <EmptyStateModule
          title={meta.title}
          icon={meta.icon}
          description="This feature will be available after you complete your WhatsApp setup."
        />
      </div>
    </div>
  );
}
