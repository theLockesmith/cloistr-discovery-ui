/**
 * Data-loss regression (production, 2026-10-09): sign-in happens through the
 * @cloistr/ui Header, which never called this store's login(), so the user's
 * existing kind 10002 was never loaded. Adding one relay then published a list
 * of just that relay, replacing the user's real NIP-65 list.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Event } from 'nostr-tools';

const authState = { pubkey: 'pk1' as string | null, activePubkey: 'pk1' as string | null, isConnected: true, method: 'nip07' };
const signer = {
  getPublicKey: vi.fn(async () => 'pk1'),
  signEvent: vi.fn(async (e: object) => ({ ...e, id: 'id', sig: 'sig' })),
};
vi.mock('@cloistr/auth', () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useNostrAuth: () => ({ authState, signer, connectNip07: vi.fn(), connectNip46: vi.fn(), disconnect: vi.fn() }),
}));

const queryNewest = vi.fn();
vi.mock('../lib/relayQuery', () => ({ queryNewest: (...a: unknown[]) => queryNewest(...a) }));

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

const existing = { kind: 10002, created_at: 1, tags: [['r', 'wss://existing.example'], ['r', 'wss://read.example', 'read']] } as Event;

beforeEach(() => {
  published.length = 0;
  queryNewest.mockReset();
  authState.pubkey = 'pk1';
  authState.activePubkey = 'pk1';
});

describe('relay list is loaded before it is ever written', () => {
  it('loads the existing list on sign-in without login() being called, and Add keeps it', async () => {
    queryNewest.mockResolvedValue(existing);
    const { result } = renderHook(() => useAuthStore());

    await waitFor(() => expect(result.current.hasRelay('wss://existing.example')).toBe(true));
    await act(() => result.current.addRelay('wss://new.example'));

    expect(published).toHaveLength(1);
    expect(published[0].tags).toEqual([
      ['r', 'wss://existing.example'],
      ['r', 'wss://read.example', 'read'],
      ['r', 'wss://new.example'],
    ]);
  });

  it('refuses to write while the list is still loading', async () => {
    queryNewest.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuthStore());

    await expect(result.current.addRelay('wss://new.example')).rejects.toBeInstanceOf(RelayListNotSavedError);
    await expect(result.current.removeRelay('wss://existing.example')).rejects.toThrow(/still loading/);
    expect(published).toHaveLength(0);
  });

  it('refuses to write when no relay could be read, instead of publishing over an unseen list', async () => {
    queryNewest.mockRejectedValue(new Error('no relay answered'));
    const { result } = renderHook(() => useAuthStore());

    await waitFor(async () => {
      await expect(result.current.addRelay('wss://new.example')).rejects.toThrow(/could not be read/);
    });
    expect(published).toHaveLength(0);
  });

  it('reloads on a key switch without a new sign-in, and blocks writes until the new list is in', async () => {
    const lists: Record<string, Event> = {
      pk1: existing,
      pk2: { kind: 10002, created_at: 2, tags: [['r', 'wss://second-account.example']] } as Event,
    };
    let release: () => void = () => {};
    queryNewest.mockImplementation(async (_p: unknown, _r: unknown, f: { authors: string[] }) => {
      if (f.authors[0] === 'pk2') await new Promise<void>(r => { release = r; });
      return lists[f.authors[0]];
    });
    const { result, rerender } = renderHook(() => useAuthStore());
    await waitFor(() => expect(result.current.hasRelay('wss://existing.example')).toBe(true));

    authState.pubkey = 'pk2';
    authState.activePubkey = 'pk2';
    rerender();

    // pk1's list must not be shown or written as pk2's while pk2 loads
    expect(result.current.hasRelay('wss://existing.example')).toBe(false);
    await expect(result.current.addRelay('wss://new.example')).rejects.toBeInstanceOf(RelayListNotSavedError);

    await act(async () => release());
    await waitFor(() => expect(result.current.hasRelay('wss://second-account.example')).toBe(true));
    expect(published).toHaveLength(0);
  });

  // cloistr-pr on !100: a load for the previous key that resolves AFTER the new
  // key's load must not replace the new key's list, or the next Add publishes
  // a list of just the new relay (the 2026-10-09 wipe again).
  it('a stale load for the previous key, resolving late, cannot empty the current list', async () => {
    const lists: Record<string, Event> = {
      pk1: existing,
      pk2: { kind: 10002, created_at: 2, tags: [['r', 'wss://second-account.example']] } as Event,
    };
    let releasePk1: () => void = () => {};
    queryNewest.mockImplementation(async (_p: unknown, _r: unknown, f: { authors: string[] }) => {
      if (f.authors[0] === 'pk1') await new Promise<void>(r => { releasePk1 = r; });
      return lists[f.authors[0]];
    });
    const { result, rerender } = renderHook(() => useAuthStore());

    authState.pubkey = 'pk2';
    authState.activePubkey = 'pk2';
    rerender();
    await waitFor(() => expect(result.current.hasRelay('wss://second-account.example')).toBe(true));

    await act(async () => releasePk1());
    await act(() => result.current.addRelay('wss://new.example'));

    expect(published).toHaveLength(1);
    expect(published[0].tags).toEqual([
      ['r', 'wss://second-account.example'],
      ['r', 'wss://new.example'],
    ]);
  });
});
