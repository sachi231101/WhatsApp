'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Unlink,
  Check,
  Building2,
  Hash,
  Activity,
  Zap,
  Users,
  Bot,
  Megaphone,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import EmbeddedSignupLauncher from '@/components/whatsapp/EmbeddedSignupLauncher';
import type { SessionInfo } from '@/app/types/api';

interface WhatsAppConnection {
  id: string;
  workspaceId: string;
  projectId: string;
  wabaId: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  businessName: string | null;
  status: 'PENDING' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
  disconnectedAt: string | null;
}

interface HealthData {
  healthy: boolean;
  api: boolean;
  phone: boolean;
  webhook: boolean;
  token: boolean;
  status: string;
  message?: string;
  checkedAt: string;
}

export default function ProjectWhatsAppPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [appId, setAppId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('MEMBER');

  // Connection flow states
  const [connecting, setConnecting] = useState(false);
  const [connectingStep, setConnectingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Health check states
  const [health, setHealth] = useState<HealthData | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Disconnect modal states
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/projects/${projectId}/whatsapp`);
      const json = await res.json();

      if (res.status === 404) {
        setErrorMsg('Project not found or you do not have permission to view it.');
        return;
      }

      if (res.ok && json.status === 'ok') {
        setProject(json.project);
        setConnection(json.data);
        setAppId(json.appId || '');
        if (json.userRole) setUserRole(json.userRole);
      } else {
        setErrorMsg(json.error || 'Failed to load WhatsApp connection details.');
      }
    } catch (err: any) {
      console.error('Error fetching project WhatsApp:', err);
      setErrorMsg('Network error while loading connection details.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const verifyHealth = useCallback(async () => {
    try {
      setCheckingHealth(true);
      const res = await fetch(`/api/projects/${projectId}/whatsapp/health`);
      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        setHealth(json.data);
      }
    } catch (err) {
      console.error('Error verifying connection health:', err);
    } finally {
      setCheckingHealth(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchConnection();
    }
  }, [projectId, fetchConnection]);

  useEffect(() => {
    if (connection && connection.status === 'CONNECTED') {
      verifyHealth();
    }
  }, [connection, verifyHealth]);

  // Handle Meta Embedded Signup Success
  const handleSignupSuccess = async (authCode: string, sessionInfo: SessionInfo) => {
    try {
      setConnecting(true);
      setErrorMsg(null);
      setConnectingStep('Validating Meta authorization code and discovering WABA...');

      const res = await fetch(`/api/projects/${projectId}/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: authCode,
          appId: appId || process.env.NEXT_PUBLIC_FB_APP_ID || '',
          sessionInfo,
        }),
      });

      const json = await res.json();

      if (res.ok && json.status === 'ok') {
        setConnection(json.data);
        showToast('WhatsApp Business Account connected successfully!');
        verifyHealth();
      } else {
        setErrorMsg(json.error || "We couldn't authenticate with Meta. Please try again.");
      }
    } catch (err: any) {
      console.error('Connection completion error:', err);
      setErrorMsg("We couldn't authenticate with Meta. Please try again.");
    } finally {
      setConnecting(false);
      setConnectingStep('');
    }
  };

  const handleSignupCancel = () => {
    showToast('WhatsApp setup cancelled. No changes were made.');
  };

  const handleSignupError = (err: Error | string) => {
    const message = typeof err === 'string' ? err : err.message;
    setErrorMsg(message || "We couldn't authenticate with Meta. Please try again.");
  };

  // Disconnect Handler
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const res = await fetch(`/api/projects/${projectId}/whatsapp/disconnect`, {
        method: 'POST',
      });
      const json = await res.json();

      if (res.ok && json.status === 'ok') {
        setShowDisconnectModal(false);
        showToast('WhatsApp connection disconnected. Historical data preserved.');
        fetchConnection();
      } else {
        setErrorMsg(json.error || 'Failed to disconnect WhatsApp connection.');
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      setErrorMsg('Failed to disconnect WhatsApp connection.');
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = connection && connection.status === 'CONNECTED';
  const isDisconnected = connection && connection.status === 'DISCONNECTED';
  const isAttentionRequired = connection && (connection.status === 'ERROR' || (health && !health.healthy));

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[500px]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading WhatsApp connection...</p>
      </div>
    );
  }

  if (errorMsg && !connection) {
    return (
      <div className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Project WhatsApp Unavailable</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Project</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">WhatsApp Action Failed</p>
            <p className="text-xs text-red-800/90 mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:text-red-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {project?.name || 'Project Overview'}</span>
        </Link>
      </div>

      {/* Connecting in Progress Banner */}
      {connecting && (
        <div className="bg-white border border-blue-100 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Setting up WhatsApp Connection</h3>
            <p className="text-xs text-gray-500 mt-1">{connectingStep || 'Please wait while Meta verifies credentials...'}</p>
          </div>
        </div>
      )}

      {/* ── STATE 1: ATTENTION REQUIRED / ERROR ── */}
      {isAttentionRequired && !connecting && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-950">WhatsApp Connection</h3>
              <p className="text-sm font-semibold text-amber-900 mt-1">Connection requires attention.</p>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Your WhatsApp connection needs to be reconnected. Existing historical conversations and contacts remain safely stored.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <EmbeddedSignupLauncher
              appId={appId || process.env.NEXT_PUBLIC_FB_APP_ID || ''}
              onSuccess={handleSignupSuccess}
              onError={handleSignupError}
              onCancel={handleSignupCancel}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Reconnect WhatsApp
            </EmbeddedSignupLauncher>
          </div>
        </div>
      )}

      {/* ── STATE 2: CONNECTED ── */}
      {isConnected && !connecting && (
        <div className="space-y-6">
          {/* Connected Header Card */}
          <div className="bg-white border border-emerald-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">WhatsApp Connected</h1>
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Connected to project <span className="font-semibold text-gray-700">{project?.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <EmbeddedSignupLauncher
                  appId={appId || process.env.NEXT_PUBLIC_FB_APP_ID || ''}
                  onSuccess={handleSignupSuccess}
                  onError={handleSignupError}
                  onCancel={handleSignupCancel}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Reconnect</span>
                </EmbeddedSignupLauncher>

                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* Real Meta / Connection Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Business</p>
                <p className="text-sm font-bold text-gray-900 mt-1 truncate">
                  {connection.businessName || 'Meta Business'}
                </p>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block truncate">
                  {connection.verifiedName || 'Verified Account'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">WhatsApp Business Account</p>
                <p className="text-sm font-bold text-gray-900 mt-1 font-mono truncate">
                  {connection.wabaId}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                  Active WABA
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
                <p className="text-sm font-bold text-gray-900 mt-1 font-mono">
                  {connection.displayPhoneNumber || connection.phoneNumberId || 'Registered Number'}
                </p>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block truncate">
                  ID: {connection.phoneNumberId || 'Standard'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status & Webhook</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-sm font-bold text-emerald-700">Connected</p>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                  Webhook Active
                </span>
              </div>
            </div>
          </div>

          {/* Connection Health Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-700" />
                <h3 className="text-base font-bold text-gray-900">Connection Health</h3>
              </div>
              <button
                onClick={verifyHealth}
                disabled={checkingHealth}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
                <span>Verify Now</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">WhatsApp API</span>
                <span className={`text-xs font-bold ${health?.api !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                  {health?.api !== false ? '✓ Active' : '✗ Issue'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Phone Number</span>
                <span className={`text-xs font-bold ${health?.phone !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                  {health?.phone !== false ? '✓ Verified' : '✗ Issue'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Webhook</span>
                <span className={`text-xs font-bold ${health?.webhook !== false ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {health?.webhook !== false ? '✓ Active' : '⚠ Attention'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Access Token</span>
                <span className={`text-xs font-bold ${health?.token !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                  {health?.token !== false ? '✓ Valid' : '✗ Expired'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STATE 3: NOT CONNECTED / DISCONNECTED ── */}
      {(!connection || connection.status === 'PENDING' || isDisconnected) && !connecting && (
        <div className="space-y-6">
          {/* Disconnected Notice Banner */}
          {isDisconnected && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <InfoIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span>
                  WhatsApp was disconnected from this project. All past conversations, contacts, and messages remain preserved.
                </span>
              </div>
            </div>
          )}

          {/* Connect Main Banner */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-xs">
            <div className="max-w-2xl">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-3 inline-block">
                WhatsApp
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Connect your WhatsApp Business account
              </h1>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Connect a WhatsApp Business number to start receiving messages, using AI agents and automating conversations.
              </p>

              <div className="pt-6">
                <EmbeddedSignupLauncher
                  appId={appId || process.env.NEXT_PUBLIC_FB_APP_ID || ''}
                  onSuccess={handleSignupSuccess}
                  onError={handleSignupError}
                  onCancel={handleSignupCancel}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Connect WhatsApp →</span>
                </EmbeddedSignupLauncher>
              </div>
            </div>

            {/* Benefits Checklist */}
            <div className="border-t border-gray-100 mt-8 pt-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Benefits included with your connection:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span>Shared team inbox</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span>AI-powered replies</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span>WhatsApp automation</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span>Campaigns</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span>Conversation analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Unlink className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Disconnect WhatsApp?</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                This will stop new WhatsApp messages from being received for this project.
              </p>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Existing conversations and contacts will remain stored.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                disabled={disconnecting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
    </svg>
  );
}
