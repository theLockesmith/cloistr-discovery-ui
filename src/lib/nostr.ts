import { createSignal, createContext, useContext } from 'solid-js';
import { SimplePool, type Event } from 'nostr-tools';
import type { AuthState, UserRelay } from './types';

// NIP-07 window.nostr interface
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: object): Promise<Event>;
      getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

// Auth context
const AuthContext = createContext<{
  state: () => AuthState;
  login: () => Promise<void>;
  logout: () => void;
  addRelay: (url: string, read?: boolean, write?: boolean) => Promise<void>;
  removeRelay: (url: string) => Promise<void>;
  hasRelay: (url: string) => boolean;
  isLoading: () => boolean;
}>();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Default relays for fetching/publishing kind 10002
const DEFAULT_RELAYS = [
  'wss://relay.cloistr.xyz',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

export function createAuthStore() {
  const [state, setState] = createSignal<AuthState>({
    pubkey: null,
    method: null,
    relayList: [],
  });
  const [isLoading, setIsLoading] = createSignal(false);

  const pool = new SimplePool();

  // Check if NIP-07 extension is available
  function hasNip07(): boolean {
    return typeof window !== 'undefined' && !!window.nostr;
  }

  // Login with NIP-07
  async function login(): Promise<void> {
    if (!hasNip07()) {
      throw new Error('No Nostr extension found. Please install nos2x, Alby, or similar.');
    }

    setIsLoading(true);
    try {
      const pubkey = await window.nostr!.getPublicKey();

      // Fetch user's relay list (kind 10002)
      const relayList = await fetchRelayList(pubkey);

      setState({
        pubkey,
        method: 'nip07',
        relayList,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function logout(): void {
    setState({
      pubkey: null,
      method: null,
      relayList: [],
    });
  }

  // Fetch kind 10002 (NIP-65 relay list)
  async function fetchRelayList(pubkey: string): Promise<UserRelay[]> {
    const events = await pool.querySync(DEFAULT_RELAYS, {
      kinds: [10002],
      authors: [pubkey],
      limit: 1,
    });

    if (events.length === 0) {
      return [];
    }

    // Parse relay list from tags
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

  // Add relay to user's list
  async function addRelay(url: string, read = true, write = true): Promise<void> {
    const currentState = state();
    if (!currentState.pubkey || !hasNip07()) {
      throw new Error('Not logged in');
    }

    // Check if already in list
    if (currentState.relayList.some(r => r.url === url)) {
      return;
    }

    // Add to local state
    const newRelayList = [...currentState.relayList, { url, read, write }];
    setState(s => ({ ...s, relayList: newRelayList }));

    // Publish updated kind 10002
    await publishRelayList(newRelayList);
  }

  // Remove relay from user's list
  async function removeRelay(url: string): Promise<void> {
    const currentState = state();
    if (!currentState.pubkey || !hasNip07()) {
      throw new Error('Not logged in');
    }

    const newRelayList = currentState.relayList.filter(r => r.url !== url);
    setState(s => ({ ...s, relayList: newRelayList }));

    await publishRelayList(newRelayList);
  }

  // Check if relay is in user's list
  function hasRelay(url: string): boolean {
    return state().relayList.some(r => r.url === url);
  }

  // Publish kind 10002 event
  async function publishRelayList(relays: UserRelay[]): Promise<void> {
    if (!hasNip07()) {
      throw new Error('No Nostr extension found');
    }

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
    };

    const signedEvent = await window.nostr!.signEvent(unsignedEvent);

    // Publish to default relays
    await Promise.allSettled(
      DEFAULT_RELAYS.map(relay => pool.publish([relay], signedEvent))
    );
  }

  return {
    state,
    login,
    logout,
    addRelay,
    removeRelay,
    hasRelay,
    isLoading,
  };
}

export { AuthContext };
