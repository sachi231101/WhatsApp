"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bot,
  Users,
  Send,
  Calendar,
  ChevronDown,
  TrendingUp,
  Clock,
  MessageCircle,
  Trophy,
  Zap,
  Plus,
  Brain,
  Megaphone,
  ArrowRight,
  MoreVertical,
  ArrowUpRight,
  Loader2,
  Check,
  CheckCircle2,
  Lock,
  PlayCircle,
  HelpCircle,
  X,
  BookOpen,
  Settings,
  Sparkles,
  Link2,
} from "lucide-react";

// ─── Custom Icons ─────────────────────────────────────────────────────────────
const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const MetaInfinityLogo = ({
  className = "w-6 h-6",
}: {
  className?: string;
}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.96 6.002c-1.92 0-3.64.92-4.96 2.44-1.32-1.52-3.04-2.44-4.96-2.44C3.12 6.002 0 9.162 0 13.082c0 3.92 3.12 7.08 7.04 7.08 2.08 0 3.96-1.04 5.28-2.76 1.32 1.72 3.2 2.76 5.28 2.76 3.92 0 7.04-3.16 7.04-7.08 0-3.92-3.12-7.08-7.04-7.08zm-9.92 11.6c-2.48 0-4.56-2-4.56-4.52s2.08-4.52 4.56-4.52c1.48 0 2.88.76 3.72 1.96l.84 1.2-.84 1.2c-.84 1.2-2.24 1.96-3.72 1.96zm9.92 0c-1.48 0-2.88-.76-3.72-1.96l-.84-1.2.84-1.2c.84-1.2 2.24-1.96 3.72-1.96 2.48 0 4.56 2 4.56 4.52s-2.08 4.52-4.56 4.52z" />
  </svg>
);

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ color, up }: { color: string; up?: boolean }) {
  const paths = [
    "M0,30 C10,28 15,15 25,18 C35,21 40,10 50,8 C60,6 65,12 75,8 C85,4 90,10 100,5",
    "M0,25 C10,22 18,30 28,20 C38,10 45,18 55,12 C65,6 72,15 82,10 C92,5 96,8 100,4",
    "M0,28 C12,20 20,25 30,15 C40,5 48,18 58,10 C68,2 75,12 85,7 C92,4 97,6 100,3",
    "M0,20 C8,25 15,12 25,18 C35,24 42,10 52,14 C62,18 70,8 80,12 C90,6 95,10 100,7",
  ];
  const path = paths[0];
  return (
    <svg
      width="100"
      height="36"
      viewBox="0 0 100 36"
      fill="none"
      className="flex-shrink-0"
    >
      <path
        d={path}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  up,
  icon: Icon,
  iconBg,
  iconColor,
  sparkColor,
  badge,
}: {
  label: string;
  value: string | number;
  change: string;
  up: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-600">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
            {value}
          </p>
          <p
            className={`text-xs font-semibold flex items-center gap-0.5 ${
              change === "—"
                ? "text-gray-400"
                : up
                  ? "text-green-500"
                  : "text-red-500"
            }`}
          >
            {change !== "—" && (
              <ArrowUpRight className={`w-3 h-3 ${up ? "" : "rotate-180"}`} />
            )}
            {change === "—" ? "No prior period data" : `${change} vs last week`}
          </p>
        </div>
        <Sparkline color={sparkColor} up={up} />
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32 pt-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full flex items-end justify-center"
            style={{ height: 96 }}
          >
            <div
              className="w-full bg-blue-500 rounded-t-md opacity-80 hover:opacity-100 transition-all cursor-pointer"
              style={{ height: `${(d.value / max) * 96}px`, minHeight: 4 }}
            />
          </div>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({
  aiPct,
  humanPct,
  unassignedPct,
  total,
}: {
  aiPct: number;
  humanPct: number;
  unassignedPct: number;
  total: number;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const aiDash = (aiPct / 100) * circ;
  const humanDash = (humanPct / 100) * circ;
  const unassignedDash = (unassignedPct / 100) * circ;
  const aiOffset = 0;
  const humanOffset = -aiDash;
  const unassignedOffset = -(aiDash + humanDash);

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="18"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="#4F6EF7"
            strokeWidth="18"
            strokeDasharray={`${aiDash} ${circ - aiDash}`}
            strokeDashoffset={-aiOffset + circ / 4}
            strokeLinecap="butt"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="#a855f7"
            strokeWidth="18"
            strokeDasharray={`${humanDash} ${circ - humanDash}`}
            strokeDashoffset={humanOffset + circ / 4}
            strokeLinecap="butt"
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="18"
            strokeDasharray={`${unassignedDash} ${circ - unassignedDash}`}
            strokeDashoffset={unassignedOffset + circ / 4}
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "AI Handled", pct: aiPct, color: "bg-[#4F6EF7]" },
          { label: "Human Handled", pct: humanPct, color: "bg-purple-500" },
          { label: "Unassigned", pct: unassignedPct, color: "bg-gray-300" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`}
            />
            <span className="text-gray-600">{item.label}</span>
            <span className="font-semibold text-gray-900 ml-auto">
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    resolved: "bg-gray-100 text-gray-500",
    pending: "bg-orange-100 text-orange-600",
    "ai handling": "bg-blue-100 text-blue-600",
  };
  return (
    <span
      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
        styles[status.toLowerCase()] || "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Video & Setup Guide Modal ────────────────────────────────────────────────
function VideoGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1b59f8] flex items-center justify-center">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              How to Connect WhatsApp Business
            </h3>
            <p className="text-xs text-gray-400">
              Step-by-step setup in under 2 minutes
            </p>
          </div>
        </div>

        {/* Video Simulation Box */}
        <div className="w-full aspect-video bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden text-center p-6 border border-slate-800 mb-5">
          <div className="w-14 h-14 rounded-full bg-[#1b59f8]/90 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3 group-hover:scale-105 transition-transform">
            <WhatsAppIcon className="w-7 h-7 fill-white text-white" />
          </div>
          <p className="text-sm font-bold text-white mb-1">
            Meta Embedded Signup Flow
          </p>
          <p className="text-xs text-blue-200/80 max-w-xs">
            1. Log in with your Facebook credentials
            <br />
            2. Choose or create a Meta Business Account
            <br />
            3. Verify your WhatsApp number via OTP
          </p>
        </div>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-start gap-2.5 text-xs text-gray-600">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">
              1
            </div>
            <span>
              Have an active phone number ready that can receive SMS or voice
              calls.
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-gray-600">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[10px]">
              2
            </div>
            <span>
              Make sure you are an admin of your Meta Business Manager.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Close
          </button>
          <Link
            href="/settings?tab=whatsapp"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1b59f8] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4 fill-white" />
            Connect WhatsApp Now
          </Link>
        </div>
      </div>
    </div>
  );
}

type SetupProgress = {
  workspaceCreated: boolean;
  whatsappConnected: boolean;
  hasAiAgent: boolean;
  hasKnowledgeBase: boolean;
  completedCount: number;
  total: number;
};

const DEFAULT_SETUP: SetupProgress = {
  workspaceCreated: true,
  whatsappConnected: false,
  hasAiAgent: false,
  hasKnowledgeBase: false,
  completedCount: 1,
  total: 4,
};

// ─── Main Client Dashboard Page ───────────────────────────────────────────────
export default function ClientDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [setupProgress, setSetupProgress] =
    useState<SetupProgress>(DEFAULT_SETUP);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.authenticated)
          setUserName(j.user.name?.split(" ")[0] || "there");
      })
      .catch(() => {});

    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((j) => {
        if (j.status === "ok") {
          setData(j.data);
          const connected = Boolean(j.data?.isWhatsAppConnected);
          setIsWhatsAppConnected(connected);
          if (j.data?.setupProgress) {
            setSetupProgress({
              ...DEFAULT_SETUP,
              ...j.data.setupProgress,
            });
          } else {
            setSetupProgress({
              ...DEFAULT_SETUP,
              whatsappConnected: connected,
              completedCount: connected ? 2 : 1,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {
    totalConversations: 0,
    aiResolutionRate: 0,
    conversionRate: "0%",
    hotLeads: 0,
    newContacts: 0,
    messagesToday: 0,
    activeContacts: 0,
  };

  const recent: any[] = Array.isArray(data?.recentConversations)
    ? data.recentConversations
    : [];

  const barData = [
    { label: "Mon", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.5)) },
    { label: "Tue", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.35)) },
    { label: "Wed", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.4)) },
    { label: "Thu", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.55)) },
    { label: "Fri", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.7)) },
    { label: "Sat", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.45)) },
    { label: "Sun", value: Math.max(0, Math.round((stats.totalConversations || 0) * 0.3)) },
  ];

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const avatarInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const avatarColors = [
    "bg-red-400",
    "bg-purple-400",
    "bg-blue-400",
    "bg-pink-400",
    "bg-emerald-400",
    "bg-orange-400",
  ];

  const isSetupView = !isWhatsAppConnected;
  const completedCount = setupProgress.completedCount ?? 1;
  const setupTotal = setupProgress.total ?? 4;
  const progressPct = Math.round((completedCount / setupTotal) * 100);

  const setupSteps = [
    {
      id: "workspace",
      title: "Create workspace",
      description: "Your workspace is ready",
      done: setupProgress.workspaceCreated,
      href: null as string | null,
      ctaLabel: null as string | null,
      showVideo: false,
    },
    {
      id: "whatsapp",
      title: "Connect WhatsApp Business",
      description: "Link your Meta account to start receiving messages",
      done: setupProgress.whatsappConnected,
      href: "/settings?tab=whatsapp",
      ctaLabel: "Connect WhatsApp",
      showVideo: true,
    },
    {
      id: "agent",
      title: "Configure AI Agent",
      description: "Set up your AI assistant",
      done: setupProgress.hasAiAgent,
      href: "/ai-agents",
      ctaLabel: "Configure Agent",
      showVideo: false,
    },
    {
      id: "knowledge",
      title: "Add Knowledge Base",
      description: "Teach your AI about your business",
      done: setupProgress.hasKnowledgeBase,
      href: "/knowledge-base",
      ctaLabel: "Add Knowledge",
      showVideo: false,
    },
  ];

  const nextStepIndex = setupSteps.findIndex((s) => !s.done);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-[#1b59f8]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Welcome back, {userName || "there"}{" "}
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isSetupView
              ? "Let's get your WhatsApp Business connected and start automating conversations."
              : "Here's what's happening with your business today."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSetupView ? (
            <div className="hidden md:flex items-center gap-3 bg-blue-50/50 border border-blue-100/70 rounded-2xl px-3.5 py-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-[#1b59f8] flex-shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight">
                  Need help?
                </p>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                  Follow our step-by-step guide or chat with our support team.
                </p>
              </div>
              <button
                onClick={() => setShowVideoModal(true)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-all whitespace-nowrap cursor-pointer"
              >
                View Guide
              </button>
            </div>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
              <Calendar className="w-4 h-4 text-gray-400" />
              Last 7 days
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. PRE-CONNECTION SETUP VIEW (Exact Pixel-Perfect Match to Design)       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isSetupView ? (
        <div className="space-y-6">
          {/* Top Cards Grid (Checklist Left + Meta Graphic Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Complete Your Setup Checklist (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                {/* Progress Badge and Bar */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                    {completedCount} of {setupTotal} completed
                  </span>
                  <div className="flex-1 flex items-center gap-1.5">
                    {Array.from({ length: setupTotal }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < completedCount ? "bg-emerald-500" : "bg-gray-100"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-400">
                    {progressPct}%
                  </span>
                </div>

                {/* Section Titles */}
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Complete your setup
                </h2>
                <p className="text-xs text-gray-500 mt-1 mb-6">
                  Connect your WhatsApp Business account to unlock the full
                  power of Wazzi App.
                </p>

                {/* Steps List */}
                <div className="space-y-5">
                  {setupSteps.map((step, index) => {
                    const isNext = index === nextStepIndex;
                    const stepNumber = index + 1;

                    return (
                      <div
                        key={step.id}
                        className={isNext && step.href ? "space-y-3.5" : undefined}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            {step.done ? (
                              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : isNext ? (
                              <div className="w-7 h-7 rounded-full bg-[#1b59f8] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                                {stepNumber}
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {stepNumber}
                              </div>
                            )}
                            <div>
                              <p
                                className={`text-sm font-bold ${
                                  step.done || isNext
                                    ? "text-gray-900"
                                    : "text-gray-700"
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                {step.description}
                              </p>
                            </div>
                          </div>
                          {step.done ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100/50 text-[11px] font-bold rounded-lg">
                              Completed
                            </span>
                          ) : isNext ? (
                            <span className="px-2.5 py-1 bg-blue-50 text-[#1b59f8] border border-blue-100/60 text-[11px] font-bold rounded-lg">
                              Next step
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-400 text-[11px] font-medium rounded-lg">
                              Pending
                            </span>
                          )}
                        </div>

                        {isNext && step.href && (
                          <div className="pl-10 flex flex-wrap items-center gap-3 pt-1">
                            <Link
                              href={step.href}
                              className="px-5 py-2.5 bg-[#1b59f8] hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                            >
                              {step.id === "whatsapp" ? (
                                <WhatsAppIcon className="w-4.5 h-4.5 fill-white text-white" />
                              ) : null}
                              {step.ctaLabel}
                            </Link>
                            {step.showVideo && (
                              <button
                                onClick={() => setShowVideoModal(true)}
                                className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-[#1b59f8] font-bold text-sm rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                              >
                                <PlayCircle className="w-4.5 h-4.5 text-[#1b59f8]" />
                                Watch Video (2 min)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Meta Illustration & Value Callout Card (5 cols) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#f0f6ff] via-[#f7faff] to-[#edf4ff] rounded-3xl border border-blue-100/70 p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
              {/* Floating Cards Graphic */}
              <div className="pt-2 pb-6 flex items-center justify-center relative">
                <div className="relative w-full max-w-xs flex items-center justify-center">
                  {/* Floating Meta Browser Card */}
                  <div className="w-36 bg-white rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-100/80 p-3 transform -rotate-6 z-10">
                    <div className="flex items-center gap-1 mb-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 py-2 text-[#0081FB]">
                      <MetaInfinityLogo className="w-7 h-7" />
                      <span className="text-xs font-bold tracking-tight text-gray-800">
                        Meta
                      </span>
                    </div>
                  </div>

                  {/* Arched connecting link */}
                  <div className="relative -mx-2 z-20 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white shadow-md border border-blue-200 flex items-center justify-center text-[#1b59f8]">
                      <Link2 className="w-4.5 h-4.5 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* WhatsApp Floating Badge */}
                  <div className="w-32 bg-white rounded-2xl shadow-xl shadow-emerald-500/10 border border-emerald-100 p-3 transform rotate-6 z-10">
                    <div className="flex items-center justify-center py-2.5">
                      <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-green-500/25">
                        <WhatsAppIcon className="w-8 h-8 fill-white text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Background Sparkles */}
                  <div className="absolute -top-2 right-4 text-blue-400 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="absolute -bottom-1 left-6 text-blue-300">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="border-t border-blue-100/60 pt-5 space-y-3">
                <h3 className="text-base font-bold text-gray-900 mb-3">
                  Connect in minutes
                </h3>
                {[
                  "Secure connection via Meta",
                  "No technical knowledge required",
                  "Start receiving messages instantly",
                  "Enable AI agents and automations",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-xs text-gray-700 font-medium"
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Row: 4 Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AI Agents */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">AI Agents</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Create and configure AI agents to handle customer
                  conversations.
                </p>
              </div>
              <Link
                href="/ai-agents"
                className="text-xs font-bold text-[#1b59f8] hover:text-blue-700 flex items-center gap-1 mt-4 transition-colors"
              >
                Configure Agent <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Knowledge Base */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  Knowledge Base
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Add your business information for accurate AI responses.
                </p>
              </div>
              <Link
                href="/knowledge-base"
                className="text-xs font-bold text-[#1b59f8] hover:text-blue-700 flex items-center gap-1 mt-4 transition-colors"
              >
                Add Knowledge <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Team */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Team</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Invite team members and manage access.
                </p>
              </div>
              <Link
                href="/team"
                className="text-xs font-bold text-[#1b59f8] hover:text-blue-700 flex items-center gap-1 mt-4 transition-colors"
              >
                Manage Team <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Settings</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Customize your workspace and preferences.
                </p>
              </div>
              <Link
                href="/settings"
                className="text-xs font-bold text-[#1b59f8] hover:text-blue-700 flex items-center gap-1 mt-4 transition-colors"
              >
                Go to Settings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Bottom Row: Locked WhatsApp Insights */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Your WhatsApp Insights
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Connect your WhatsApp account to see your latest data.
                </p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 font-medium hover:bg-gray-50 transition-all shadow-2xs cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Last 7 days
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {/* 4 Locked Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Conversations" },
                { title: "Messages" },
                { title: "New Contacts" },
                { title: "AI Resolution Rate" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Connect WhatsApp to view data
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────────────────── */
        /* 2. LIVE CONNECTED DASHBOARD VIEW (Analytics & Conversations)               */
        /* ────────────────────────────────────────────────────────────────────────── */
        <div className="space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Conversations"
              value={stats.totalConversations ?? 0}
              change="—"
              up
              icon={MessageSquare}
              iconBg="bg-green-100"
              iconColor="text-green-500"
              sparkColor="#22c55e"
            />
            <StatCard
              label="AI Resolution Rate"
              value={`${stats.conversionRate || `${stats.aiResolutionRate ?? 0}%`}`}
              change="—"
              up
              icon={Bot}
              iconBg="bg-purple-100"
              iconColor="text-purple-500"
              sparkColor="#a855f7"
            />
            <StatCard
              label="New Leads"
              value={stats.hotLeads ?? stats.newContacts ?? 0}
              change="—"
              up
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-500"
              sparkColor="#4F6EF7"
            />
            <StatCard
              label="Messages Today"
              value={(stats.messagesToday ?? 0).toLocaleString()}
              change="—"
              up
              icon={Send}
              iconBg="bg-orange-100"
              iconColor="text-orange-500"
              sparkColor="#f97316"
              badge="AI"
            />
          </div>

          {/* Charts + Right Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Charts column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Charts Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bar Chart */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">
                        Conversation Activity
                      </h2>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Total conversations over the last 7 days
                      </p>
                    </div>
                    <button className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer">
                      Last 7 days <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Y axis labels */}
                  <div className="flex gap-2 mt-3">
                    <div
                      className="flex flex-col justify-between text-[10px] text-gray-300 h-32 text-right pr-1"
                      style={{ paddingTop: 4, paddingBottom: 20 }}
                    >
                      {[200, 150, 100, 50, 0].map((v) => (
                        <span key={v}>{v}</span>
                      ))}
                    </div>
                    <div className="flex-1">
                      <BarChart data={barData} />
                    </div>
                  </div>
                </div>

                {/* Donut Chart */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-800">
                      AI vs Human Handling
                    </h2>
                  </div>
                  <DonutChart
                    aiPct={Math.round(Number(stats.aiResolutionRate) || 0)}
                    humanPct={
                      stats.totalConversations > 0
                        ? Math.max(
                            0,
                            100 - Math.round(Number(stats.aiResolutionRate) || 0),
                          )
                        : 0
                    }
                    unassignedPct={0}
                    total={stats.totalConversations ?? 0}
                  />
                </div>
              </div>

              {/* Recent Conversations Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-gray-50">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">
                      Recent Conversations
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Latest customer chats and AI activity
                    </p>
                  </div>
                  <Link
                    href="/inbox"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Inbox <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {recent.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        No conversations yet
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Messages will appear here once customers start chatting.
                      </p>
                    </div>
                  ) : (
                    recent.map((conv, idx) => (
                      <div
                        key={conv.id || idx}
                        className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full ${
                              avatarColors[idx % avatarColors.length]
                            } flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
                          >
                            {avatarInitials(conv.profile_name || "User")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-800 truncate">
                                {conv.profile_name || "Anonymous"}
                              </p>
                              <StatusPill status={conv.status || "open"} />
                            </div>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
                              {conv.last_message_preview || "No messages yet"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-[10px] text-gray-400">
                            {conv.last_message_at
                              ? timeAgo(conv.last_message_at)
                              : "recently"}
                          </p>
                          <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                            {conv.assigned_to || "Unassigned"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Insights & Quick Actions */}
            <div className="space-y-4">
              {/* AI Opportunity Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">
                      AI Optimization Insight
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      More customers are asking about course pricing and payment
                      options.
                    </p>
                  </div>
                </div>
                <Link
                  href="/automations"
                  className="block text-center w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all"
                >
                  Create Pricing Automation
                </Link>
              </div>

              {/* More insights */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                {[
                  {
                    icon: Clock,
                    bg: "bg-gray-100",
                    color: "text-gray-500",
                    label: "Best time for engagement",
                    value: "10:00 AM – 12:00 PM",
                    sub: "Most customers respond during this time.",
                  },
                  {
                    icon: MessageSquare,
                    bg: "bg-blue-100",
                    color: "text-blue-500",
                    label: "Top conversation category",
                    value: "Course Information",
                    sub: "42% of all conversations",
                  },
                  {
                    icon: Trophy,
                    bg: "bg-yellow-100",
                    color: "text-yellow-500",
                    label: "High-value opportunities",
                    value: `${stats.hotLeads ?? 0} hot leads this week`,
                    sub:
                      (stats.hotLeads ?? 0) > 0
                        ? "Prioritize these contacts in Inbox"
                        : "Hot leads will appear as contacts engage",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400">{item.label}</p>
                      <p className="text-xs font-bold text-gray-800">
                        {item.value}
                      </p>
                      <p className="text-[11px] text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <h2 className="text-sm font-bold text-gray-800">
                    Quick Actions
                  </h2>
                </div>
                <div className="space-y-1.5">
                  {[
                    {
                      icon: Plus,
                      iconBg: "bg-green-100",
                      iconColor: "text-green-500",
                      label: "Connect WhatsApp Number",
                      sub: "Add another WhatsApp number",
                      href: "/settings?tab=whatsapp",
                    },
                    {
                      icon: Bot,
                      iconBg: "bg-purple-100",
                      iconColor: "text-purple-500",
                      label: "Create AI Agent",
                      sub: "Set up an AI assistant",
                      href: "/ai-agents",
                    },
                    {
                      icon: Brain,
                      iconBg: "bg-blue-100",
                      iconColor: "text-blue-500",
                      label: "Upload Knowledge Base",
                      sub: "Give AI your business information",
                      href: "/knowledge-base",
                    },
                    {
                      icon: Megaphone,
                      iconBg: "bg-orange-100",
                      iconColor: "text-orange-500",
                      label: "Create Campaign",
                      sub: "Send WhatsApp broadcasts",
                      href: "/campaigns",
                    },
                  ].map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all group"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${action.iconBg} flex items-center justify-center flex-shrink-0`}
                      >
                        <action.icon
                          className={`w-4 h-4 ${action.iconColor}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {action.label}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {action.sub}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video / Setup Guide Modal */}
      <VideoGuideModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
      />
    </div>
  );
}
