"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Bot,
  Bell,
  Shield,
  CreditCard,
  ChevronDown,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Activity,
  CheckCircle,
  Smartphone,
  Monitor,
  Crown,
  Download,
  MoreHorizontal,
  Loader2,
  Unlink,
  MessageSquare,
} from "lucide-react";

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

type SettingsTab =
  | "workspace"
  | "whatsapp"
  | "ai"
  | "notifications"
  | "security"
  | "billing";

interface ProjectWhatsAppConnection {
  id: string;
  workspaceId: string;
  projectId: string;
  wabaId: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  businessName: string | null;
  status: "PENDING" | "CONNECTING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
  disconnectedAt: string | null;
}

interface ConnectionHealth {
  healthy: boolean;
  api: boolean;
  phone: boolean;
  webhook: boolean;
  token: boolean;
  status: string;
  reasonCode?: string;
  message?: string;
  checkedAt: string;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Unknown";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("notifications");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Read ?tab= from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as SettingsTab | null;
      if (
        tab &&
        [
          "workspace",
          "whatsapp",
          "ai",
          "notifications",
          "security",
          "billing",
        ].includes(tab)
      ) {
        setActiveTab(tab);
      }
    }
  }, []);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Workspace form state
  const [workspaceName, setWorkspaceName] = useState("ABC Academy");
  const [workspaceDescription, setWorkspaceDescription] = useState(
    "Empowering students with quality education through technology.",
  );
  const [timeZone, setTimeZone] = useState("(GMT+05:30) India Standard Time");
  const [language, setLanguage] = useState("English");

  // WhatsApp Tab — development connection (real API)
  const [waLoading, setWaLoading] = useState(false);
  const [waConnecting, setWaConnecting] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [waDisconnecting, setWaDisconnecting] = useState(false);
  const [waConnection, setWaConnection] =
    useState<ProjectWhatsAppConnection | null>(null);
  const [waProjectId, setWaProjectId] = useState<string | null>(null);
  const [waDevConfigAvailable, setWaDevConfigAvailable] = useState(false);
  const [waHealth, setWaHealth] = useState<ConnectionHealth | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [waReasonCode, setWaReasonCode] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // AI Tab state (EXACT MATCH TO SCREENSHOT)
  const [aiModel, setAiModel] = useState("GPT-4o (Recommended)");
  const [responseTone, setResponseTone] = useState("Friendly & Professional");
  const [businessContext, setBusinessContext] = useState(
    "We are an education institute offering courses in technology, design, and business. We help students with admissions, course information, and career guidance.",
  );
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [saveConversationHistory, setSaveConversationHistory] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);

  // Notifications Tab state (EXACT MATCH TO SCREENSHOT)
  const [notifEmailMessages, setNotifEmailMessages] = useState(true);
  const [notifEmailCampaign, setNotifEmailCampaign] = useState(true);
  const [notifEmailAgentAlerts, setNotifEmailAgentAlerts] = useState(true);
  const [notifEmailTeamActivity, setNotifEmailTeamActivity] = useState(false);
  const [notifInAppMessages, setNotifInAppMessages] = useState(true);
  const [notifInAppCampaign, setNotifInAppCampaign] = useState(true);
  const [notifInAppSystemUpdates, setNotifInAppSystemUpdates] = useState(true);

  // Security Tab state (EXACT MATCH TO SCREENSHOT)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Legacy variables for backward compat
  const defaultAgent = "Sales Assistant";
  const aiTemperature = 0.7;
  const autoHandoff = true;
  const emailAlerts = true;
  const inAppAlerts = true;
  const campaignDigest = true;
  const twoFactorAuth = twoFactorEnabled;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      setWaLoading(true);
      setWaError(null);
      const res = await fetch("/api/workspace/whatsapp");
      const data = await res.json();
      if (!res.ok) {
        setWaError(data.error || "Failed to load WhatsApp status");
        return;
      }
      setWaDevConfigAvailable(Boolean(data.devConfigAvailable));
      setWaProjectId(data.projectId || null);
      const conn = data.connection as ProjectWhatsAppConnection | null;
      setWaConnection(conn);
      if (!conn || conn.status === "DISCONNECTED") {
        setWaHealth(null);
        setWaReasonCode(null);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp status:", err);
      setWaError("Failed to load WhatsApp status");
    } finally {
      setWaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "whatsapp") {
      fetchWhatsAppStatus();
    }
  }, [activeTab, fetchWhatsAppStatus]);

  const handleDevConnect = async () => {
    try {
      setWaConnecting(true);
      setWaError(null);
      setWaReasonCode(null);
      const res = await fetch("/api/workspace/whatsapp/dev-connect", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setWaReasonCode(data.reasonCode || "META_API_ERROR");
        setWaError(
          data.error || data.message || "Unable to connect to WhatsApp.",
        );
        showToast(data.error || "Connection failed");
        return;
      }
      setWaConnection(data.data?.connection || null);
      setWaProjectId(data.data?.projectId || null);
      setWaReasonCode(data.data?.reasonCode || "CONNECTED");
      setWaHealth(null);
      showToast(data.data?.message || "WhatsApp connected");
      await fetchWhatsAppStatus();
    } catch {
      setWaReasonCode("NETWORK_ERROR");
      setWaError("Unable to reach the server. Please try again.");
    } finally {
      setWaConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setWaTesting(true);
      setWaError(null);
      const res = await fetch("/api/workspace/whatsapp/test", {
        method: "POST",
      });
      const data = await res.json();
      const health = data.data?.health as ConnectionHealth | undefined;
      if (health) setWaHealth(health);
      if (data.data?.connection) setWaConnection(data.data.connection);
      setWaReasonCode(data.data?.reasonCode || health?.reasonCode || null);
      if (!res.ok || data.status === "error") {
        setWaError(
          data.data?.message ||
            data.error ||
            health?.message ||
            "Unable to connect to WhatsApp.",
        );
        showToast(data.data?.message || "Connection test failed");
      } else {
        setWaError(null);
        showToast("Connection healthy");
      }
    } catch {
      setWaReasonCode("NETWORK_ERROR");
      setWaError("Unable to reach Meta API. Check your network connection.");
    } finally {
      setWaTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setWaDisconnecting(true);
      const res = await fetch("/api/workspace/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to disconnect");
        return;
      }
      setShowDisconnectConfirm(false);
      setWaHealth(null);
      setWaError(null);
      setWaReasonCode(null);
      showToast("WhatsApp disconnected");
      await fetchWhatsAppStatus();
    } catch {
      showToast("Failed to disconnect");
    } finally {
      setWaDisconnecting(false);
    }
  };

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Workspace settings saved successfully");
  };

  const showConnectedUi =
    Boolean(waConnection) &&
    waConnection!.status !== "DISCONNECTED" &&
    waConnection!.status !== "PENDING";

  const NAV_ITEMS: {
    id: SettingsTab;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    iconColor?: string;
  }[] = [
    {
      id: "workspace",
      label: "Workspace",
      sublabel: "Basic information",
      icon: Building2,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      sublabel: "Connection settings",
      icon: WhatsAppIcon,
      iconColor: "text-[#25D366]",
    },
    {
      id: "ai",
      label: "AI",
      sublabel: "AI agent preferences",
      icon: Bot,
    },
    {
      id: "notifications",
      label: "Notifications",
      sublabel: "Email & in-app alerts",
      icon: Bell,
    },
    {
      id: "security",
      label: "Security",
      sublabel: "Password & access",
      icon: Shield,
    },
    {
      id: "billing",
      label: "Billing",
      sublabel: "Subscription & payments",
      icon: CreditCard,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] px-8 py-8 min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your workspace settings.
          </p>
        </div>

        {/* ── Two-Column Layout ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ── Left Column: Categories List (w-72) ────────────────────────── */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#eff5ff] text-[#1b59f8]"
                      : "bg-transparent hover:bg-white/60 text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.id === "whatsapp"
                        ? "text-[#25D366]"
                        : isActive
                          ? "text-[#1b59f8]"
                          : item.iconColor || "text-gray-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold leading-tight ${
                        isActive ? "text-[#1b59f8]" : "text-gray-800"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        isActive ? "text-[#3b82f6]" : "text-gray-400"
                      }`}
                    >
                      {item.sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Right Column: Detail Content Card ──────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* WORKSPACE TAB */}
            {activeTab === "workspace" && (
              <form
                onSubmit={handleSaveWorkspace}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 sm:p-10 space-y-7"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      Workspace
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Update your workspace details and preferences.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#7ea5fb] hover:bg-[#6b94fa] text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="ABC Academy"
                    className="w-full px-4 py-2.5 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400 transition-all shadow-2xs"
                  />
                  <p className="text-xs text-gray-400">
                    This name will be shown across your workspace.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Workspace Description
                  </label>
                  <textarea
                    rows={4}
                    value={workspaceDescription}
                    onChange={(e) => setWorkspaceDescription(e.target.value)}
                    placeholder="Empowering students with quality education through technology."
                    className="w-full px-4 py-3 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400 transition-all shadow-2xs"
                  />
                  <p className="text-xs text-gray-400">
                    A short description about your organization.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Workspace Logo
                  </label>
                  <div className="flex items-center gap-6 pt-1">
                    <div className="w-24 h-24 rounded-2xl border border-gray-200/80 bg-white flex items-center justify-center p-2.5 shadow-2xs">
                      <div className="w-full h-full rounded-2xl bg-[#36c6b2] text-white font-bold text-xl flex items-center justify-center tracking-wider shadow-2xs">
                        ABC
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          showToast("Choose a 512x512 PNG/JPG file")
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 hover:bg-blue-50/50 text-[#1b59f8] rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-[#1b59f8]" />
                        Change Logo
                      </button>
                      <p className="text-xs text-gray-400">
                        Recommended size: 512 × 512px
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-2" />

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Time Zone
                  </label>
                  <div className="relative">
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-2xs"
                    >
                      <option>(GMT+05:30) India Standard Time</option>
                      <option>(GMT+00:00) UTC / Greenwich Mean Time</option>
                      <option>(GMT-05:00) Eastern Time (US & Canada)</option>
                      <option>(GMT-08:00) Pacific Time (US & Canada)</option>
                      <option>(GMT+04:00) Gulf Standard Time (Dubai)</option>
                      <option>(GMT+08:00) Singapore / Hong Kong Time</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Language
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-2xs"
                    >
                      <option>English</option>
                      <option>Hindi (हिंदी)</option>
                      <option>Spanish (Español)</option>
                      <option>Arabic (العربية)</option>
                      <option>French (Français)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-400">
                    This will change the language for your workspace.
                  </p>
                </div>
              </form>
            )}

            {/* WHATSAPP CONNECTION TAB */}
            {activeTab === "whatsapp" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 sm:p-10 space-y-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      WhatsApp
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Connect your development WhatsApp Cloud API account.
                    </p>
                  </div>
                  {!waLoading && showConnectedUi && waConnection?.status === "CONNECTED" && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Connected
                    </div>
                  )}
                  {!waLoading && (!showConnectedUi || waConnection?.status === "DISCONNECTED") && !waError && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Not Connected
                    </div>
                  )}
                  {!waLoading && (waError || waConnection?.status === "ERROR") && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Connection Error
                    </div>
                  )}
                </div>

                {waLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Loading connection status...</span>
                  </div>
                ) : waError && !showConnectedUi ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-4 h-4" />
                        <h3 className="text-sm font-bold">Unable to connect to WhatsApp.</h3>
                      </div>
                      <p className="text-sm text-red-700">
                        <span className="font-semibold">Reason:</span> {waError}
                      </p>
                      {waReasonCode && (
                        <p className="text-xs text-red-600/80 font-mono">{waReasonCode}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleDevConnect}
                      disabled={waConnecting || !waDevConfigAvailable}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1b59f8] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      {waConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Try Again
                    </button>
                  </div>
                ) : !showConnectedUi ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center space-y-3">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#ebfbf3] border border-[#d1f5e2] flex items-center justify-center">
                        <WhatsAppIcon className="w-8 h-8 text-[#25D366]" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">Not Connected</h3>
                      <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Connect your development WhatsApp account using the server-side Cloud API configuration.
                      </p>
                      {!waDevConfigAvailable && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 inline-block">
                          Development credentials are not configured on the server. Ask an admin to set WHATSAPP_* env vars.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={handleDevConnect}
                        disabled={waConnecting || !waDevConfigAvailable}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        {waConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <WhatsAppIcon className="w-4 h-4 text-white" />
                        )}
                        Connect WhatsApp
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border border-gray-200/90 rounded-2xl p-4 sm:p-5 flex items-center gap-4 bg-white shadow-2xs">
                      <div className="w-14 h-14 rounded-2xl bg-[#ebfbf3] border border-[#d1f5e2] flex items-center justify-center flex-shrink-0">
                        <WhatsAppIcon className="w-8 h-8 text-[#25D366]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {waConnection?.businessName || waConnection?.verifiedName || "WhatsApp Business"}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium mt-0.5">
                          {waConnection?.displayPhoneNumber || "Phone pending"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Development connection
                          {waConnection?.lastVerifiedAt
                            ? ` · Last checked ${formatRelativeTime(waConnection.lastVerifiedAt)}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {waConnection?.displayPhoneNumber || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Account</p>
                        <p className="text-sm font-bold text-gray-900 mt-1 font-mono truncate">
                          {waConnection?.wabaId || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">API Status</p>
                        <p className={`text-sm font-bold mt-1 ${
                          waHealth
                            ? waHealth.healthy
                              ? "text-emerald-700"
                              : "text-red-700"
                            : waConnection?.status === "CONNECTED"
                              ? "text-emerald-700"
                              : "text-amber-700"
                        }`}>
                          {waHealth
                            ? waHealth.healthy
                              ? "Healthy"
                              : "Unhealthy"
                            : waConnection?.status === "CONNECTED"
                              ? "Healthy"
                              : waConnection?.status || "Unknown"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Checked</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {formatRelativeTime(waHealth?.checkedAt || waConnection?.lastVerifiedAt)}
                        </p>
                      </div>
                    </div>

                    {waError && (
                      <div className="rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-800">
                        <span className="font-semibold">Reason:</span> {waError}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={waTesting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1b59f8] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        {waTesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                        Test Connection
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisconnectConfirm(true)}
                        disabled={waDisconnecting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-gray-700 rounded-xl text-sm font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        <Unlink className="w-4 h-4" />
                        Disconnect
                      </button>
                      {waProjectId && (
                        <Link
                          href={`/projects/${waProjectId}/inbox`}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-[#1b59f8] hover:bg-blue-50 rounded-xl text-sm font-semibold transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Open Inbox
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showDisconnectConfirm && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Disconnect WhatsApp?</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      This disconnects the development WhatsApp connection for this workspace. Conversations and messages are preserved.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDisconnectConfirm(false)}
                      disabled={waDisconnecting}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={waDisconnecting}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {waDisconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI PREFERENCES TAB (PIXEL-PERFECT MATCH TO SCREENSHOT) */}
            {activeTab === "ai" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast("AI settings saved successfully");
                }}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 sm:p-10 space-y-7"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    AI Settings
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure how your AI agents behave across the workspace.
                  </p>
                </div>

                {/* Boxed container with border */}
                <div className="border border-gray-200/90 rounded-2xl p-6 bg-white space-y-6 shadow-2xs">
                  {/* Default AI Model */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-900">
                      Default AI Model
                    </label>
                    <p className="text-xs text-gray-400">
                      Select the AI model to use for your agents.
                    </p>
                    <div className="relative">
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-2xs"
                      >
                        <option>GPT-4o (Recommended)</option>
                        <option>Claude 3.5 Sonnet</option>
                        <option>Gemini 1.5 Pro</option>
                        <option>GPT-4o Mini</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Response Tone */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-900">
                      Response Tone
                    </label>
                    <p className="text-xs text-gray-400">
                      Choose the default tone for AI responses.
                    </p>
                    <div className="relative">
                      <select
                        value={responseTone}
                        onChange={(e) => setResponseTone(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-2xs"
                      >
                        <option>Friendly & Professional</option>
                        <option>Casual & Conversational</option>
                        <option>Formal & Direct</option>
                        <option>Empathetic & Helpful</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Business Context */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-900">
                      Business Context
                    </label>
                    <p className="text-xs text-gray-400">
                      Provide a short description about your business. This
                      helps AI give better responses.
                    </p>
                    <div className="relative">
                      <textarea
                        rows={4}
                        maxLength={1000}
                        value={businessContext}
                        onChange={(e) => setBusinessContext(e.target.value)}
                        className="w-full p-4 text-sm text-gray-800 bg-white border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-2xs leading-relaxed"
                      />
                      <div className="flex justify-end pt-1">
                        <span className="text-xs text-gray-400">
                          {businessContext.length}/1000
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Toggle options */}
                <div className="space-y-5 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Enable Web Search
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Allow AI to search the web for real-time information
                        (when needed).
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableWebSearch}
                      onClick={() => setEnableWebSearch(!enableWebSearch)}
                      className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        enableWebSearch ? "bg-[#1b59f8]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                          enableWebSearch ? "translate-x-5.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Save Conversation History
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Allow AI to remember past conversations for better
                        context.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={saveConversationHistory}
                      onClick={() =>
                        setSaveConversationHistory(!saveConversationHistory)
                      }
                      className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        saveConversationHistory ? "bg-[#1b59f8]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                          saveConversationHistory
                            ? "translate-x-5.5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Use Knowledge Base
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Let AI use your knowledge base content for accurate
                        answers.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useKnowledgeBase}
                      onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                      className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        useKnowledgeBase ? "bg-[#1b59f8]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                          useKnowledgeBase ? "translate-x-5.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Save Changes Button at bottom right */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* NOTIFICATIONS TAB (PIXEL-PERFECT MATCH TO SCREENSHOT) */}
            {activeTab === "notifications" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast("Notification settings saved successfully");
                }}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 sm:p-10 space-y-8"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Notifications
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose how you want to be notified.
                  </p>
                </div>

                {/* Section 1: Email Notifications */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Email Notifications
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Receive updates via email.
                    </p>
                  </div>

                  <div className="border border-gray-200/90 rounded-2xl divide-y divide-gray-100 bg-white shadow-2xs">
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          New messages
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Get notified when you receive new WhatsApp messages.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifEmailMessages}
                        onClick={() =>
                          setNotifEmailMessages(!notifEmailMessages)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifEmailMessages ? "bg-[#1b59f8]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifEmailMessages
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          Campaign status
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Receive updates about campaign progress and results.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifEmailCampaign}
                        onClick={() =>
                          setNotifEmailCampaign(!notifEmailCampaign)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifEmailCampaign ? "bg-[#1b59f8]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifEmailCampaign
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          Agent alerts
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Get notified about AI agent errors or important
                          events.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifEmailAgentAlerts}
                        onClick={() =>
                          setNotifEmailAgentAlerts(!notifEmailAgentAlerts)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifEmailAgentAlerts ? "bg-[#1b59f8]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifEmailAgentAlerts
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          Team activity
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Get notified when team members join or make changes.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifEmailTeamActivity}
                        onClick={() =>
                          setNotifEmailTeamActivity(!notifEmailTeamActivity)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifEmailTeamActivity
                            ? "bg-[#1b59f8]"
                            : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifEmailTeamActivity
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: In-app Notifications */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      In-app Notifications
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Show notifications inside the app.
                    </p>
                  </div>

                  <div className="border border-gray-200/90 rounded-2xl divide-y divide-gray-100 bg-white shadow-2xs">
                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          New messages
                        </h4>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifInAppMessages}
                        onClick={() =>
                          setNotifInAppMessages(!notifInAppMessages)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifInAppMessages ? "bg-[#1b59f8]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifInAppMessages
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          Campaign status
                        </h4>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifInAppCampaign}
                        onClick={() =>
                          setNotifInAppCampaign(!notifInAppCampaign)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifInAppCampaign ? "bg-[#1b59f8]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifInAppCampaign
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          System updates
                        </h4>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifInAppSystemUpdates}
                        onClick={() =>
                          setNotifInAppSystemUpdates(!notifInAppSystemUpdates)
                        }
                        className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                          notifInAppSystemUpdates
                            ? "bg-[#1b59f8]"
                            : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                            notifInAppSystemUpdates
                              ? "translate-x-5.5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Changes Button at bottom right */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* SECURITY TAB (PIXEL-PERFECT MATCH TO SCREENSHOT) */}
            {activeTab === "security" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 sm:p-10 space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Security
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Keep your workspace secure.
                  </p>
                </div>

                {/* Section 1: Change Password Card */}
                <div className="border border-gray-200/90 rounded-2xl p-6 bg-white space-y-4 shadow-2xs">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Change Password
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Update your password regularly to keep your account safe.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-2.5 text-sm border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-4 py-2.5 text-sm border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2.5 text-sm border border-gray-200/90 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        showToast("Password updated successfully");
                      }}
                      className="px-5 py-2.5 bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Section 2: Two-Factor Authentication */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Add an extra layer of security to your account.
                    </p>
                  </div>

                  <div className="border border-gray-200/90 rounded-2xl p-5 flex items-center justify-between bg-white shadow-2xs">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {twoFactorEnabled
                            ? "Two-factor authentication is currently enabled."
                            : "Two-factor authentication is currently disabled."}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {twoFactorEnabled
                            ? "Your account is secured with 2FA authenticator."
                            : "Enable 2FA to protect your workspace."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorEnabled(!twoFactorEnabled);
                        showToast(
                          !twoFactorEnabled
                            ? "2FA Enabled successfully"
                            : "2FA Disabled",
                        );
                      }}
                      className="px-4 py-2 bg-white border border-gray-200/90 hover:bg-gray-50 text-blue-600 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer transition-all"
                    >
                      {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                  </div>
                </div>

                {/* Section 3: Active Sessions */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Active Sessions
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Manage your active sessions across different devices.
                    </p>
                  </div>

                  <div className="border border-gray-200/90 rounded-2xl p-5 flex items-center justify-between bg-white shadow-2xs">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">
                            Windows – Chrome
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-bold">
                            Current Session
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Bengaluru, India • Active now
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sign Out All Devices */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        "All other active sessions have been signed out",
                      )
                    }
                    className="px-6 py-2.5 bg-[#ef4444] hover:bg-red-600 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Sign Out All Devices
                  </button>
                </div>
              </div>
            )}

            {/* BILLING TAB (PIXEL-PERFECT MATCH TO SCREENSHOT) */}
            {activeTab === "billing" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 sm:p-10 space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    Billing
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your subscription and payment details.
                  </p>
                </div>

                {/* Section 1: Current Plan Card */}
                <div className="border border-gray-200/90 rounded-2xl p-6 bg-white space-y-5 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Current Plan
                        </p>
                        <h3 className="text-xl font-bold text-gray-900">
                          Pro Plan
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </div>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        ₹2,499 / month
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Renews on 12 Jan 2026
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Everything you need to grow with WhatsApp AI.
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                        5 AI Agents
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                        50,000 messages/month
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                        Team members
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                        Analytics
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        showToast("Subscription plans modal opened")
                      }
                      className="px-4 py-2 bg-white border border-gray-200/90 hover:bg-gray-50 text-blue-600 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      Change Plan
                    </button>
                  </div>
                </div>

                {/* Section 2: Payment Method */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Payment Method
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Your default payment method.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => showToast("Add payment method modal")}
                      className="px-4 py-2 bg-white border border-gray-200/90 hover:bg-gray-50 text-blue-600 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      Add Payment Method
                    </button>
                  </div>

                  <div className="border border-gray-200/90 rounded-2xl p-5 flex items-center justify-between bg-white shadow-2xs">
                    <div className="flex items-center gap-4">
                      {/* Mastercard logo */}
                      <div className="w-12 h-8 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-center flex-shrink-0">
                        <div className="flex items-center -space-x-2">
                          <span className="w-5 h-5 rounded-full bg-[#eb001b]" />
                          <span className="w-5 h-5 rounded-full bg-[#f79e1b] opacity-80" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 font-mono">
                          •••• •••• •••• 4242
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Expires 12/26
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => showToast("Payment options")}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Section 3: Invoice History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Invoice History
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Download your past invoices.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => showToast("All invoices displayed")}
                      className="px-4 py-2 bg-white border border-gray-200/90 hover:bg-gray-50 text-blue-600 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  <div className="border border-gray-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-600">
                          <th className="px-6 py-3.5">Date</th>
                          <th className="px-6 py-3.5">Amount</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                        {[
                          {
                            date: "12 Dec 2025",
                            amount: "₹2,499",
                            status: "Paid",
                          },
                          {
                            date: "12 Nov 2025",
                            amount: "₹2,499",
                            status: "Paid",
                          },
                          {
                            date: "12 Oct 2025",
                            amount: "₹2,499",
                            status: "Paid",
                          },
                        ].map((inv, i) => (
                          <tr
                            key={i}
                            className="hover:bg-gray-50/60 transition-colors"
                          >
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {inv.date}
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-900">
                              {inv.amount}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-semibold text-[11px]">
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(
                                    `Downloading invoice for ${inv.date}...`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
