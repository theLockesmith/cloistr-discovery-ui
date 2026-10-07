/**
 * Auth module - wraps @cloistr/collab-common auth
 * Provides NIP-07 and NIP-46 authentication with circuit breaker,
 * adaptive rate limiting, and session persistence.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SimplePool, type Event } from 'nostr-tools';
import {
  AuthProvider as CollabAuthProvider,
  useNostrAuth,
  type SignerInterface,
} from '@cloistr/auth';
import { withSignerRetry } from '@cloistr/ui';
import { getServiceConfig } from '@cloistr/collab-common/config';
import { getPublicRelays } from './publicRelays';
import { assertPublished, publishToRelays, QUERY_MAX_WAIT_MS } from './relayPublish';
import type { AuthState, UserRelay } from './types';

// Relays for fetching/publishing kind 10002. Both the Cloistr relay and the
// public relays come from runtime config, so a staging container talks only to
// the staging relay.
const DEFAULT_RELAYS = [getServiceConfig().relayUrl, ...getPublicRelays()];

// Pool singleton
const pool = new SimplePool();

// Auth context value type - maintains compatibility with existing components
interface AuthContextValue {
  state: AuthState;
  login: () => Promise<void>;
  loginNip46: (bunkerInput: string) => Promise<void>;
  logout: () => void;
  addRelay: (url: string, read?: boolean, write?: boolean) => Promise<void>;
  removeRelay: (url: string) => Promise<void>;
  hasRelay: (url: string) => boolean;
  isLoading: boolean;
  hasNip07: () => boolean;
}

// Auth context
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Fetch kind 10002 (NIP-65 relay list)
async function fetchRelayList(pubkey: string): Promise<UserRelay[]> {
  const events = await pool.querySync(DEFAULT_RELAYS, {
    kinds: [10002],
    authors: [pubkey],
    limit: 1,
  }, { maxWait: QUERY_MAX_WAIT_MS });

  if (events.length === 0) {
    return [];
  }

  const event = events[0];
  const relays: UserRelay[] = [];

  for (const tag of event.tags) {
    if (tag[0] === 'r' && tag[1]) {
      const url = tag[1];
      const marker = tag[2];
      relays.push({
        url,
        read: !marker || marker === 'read',
        write: !marker || marker === 'write',
      });
    }
  }

  return relays;
}

// Publish kind 10002 event
async function publishRelayList(signer: SignerInterface, relays: UserRelay[]): Promise<void> {
  const pubkey = await signer.getPublicKey();

  const tags = relays.map(r => {
    if (r.read && r.write) {
      return ['r', r.url];
    } else if (r.read) {
      return ['r', r.url, 'read'];
    } else {
      return ['r', r.url, 'write'];
    }
  });

  const unsignedEvent = {
    kind: 10002,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
    pubkey,
  };

  // withSignerRetry retries ONLY retryable failures (relay unreachable /
  // socket closed). A denial (CANCELLED, REMOTE_ERROR) or a timeout
  // (TIMEOUT) is rethrown immediately so the caller can show SignerRecovery.
  const signedEvent = await withSignerRetry(() => signer.signEvent(unsignedEvent));

  // Each relay is bounded; if none accepts, this throws and the caller shows
  // the error instead of spinning or reporting an unsaved list as saved.
  const outcome = await publishToRelays(pool, DEFAULT_RELAYS, signedEvent as Event);
  assertPublished(outcome);
}

/**
 * Auth store hook - wraps collab-common auth with relay list management.
 *
 * MUST be named `use*`: it calls useNostrAuth/useState/useMemo/useCallback, so
 * the react-hooks ESLint rules only apply to it under a hook-shaped name. As
 * `createAuthStore` the linter treated it as an ordinary function and could not
 * see the hook calls inside it.
 */
export function useAuthStore() {
  const collabAuth = useNostrAuth();
  const [relayList, setRelayList] = useState<UserRelay[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Map collab-common state to our state format
  const state: AuthState = useMemo(() => ({
    pubkey: collabAuth.authState.pubkey,
    method: collabAuth.authState.method as 'nip07' | 'nip46' | null,
    relayList,
  }), [collabAuth.authState.pubkey, collabAuth.authState.method, relayList]);

  const hasNip07 = useCallback((): boolean => {
    return typeof window !== 'undefined' && !!window.nostr;
  }, []);

  // Login with NIP-07 using collab-common
  const login = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await collabAuth.connectNip07();
      const pubkey = collabAuth.authState.pubkey;
      if (pubkey) {
        const relays = await fetchRelayList(pubkey);
        setRelayList(relays);
      }
    } finally {
      setIsLoading(false);
    }
  }, [collabAuth]);

  // Login with NIP-46 using collab-common
  const loginNip46 = useCallback(async (bunkerInput: string): Promise<void> => {
    setIsLoading(true);
    try {
      await collabAuth.connectNip46({ bunkerUrl: bunkerInput });
      const pubkey = collabAuth.authState.pubkey;
      if (pubkey) {
        const relays = await fetchRelayList(pubkey);
        setRelayList(relays);
      }
    } finally {
      setIsLoading(false);
    }
  }, [collabAuth]);

  const logout = useCallback((): void => {
    collabAuth.disconnect();
    setRelayList([]);
  }, [collabAuth]);

  // Add relay to user's list
  const addRelay = useCallback(async (url: string, read = true, write = true): Promise<void> => {
    if (!collabAuth.authState.isConnected || !collabAuth.signer) {
      throw new Error('Not logged in');
    }

    if (relayList.some(r => r.url === url)) {
      return;
    }

    const newRelayList = [...relayList, { url, read, write }];
    setRelayList(newRelayList);

    try {
      await publishRelayList(collabAuth.signer, newRelayList);
    } catch (err) {
      setRelayList(relayList); // not saved, so don't show it as saved
      throw err;
    }
  }, [collabAuth, relayList]);

  // Remove relay from user's list
  const removeRelay = useCallback(async (url: string): Promise<void> => {
    if (!collabAuth.authState.isConnected || !collabAuth.signer) {
      throw new Error('Not logged in');
    }

    const newRelayList = relayList.filter(r => r.url !== url);
    setRelayList(newRelayList);

    try {
      await publishRelayList(collabAuth.signer, newRelayList);
    } catch (err) {
      setRelayList(relayList); // not saved, so don't show it as saved
      throw err;
    }
  }, [collabAuth, relayList]);

  const hasRelay = useCallback((url: string): boolean => {
    return relayList.some(r => r.url === url);
  }, [relayList]);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    login,
    loginNip46,
    logout,
    addRelay,
    removeRelay,
    hasRelay,
    isLoading,
    hasNip07,
  }), [state, login, loginNip46, logout, addRelay, removeRelay, hasRelay, isLoading, hasNip07]);

  return value;
}

export { AuthContext, CollabAuthProvider };
