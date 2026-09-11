'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Users,
  Bot,
  Brain,
  Zap,
  Megaphone,
  BarChart3,
  UserPlus,
  Settings,
  ChevronDown,
  Zap as ZapIcon,
  Crown,
  ArrowRight,
  Plus,
  Check,
  Loader2,
  X,
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: MessageSquare, label: 'Inbox', href: '/inbox' },
  { icon: Users, label: 'Contacts', href: '/contacts' },
];

const aiNav: NavItem[] = [
  { icon: Bot, label: 'AI Agents', href: '/ai-agents' },
  { icon: Brain, label: 'Knowledge Base', href: '/knowledge-base' },
  { icon: Zap, label: 'Automations', href: '/automations' },
  { icon: Megaphone, label: 'Campaigns', href: '/campaigns' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
];

const bottomNav: NavItem[] = [
  { icon: UserPlus, label: 'Team', href: '/team' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export default function ClientSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [projectOpen, setProjectOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const projectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleToggleMobile = () => {
      setMobileDrawerOpen((prev) => !prev);
    };
    window.addEventListener('toggle-mobile-sidebar', handleToggleMobile);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggleMobile);
  }, []);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=active');
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data)) {
        setProjects(json.data);
      }
      setProjectsLoaded(true);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    // Lazy-load projects only when the switcher opens (avoid duplicate fetch with /projects page)
    if (projectOpen && !projectsLoaded) {
      fetchProjects();
    }
  }, [projectOpen, projectsLoaded]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const projectMatch = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)/);
  const currentProjectId = projectMatch ? projectMatch[1] : null;
  const currentProject =
    projects.find((p) => p.id === currentProjectId) ||
    (projects.length > 0 ? projects[0] : null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setNewProjectName('');
        setNewProjectDesc('');
        setShowCreateModal(false);
        await fetchProjects();
        router.push(`/projects/${json.data.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/projects') {
      return pathname.startsWith('/projects');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileDrawerOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-[#edf3ff] text-[#1b59f8] font-semibold'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <item.icon
          className={`w-4.5 h-4.5 ${active ? 'text-[#1b59f8]' : 'text-gray-400'}`}
          style={{ width: 18, height: 18 }}
        />
        <span className="flex-1">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 min-h-screen transition-transform duration-200 ${
          mobileDrawerOpen
            ? 'fixed inset-y-0 left-0 z-50 shadow-2xl translate-x-0'
            : 'fixed -translate-x-full md:relative md:translate-x-0 z-30'
        }`}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center text-[#1b59f8]">
              <ZapIcon className="w-6 h-6 fill-[#1b59f8] text-[#1b59f8]" />
            </div>
            <p className="text-lg font-extrabold text-gray-900 tracking-tight">
              Wazzi App
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Switcher */}
        <div className="px-4 mb-4 relative" ref={projectRef}>
          <button
            onClick={() => setProjectOpen(!projectOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-all border border-gray-100 bg-gray-50/60 shadow-2xs cursor-pointer text-left"
          >
            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-gray-800 truncate leading-tight">
                {currentProject ? currentProject.name : 'Default Project'}
              </p>
              <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                {projects.length > 0
                  ? `${projects.length} project${projects.length === 1 ? '' : 's'}`
                  : 'Active Project'}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                projectOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {projectOpen && (
            <div className="absolute left-4 right-4 top-full mt-1.5 z-50 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-slate-900/10 p-2 animate-fade-in">
              <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-gray-50 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Projects
                </span>
                <Link
                  href="/projects"
                  onClick={() => {
                    setProjectOpen(false);
                    setMobileDrawerOpen(false);
                  }}
                  className="text-[10px] font-semibold text-blue-600 hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {projects.map((p) => {
                  const isSelected = p.id === (currentProjectId || currentProject?.id);

                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      onClick={() => {
                        setProjectOpen(false);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 text-blue-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        <FolderKanban className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{p.name}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-1.5 mt-1">
                <button
                  onClick={() => {
                    setProjectOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              AI
            </p>
          </div>
          {aiNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          <div className="pt-3 pb-1 border-t border-gray-50">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Administration
            </p>
          </div>
          <div className="space-y-1">
            {bottomNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </nav>

        <div className="px-3 pb-3 pt-1">
          <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/90 border border-amber-200/80 rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center gap-2 mb-0.5">
              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <p className="text-[10px] font-semibold text-amber-800">
                Workspace Plan
              </p>
            </div>
            <p className="text-xs font-bold text-amber-900 mb-2">Free Plan</p>
            <Link
              href="/billing"
              className="w-full py-1 px-2.5 bg-white border border-amber-200/90 rounded-xl text-[11px] font-bold text-amber-800 hover:bg-amber-50/50 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <span>Upgrade Plan</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </aside>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Create Project</h3>
                <p className="text-xs text-gray-500">
                  Add an operating unit to your workspace
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Student Admissions"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer messaging and support operations"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newProjectName.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
