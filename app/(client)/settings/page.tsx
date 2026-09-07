'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Phone,
  Copy,
  Check,
  Lock,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import EmbeddedSignupLauncher from '@/components/whatsapp/EmbeddedSignupLauncher';

interface PhoneNumber {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName?: string | null;
  qualityRating: string;
  status: string;
  isCallingEnabled: boolean;
}

interface WhatsAppAccount {
  id: string;
  wabaId: string;
  businessId?: string | null;
  name: string;
  status: string;
  phoneNumbers: PhoneNumber[];
}

export default function SettingsPage() {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnectWaba, setConfirmDisconnectWaba] = useState<string | null>(null);

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks` : 'https://wazzapp.ai/api/webhooks';
  const verifyToken = 'wazzapp_meta_verify_2026';

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspace/whatsapp');
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.data)) {
        setAccounts(data.data);
      }
    } catch (err) {
      console.error('Failed to load workspace connections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleDisconnect = async (wabaId: string) => {
    try {
      setDisconnecting(wabaId);
      const res = await fetch('/api/workspace/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wabaId }),
      });
      if (res.ok) {
        setConfirmDisconnectWaba(null);
        await fetchConnections();
      }
    } catch (err) {
      console.error('Failed to disconnect WABA:', err);
    } finally {
      setDisconnecting(null);
    }
  };

  const copyToClipboard = (text: string, isWebhook: boolean) => {
    navigator.clipboard.writeText(text);
    if (isWebhook) {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-green-400" />
          Workspace & WhatsApp Settings
        </h1>
        <p className="text-sm text-white/40 mt-0.5">
          Manage your Meta WhatsApp Business connections, phone numbers, encryption keys, and webhooks.
        </p>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/20 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-white mb-0.5">AES-256-GCM Token Encryption Active</h3>
          <p className="text-[11px] text-emerald-200/60 leading-relaxed">
            All permanent Meta system user tokens, WABA credentials, and customer data are encrypted at rest using AES-256-GCM symmetric cryptography with unique initialization vectors.
          </p>
        </div>
      </div>

      {/* Connected Phone Numbers */}
      <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Connected WhatsApp Accounts</h2>
            <p className="text-xs text-white/40">WhatsApp Business Accounts and phone numbers linked to this workspace.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchConnections}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
              title="Refresh connections"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <EmbeddedSignupLauncher
              appId={process.env.NEXT_PUBLIC_FB_APP_ID || '1161271168962295'}
              configId={process.env.NEXT_PUBLIC_FB_CONFIG_ID || '1480112702758162'}
              onSuccess={() => {
                fetchConnections();
              }}
            />
          </div>
        </div>

        {accounts.length === 0 && !loading ? (
          <div className="border border-dashed border-white/[0.1] rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/40 mx-auto">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No WhatsApp Accounts Connected</p>
              <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                Connect your WhatsApp Business Account via Meta Embedded Signup to start sending and receiving customer messages in this workspace.
              </p>
            </div>
          </div>
        ) : (
          accounts.map((acc) => (
            <div key={acc.id} className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.01] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">{acc.name}</p>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
                      {acc.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5 font-mono">WABA ID: {acc.wabaId}</p>
                </div>

                <div>
                  {confirmDisconnectWaba === acc.wabaId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Disconnect?
                      </span>
                      <button
                        onClick={() => handleDisconnect(acc.wabaId)}
                        disabled={disconnecting === acc.wabaId}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all cursor-pointer"
                      >
                        {disconnecting === acc.wabaId ? 'Disconnecting...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectWaba(null)}
                        className="px-2 py-1 text-xs text-white/60 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDisconnectWaba(acc.wabaId)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Disconnect WABA"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Phone Numbers for this WABA */}
              {acc.phoneNumbers.length > 0 && (
                <div className="pt-2 border-t border-white/[0.04] space-y-2">
                  {acc.phoneNumbers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-semibold text-white">{p.displayPhoneNumber}</p>
                          <p className="text-[10px] text-white/40">ID: {p.phoneNumberId} • Quality: {p.qualityRating}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/70 font-semibold">
                          Calling: {p.isCallingEnabled ? 'WebRTC Active' : 'Off'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Webhook Configuration */}
      <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white">Meta Webhook Configuration</h2>
          <p className="text-xs text-white/40">Configure these details in the Meta App Developer Dashboard.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Callback URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/80"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, true)}
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/70 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Verify Token</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={verifyToken}
                className="flex-1 px-3.5 py-2 text-xs font-mono bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/80"
              />
              <button
                onClick={() => copyToClipboard(verifyToken, false)}
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white/70 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedToken ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
