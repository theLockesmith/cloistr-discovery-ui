import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Event, Filter } from 'nostr-tools';
import { queryNewest } from './relayQuery';

const ev = (id: string, created_at: number) => ({ id, created_at, kind: 10002, tags: [], content: '', pubkey: 'p', sig: 's' }) as Event;
const never = () => new Promise<Event[]>(() => {});

function poolFor(byRelay: Record<string, () => Promise<Event[]>>) {
  return { querySync: vi.fn((relays: string[], _f: Filter, _p?: { maxWait?: number }) => byRelay[relays[0]]()) };
}

afterEach(() => {
  vi.useRealTimers();
});

// A relay whose connection never completes held the whole sign-in list load
// to maxWait (relay.nostr.band, 2026-10-09: 9s instead of 0.45s).
describe('queryNewest', () => {
  it('does not wait out a relay that never answers once another relay has', async () => {
    vi.useFakeTimers();
    const pool = poolFor({ 'wss://ok.example': () => Promise.resolve([ev('a', 1)]), 'wss://dead.example': never });
    let done: Event | null | undefined;
    queryNewest(pool, ['wss://ok.example', 'wss://dead.example'], {}, { graceMs: 1000, maxWaitMs: 10_000 }).then(r => { done = r; });
    await vi.advanceTimersByTimeAsync(1001);
    expect(done?.id).toBe('a');
  });

  it('returns the newest event across relays', async () => {
    const pool = poolFor({
      'wss://a.example': () => Promise.resolve([ev('old', 1)]),
      'wss://b.example': () => Promise.resolve([ev('new', 5)]),
    });
    const r = await queryNewest(pool, ['wss://a.example', 'wss://b.example'], {});
    expect(r?.id).toBe('new');
  });

  it('returns null when no relay has the event, and a failing relay does not throw', async () => {
    const pool = poolFor({ 'wss://a.example': () => Promise.resolve([]), 'wss://b.example': () => Promise.reject(new Error('connection failed')) });
    expect(await queryNewest(pool, ['wss://a.example', 'wss://b.example'], {})).toBeNull();
  });

  it('queries each relay separately, bounded by maxWait', async () => {
    const pool = poolFor({ 'wss://a.example': () => Promise.resolve([]) });
    await queryNewest(pool, ['wss://a.example'], { kinds: [10002] }, { maxWaitMs: 7000 });
    expect(pool.querySync).toHaveBeenCalledWith(['wss://a.example'], { kinds: [10002] }, { maxWait: 7000 });
  });
});
