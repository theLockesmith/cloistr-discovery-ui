/**
 * useRelayReconnect — Part 4 of the signer-resilience design (local implementation).
 *
 * @cloistr/ui 0.27.0 will ship this hook wired into SharedAuthProvider so apps
 * get it automatically. Until 0.27.0 is published (currently only 0.26.0 is in
 * the registry), this copy lives here. When 0.27.0 lands and the lockfile is
 * regenerated, delete this file and remove the call site in App.tsx — the hook
 * will be provided by SharedAuthProvider automatically.
 *
 * WHY THIS EXISTS
 *
 * When a phone backgrounds the page (app-switcher, file picker, screen lock)
 * the OS kills WebSocket connections. Parts 1-3 (SignerRecovery, withSignerRetry)
 * handle signing failures gracefully after the fact. This hook prevents the
 * failure from happening at all by reconnecting relay sockets the moment the
 * page becomes visible again — before the user acts.
 *
 * WHY NIP-46 ONLY
 *
 * NIP-07 (browser extension) signers do not hold persistent WebSockets that we
 * control. Only NIP-46 signers use relay WebSockets that the OS can kill on
 * backgrounding.
 *
 * SESSION STATE IS NEVER TOUCHED
 *
 * This module never calls logout, disconnect, clearSharedSession, or any
 * session-clearing function — by construction. A reconnect hook that clears
 * auth reintroduces the exact bug the signer-resilience design exists to fix.
 */

import { useEffect, useRef } from 'react';
import { useNostrAuth } from '@cloistr/auth';

export interface RelayReconnectOptions {
  /**
   * How long to wait after the last visibility or online event before
   * attempting to warm up the relay connection. Default: 300ms.
   */
  debounceMs?: number;
}

/**
 * Reconnects relay WebSocket connections when the page regains visibility or
 * the network comes back online — before the user acts.
 *
 * Must be called inside a @cloistr/auth AuthProvider tree (SharedAuthProvider
 * satisfies this).
 */
export function useRelayReconnect(options: RelayReconnectOptions = {}): void {
  const { debounceMs = 300 } = options;
  const { authState, signer } = useNostrAuth();

  // Keep current auth state and signer in refs so handlers read the latest
  // values without being removed and re-added on every auth change.
  const authStateRef = useRef(authState);
  const signerRef = useRef(signer);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    signerRef.current = signer;
  }, [signer]);

  useEffect(() => {
    const scheduleReconnect = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const state = authStateRef.current;
        const currentSigner = signerRef.current;

        // Only act for NIP-46 sessions with a live signer.
        if (!state.isConnected || state.method !== 'nip46' || currentSigner === null) {
          return;
        }

        // getPublicKey() exercises the Nip46Signer's lazy-connect path.
        // Failure is silently swallowed; SignerRecovery handles it if the
        // user then takes an action that needs signing.
        currentSigner.getPublicKey().catch(() => {
          // Reconnect failed. Parts 1-3 handle it when the user acts.
        });
      }, debounceMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleReconnect();
      }
    };

    const onOnline = () => {
      scheduleReconnect();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [debounceMs]);
}
