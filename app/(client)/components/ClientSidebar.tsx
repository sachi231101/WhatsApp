'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Bot,
  Brain,
  Users,
  Target,
  Zap,
  Megaphone,
  FileText,
  BarChart3,
  UserPlus,
  Plug,
  Code2,
  CreditCard,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  isNew?: boolean;
  children?: Array<{ label: string; href: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const nav: NavSection[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: FolderKanban, label: 'Projects', href: '/projects' },
    ],
  },
  {
    label: 'Communication',
    items: [
      {
        icon: MessageSquare,
        label: 'Inbox',
        href: '/inbox',
        badge: '12',
        children: [
          { label: 'All Conversations', href: '/inbox' },
          { label: 'My Conversations', href: '/inbox/mine' },
          { label: 'AI Conversations', href: '/inbox/ai' },
          { label: 'Unassigned', href: '/inbox/unassigned' },
          { label: 'Resolved', href: '/inbox/resolved' },
        ],
      },
    ],
  },
  {
    label: 'AI',
    items: [
      {
        icon: Bot,
        label: 'AI Agents',
        href: '/ai-agents',
        isNew: true,
        children: [
          { label: 'All Agents', href: '/ai-agents' },
          { label: 'Create Agent', href: '/ai-agents/create' },
          { label: 'Agent Performance', href: '/ai-agents/performance' },
          { label: 'Playground', href: '/ai-agents/playground' },
        ],
      },
      { icon: Brain, label: 'Knowledge Base', href: '/knowledge-base' },
    ],
  },
  {
    label: 'Customers',
    items: [
      {
        icon: Users,
        label: 'Contacts',
        href: '/contacts',
        children: [
          { label: 'All Contacts', href: '/contacts' },
          { label: 'Segments', href: '/contacts/segments' },
          { label: 'Tags', href: '/contacts/tags' },
          { label: 'Custom Attributes', href: '/contacts/attributes' },
        ],
      },
      {
        icon: Target,
        label: 'Leads',
        href: '/leads',
        badge: '5',
        children: [
          { label: 'All Leads', href: '/leads' },
          { label: 'Pipeline', href: '/leads/pipeline' },
          { label: 'Lead Scoring', href: '/leads/scoring' },
          { label: 'AI Qualification', href: '/leads/ai-qualification' },
        ],
      },
    ],
  },
  {
    label: 'Automation',
    items: [
      {
        icon: Zap,
        label: 'Automations',
        href: '/automations',
        children: [
          { label: 'Workflows', href: '/automations' },
          { label: 'AI Builder', href: '/automations/ai-builder' },
          { label: 'Follow-ups', href: '/automations/follow-ups' },
          { label: 'Execution Logs', href: '/automations/logs' },
        ],
      },
      {
        icon: Megaphone,
        label: 'Campaigns',
        href: '/campaigns',
        children: [
          { label: 'All Campaigns', href: '/campaigns' },
          { label: 'Create Campaign', href: '/campaigns/create' },
          { label: 'Scheduled', href: '/campaigns/scheduled' },
          { label: 'Retargeting', href: '/campaigns/retargeting' },
          { label: 'AI Creator', href: '/campaigns/ai-creator' },
        ],
      },
      { icon: FileText, label: 'Templates', href: '/templates' },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        icon: BarChart3,
        label: 'Analytics',
        href: '/analytics',
        children: [
          { label: 'Overview', href: '/analytics' },
          { label: 'Campaign Analytics', href: '/analytics/campaigns' },
          { label: 'AI Analytics', href: '/analytics/ai' },
          { label: 'Agent Analytics', href: '/analytics/agents' },
          { label: 'AI Insights', href: '/analytics/insights' },
        ],
      },
    ],
  },
  {
    label: 'Settings',
    items: [
      { icon: UserPlus, label: 'Team', href: '/team' },
      { icon: Plug, label: 'Integrations', href: '/integrations' },
      {
        icon: Code2,
        label: 'Developers',
        href: '/developers',
        children: [
          { label: 'API Keys', href: '/developers' },
          { label: 'Webhooks', href: '/developers/webhooks' },
          { label: 'API Logs', href: '/developers/logs' },
        ],
      },
      { icon: CreditCard, label: 'Billing', href: '/billing' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];



export default function ClientSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['Inbox', 'AI Agents']);

  const toggle = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-[#13151c] border-r border-white/[0.06] overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-tight">WazzApp</span>
          <span className="block text-[10px] text-white/30 leading-none">AI Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {nav.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const isOpen = expanded.includes(item.label);

                return (
                  <div key={item.label}>
                    {item.children ? (
                      <>
                        <button
                          onClick={() => toggle(item.label)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                            active
                              ? 'bg-green-500/10 text-green-400'
                              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                          }`}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-green-500/20 text-green-400">
                              {item.badge}
                            </span>
                          )}
                          {item.isNew && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-400">
                              AI
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="ml-4 mt-0.5 border-l border-white/[0.06] pl-3 space-y-0.5">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`block px-2 py-1.5 text-xs rounded-md transition-all ${
                                  pathname === child.href
                                    ? 'text-green-400 font-medium'
                                    : 'text-white/40 hover:text-white/70'
                                }`}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? 'bg-green-500/10 text-green-400'
                            : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                        }`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Workspace Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-all">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/80 truncate">Acme Corp</p>
            <p className="text-[10px] text-white/30 truncate">Pro Plan</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-white/25" />
        </div>
      </div>
    </aside>
  );
}
