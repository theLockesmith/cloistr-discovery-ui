import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SimplePool, type Event, type UnsignedEvent, generateSecretKey } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import type { AuthState, UserRelay } from './types';

// Unified signer interface (compatible with cloistr-ui types)
interface Signer {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<Event>;
}

// NIP-07 adapter to match Signer interface
class Nip07Signer implements Signer {
  async getPublicKey(): Promise<string> {
    if (!window.nostr) throw new Error('No Nostr extension found');
    return window.nostr.getPublicKey();
  }

  async signEvent(event: UnsignedEvent): Promise<Event> {
    if (!window.nostr) throw new Error('No Nostr extension found');
    return window.nostr.signEvent(event);
  }
}

// Auth context value type
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

// Default relays for fetching/publishing kind 10002
const DEFAULT_RELAYS = [
  'wss://relay.cloistr.xyz',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

// Pool singleton
const pool = new SimplePool();

// Module-level state for signers (persists across renders)
let currentSigner: Signer | null = null;
let bunkerSignerInstance: BunkerSigner | null = null;

export function createAuthStore() {
  const [state, setState] = useState<AuthState>({
    pubkey: null,
    method: null,
    relayList: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check if NIP-07 extension is available
  const hasNip07 = useCallback((): boolean => {
    return typeof window !== 'undefined' && !!window.nostr;
  }, []);

  // Fetch kind 10002 (NIP-65 relay list)
  const fetchRelayList = useCallback(async (pubkey: string): Promise<UserRelay[]> => {
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
  }, []);

  // Publish kind 10002 event
  const publishRelayList = useCallback(async (relays: UserRelay[]): Promise<void> => {
    if (!currentSigner) {
      throw new Error('Not logged in');
    }

    const pubkey = await currentSigner.getPublicKey();

    const tags = relays.map(r => {
      if (r.read && r.write) {
        return ['r', r.url];
      } else if (r.read) {
        return ['r', r.url, 'read'];
      } else {
        return ['r', r.url, 'write'];
      }
    });

    const unsignedEvent: UnsignedEvent = {
      kind: 10002,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: '',
      pubkey,
    };

    const signedEvent = await currentSigner.signEvent(unsignedEvent);

    // Publish to default relays
    await Promise.allSettled(
      DEFAULT_RELAYS.map(relay => pool.publish([relay], signedEvent as Event))
    );
  }, []);

  // Login with NIP-07
  const login = useCallback(async (): Promise<void> => {
    if (!hasNip07()) {
      throw new Error('No Nostr extension found. Please install nos2x, Alby, or similar.');
    }

    setIsLoading(true);
    try {
      currentSigner = new Nip07Signer();
      const pubkey = await currentSigner.getPublicKey();

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
  }, [hasNip07, fetchRelayList]);

  // Login with NIP-46 (remote signer)
  const loginNip46 = useCallback(async (bunkerInput: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Parse bunker:// URL or NIP-05 identifier
      const bp = await parseBunkerInput(bunkerInput);
      if (!bp) {
        throw new Error('Invalid bunker URL or NIP-05 identifier');
      }

      // Generate a client secret key for this session
      const clientSecretKey = generateSecretKey();

      // Create the bunker signer
      bunkerSignerInstance = BunkerSigner.fromBunker(clientSecretKey, bp, { pool });

      // Connect to the bunker
      await bunkerSignerInstance.connect();

      // Get the public key
      const pubkey = await bunkerSignerInstance.getPublicKey();

      currentSigner = bunkerSignerInstance;

      // Fetch user's relay list (kind 10002)
      const relayList = await fetchRelayList(pubkey);

      setState({
        pubkey,
        method: 'nip46',
        relayList,
      });
    } catch (err) {
      // Clean up on error
      if (bunkerSignerInstance) {
        await bunkerSignerInstance.close().catch(() => {});
        bunkerSignerInstance = null;
      }
      currentSigner = null;
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchRelayList]);

  const logout = useCallback(async (): Promise<void> => {
    // Clean up NIP-46 connection if active
    if (bunkerSignerInstance) {
      await bunkerSignerInstance.close().catch(() => {});
      bunkerSignerInstance = null;
    }
    currentSigner = null;

    setState({
      pubkey: null,
      method: null,
      relayList: [],
    });
  }, []);

  // Add relay to user's list
  const addRelay = useCallback(async (url: string, read = true, write = true): Promise<void> => {
    if (!state.pubkey || !currentSigner) {
      throw new Error('Not logged in');
    }

    // Check if already in list
    if (state.relayList.some(r => r.url === url)) {
      return;
    }

    // Add to local state
    const newRelayList = [...state.relayList, { url, read, write }];
    setState(s => ({ ...s, relayList: newRelayList }));

    // Publish updated kind 10002
    await publishRelayList(newRelayList);
  }, [state.pubkey, state.relayList, publishRelayList]);

  // Remove relay from user's list
  const removeRelay = useCallback(async (url: string): Promise<void> => {
    if (!state.pubkey || !currentSigner) {
      throw new Error('Not logged in');
    }

    const newRelayList = state.relayList.filter(r => r.url !== url);
    setState(s => ({ ...s, relayList: newRelayList }));

    await publishRelayList(newRelayList);
  }, [state.pubkey, state.relayList, publishRelayList]);

  // Check if relay is in user's list
  const hasRelay = useCallback((url: string): boolean => {
    return state.relayList.some(r => r.url === url);
  }, [state.relayList]);

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

export { AuthContext };
