import { createSignal, createContext, useContext } from 'solid-js';
import { SimplePool, type Event, type EventTemplate, generateSecretKey } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
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

// Unified signer interface
interface Signer {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<Event>;
}

// NIP-07 adapter to match Signer interface
class Nip07Signer implements Signer {
  async getPublicKey(): Promise<string> {
    if (!window.nostr) throw new Error('No Nostr extension found');
    return window.nostr.getPublicKey();
  }

  async signEvent(event: EventTemplate): Promise<Event> {
    if (!window.nostr) throw new Error('No Nostr extension found');
    return window.nostr.signEvent(event) as Promise<Event>;
  }
}

// Auth context
const AuthContext = createContext<{
  state: () => AuthState;
  login: () => Promise<void>;
  loginNip46: (bunkerInput: string) => Promise<void>;
  logout: () => void;
  addRelay: (url: string, read?: boolean, write?: boolean) => Promise<void>;
  removeRelay: (url: string) => Promise<void>;
  hasRelay: (url: string) => boolean;
  isLoading: () => boolean;
  hasNip07: () => boolean;
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

  // Current signer (NIP-07 or NIP-46)
  let currentSigner: Signer | null = null;
  let bunkerSigner: BunkerSigner | null = null;

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
  }

  // Login with NIP-46 (remote signer)
  async function loginNip46(bunkerInput: string): Promise<void> {
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
      bunkerSigner = BunkerSigner.fromBunker(clientSecretKey, bp, { pool });

      // Connect to the bunker
      await bunkerSigner.connect();

      // Get the public key
      const pubkey = await bunkerSigner.getPublicKey();

      currentSigner = bunkerSigner;

      // Fetch user's relay list (kind 10002)
      const relayList = await fetchRelayList(pubkey);

      setState({
        pubkey,
        method: 'nip46',
        relayList,
      });
    } catch (err) {
      // Clean up on error
      if (bunkerSigner) {
        await bunkerSigner.close().catch(() => {});
        bunkerSigner = null;
      }
      currentSigner = null;
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    // Clean up NIP-46 connection if active
    if (bunkerSigner) {
      await bunkerSigner.close().catch(() => {});
      bunkerSigner = null;
    }
    currentSigner = null;

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
    if (!currentState.pubkey || !currentSigner) {
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
    if (!currentState.pubkey || !currentSigner) {
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
    if (!currentSigner) {
      throw new Error('Not logged in');
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

    const unsignedEvent: EventTemplate = {
      kind: 10002,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: '',
    };

    const signedEvent = await currentSigner.signEvent(unsignedEvent);

    // Publish to default relays
    await Promise.allSettled(
      DEFAULT_RELAYS.map(relay => pool.publish([relay], signedEvent as Event))
    );
  }

  return {
    state,
    login,
    loginNip46,
    logout,
    addRelay,
    removeRelay,
    hasRelay,
    isLoading,
    hasNip07,
  };
}

export { AuthContext };
