'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { SessionInfo } from '@/app/types/api';

declare const FB: any;

export interface EmbeddedSignupLauncherProps {
  appId: string;
  configId?: string;
  version?: string;
  featureTypes?: string[];
  features?: string[];
  onStarted?: () => void;
  onSuccess: (authCode: string, sessionInfo: SessionInfo) => void;
  onError?: (error: Error | string) => void;
  onCancel?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function EmbeddedSignupLauncher({
  appId,
  configId = 'default',
  version = 'v3',
  featureTypes = ['whatsapp_business_app_onboarding'],
  features = ['marketing_messages_lite'],
  onStarted,
  onSuccess,
  onError,
  onCancel,
  className = '',
  children,
}: EmbeddedSignupLauncherProps) {
  const esInProgress = useRef(false);
  const popupWindowRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionInfoRef = useRef<SessionInfo | null>(null);
  const authCodeRef = useRef<string | null>(null);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const clearState = useCallback(() => {
    esInProgress.current = false;
    popupWindowRef.current = null;
    stopPolling();
  }, [stopPolling]);

  const triggerCompletionIfReady = useCallback(() => {
    if (authCodeRef.current && sessionInfoRef.current) {
      const code = authCodeRef.current;
      const session = sessionInfoRef.current;
      authCodeRef.current = null;
      sessionInfoRef.current = null;
      onSuccessRef.current(code, session);
    }
  }, []);

  const fbLoginCallback = (response: { authResponse?: { code: string }; error?: any }) => {
    clearState();
    if (response.authResponse?.code) {
      authCodeRef.current = response.authResponse.code;
      triggerCompletionIfReady();
    } else {
      if (response.error) {
        onError?.(response.error.message || 'Meta login failed');
      } else {
        onCancel?.();
      }
    }
  };

  const launchSignup = () => {
    if (typeof FB === 'undefined') {
      onError?.('Facebook SDK is not ready yet. Please try again.');
      return;
    }

    onStarted?.();
    sessionInfoRef.current = null;
    authCodeRef.current = null;
    esInProgress.current = true;
    popupWindowRef.current = null;

    const originalWindowOpen = window.open;
    window.open = function (...args) {
      const popup = originalWindowOpen.apply(window, args);
      if (popup) {
        popupWindowRef.current = popup;
      }
      window.open = originalWindowOpen;
      return popup;
    };

    const esConfig = {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        sessionInfoVersion: '3',
        version,
        featureType: featureTypes[0],
        features: features ? features.map((name) => ({ name })) : null,
      },
    };

    FB.login(fbLoginCallback, esConfig);

    stopPolling();
    pollTimerRef.current = setInterval(() => {
      if (!esInProgress.current) {
        stopPolling();
        return;
      }
      const popup = popupWindowRef.current;
      if (popup && popup.closed) {
        clearState();
        onCancel?.();
      }
    }, 500);
  };

  useEffect(() => {
    const initFB = () => {
      FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v24.0',
      });
    };

    if (typeof FB !== 'undefined') {
      initFB();
    } else {
      (window as any).fbAsyncInit = initFB;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.data?.current_step) {
            clearState();
            onCancelRef.current?.();
          } else {
            sessionInfoRef.current = data;
            triggerCompletionIfReady();
          }
        }
      } catch {
        // Ignore unparseable non-signup messages
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      stopPolling();
    };
  }, [appId, clearState, stopPolling, triggerCompletionIfReady]);

  return (
    <button
      onClick={launchSignup}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white text-sm font-semibold rounded-xl hover:bg-[#1565C0] shadow-md transition-all active:scale-[0.98]'
      }
    >
      {children || 'Connect WhatsApp Business'}
    </button>
  );
}
