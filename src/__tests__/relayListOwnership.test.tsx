/**
 * The ownership check in assertListLoaded: writes are refused unless the list
 * on screen belongs to the key the gate says is loaded. The stale-load guard
 * means no real sequence reaches this state today, so the gate is stubbed here
 * to build it directly (cloistr-pr on !101: the check was otherwise untested).
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Event } from 'nostr-tools';

const authState = { pubkey: 'pk2', activePubkey: 'pk2', isConnected: true, method: 'nip07' };
const signer = {
  getPublicKey: vi.fn(async () => 'pk2'),
  signEvent: vi.fn(async (e: object) => ({ ...e, id: 'id', sig: 'sig' })),
};
vi.mock('@cloistr/auth', () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useNostrAuth: () => ({ authState, signer, connectNip07: vi.fn(), connectNip46: vi.fn(), disconnect: vi.fn() }),
}));

// The gate reports pk2 loaded; the test decides which key's list the store holds.
let loadFn: (pubkey: string) => Promise<void> = async () => {};
vi.mock('@cloistr/ui', async orig => ({
  ...(await orig<typeof import('@cloistr/ui')>()),
  useWriteGate: (fn: (pubkey: string) => Promise<void>) => {
    loadFn = fn;
    return { loading: false, loaded: true, failed: false, error: null, pubkey: 'pk2' };
  },
}));

vi.mock('../lib/relayQuery', () => ({
  queryNewest: async () => ({ kind: 10002, created_at: 1, tags: [['r', 'wss://pk1-only.example']] }) as Event,
}));

const published: Event[] = [];
vi.mock('../lib/relayPublish', async orig => ({
  ...(await orig<typeof import('../lib/relayPublish')>()),
  publishToRelays: vi.fn(async (_pool: unknown, relays: string[], event: Event) => {
    published.push(event);
    return { accepted: relays, refused: [] };
  }),
}));

import { useAuthStore } from '../lib/nostr';
import { RelayListNotSavedError } from '../lib/relayPublish';

describe('ownership check', () => {
  it("refuses to write when the gate says pk2 is loaded but the store holds pk1's list", async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(() => loadFn('pk1'));

    await expect(result.current.addRelay('wss://new.example')).rejects.toBeInstanceOf(RelayListNotSavedError);
    await expect(result.current.removeRelay('wss://pk1-only.example')).rejects.toBeInstanceOf(RelayListNotSavedError);
    expect(published).toHaveLength(0);
  });
});
