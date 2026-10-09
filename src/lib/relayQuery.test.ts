import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Event, Filter } from 'nostr-tools';
import type { SubscribeManyParams as SubParams } from 'nostr-tools/abstract-pool';
import { queryNewest } from './relayQuery';

const ev = (id: string, created_at: number) => ({ id, created_at, kind: 10002, tags: [], content: '', pubkey: 'p', sig: 's' }) as Event;

// Per relay: the events it returns before EOSE, a failed connection, or silence.
type Outcome = Event[] | 'fail' | 'never';

// Mimics SimplePool.subscribeEose for one relay: events, then onclose with
// nostr-tools' EOSE reason, or a failure reason, or nothing at all.
function poolFor(byRelay: Record<string, Outcome>) {
  return {
    subscribeEose: vi.fn((relays: string[], _f: Filter, p: SubParams) => {
      const out = byRelay[relays[0]];
      queueMicrotask(() => {
        if (out === 'never') return;
        if (out === 'fail') return p.onclose?.([{ url: relays[0], reason: 'relay connection failed' }]);
        out.forEach(e => p.onevent?.(e));
        p.onclose?.([{ url: relays[0], reason: 'closed automatically on eose' }]);
      });
      return { close: vi.fn() };
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

// A relay whose connection never completes held the whole sign-in list load
// to maxWait (relay.nostr.band, 2026-10-09: 9s instead of 0.45s).
describe('queryNewest', () => {
  it('does not wait out a relay that never answers once another relay has', async () => {
    vi.useFakeTimers();
    const pool = poolFor({ 'wss://ok.example': [ev('a', 1)], 'wss://dead.example': 'never' });
    let done: Event | null | undefined;
    queryNewest(pool, ['wss://ok.example', 'wss://dead.example'], {}, { graceMs: 1000, maxWaitMs: 10_000 }).then(r => { done = r; });
    await vi.advanceTimersByTimeAsync(1001);
    expect(done?.id).toBe('a');
  });

  it('returns the newest event across relays', async () => {
    const pool = poolFor({ 'wss://a.example': [ev('old', 1)], 'wss://b.example': [ev('new', 5)] });
    const r = await queryNewest(pool, ['wss://a.example', 'wss://b.example'], {});
    expect(r?.id).toBe('new');
  });

  it('returns null when a relay answered and none has the event; one failing relay is fine', async () => {
    const pool = poolFor({ 'wss://a.example': [], 'wss://b.example': 'fail' });
    expect(await queryNewest(pool, ['wss://a.example', 'wss://b.example'], {})).toBeNull();
  });

  it('THROWS when no relay answered, so the caller cannot mistake "unreachable" for "no list"', async () => {
    const pool = poolFor({ 'wss://a.example': 'fail', 'wss://b.example': 'fail' });
    await expect(queryNewest(pool, ['wss://a.example', 'wss://b.example'], {})).rejects.toThrow(/no relay answered/);
  });

  it('queries each relay separately, bounded by maxWait', async () => {
    const pool = poolFor({ 'wss://a.example': [] });
    await queryNewest(pool, ['wss://a.example'], { kinds: [10002] }, { maxWaitMs: 7000 });
    expect(pool.subscribeEose).toHaveBeenCalledWith(['wss://a.example'], { kinds: [10002] }, expect.objectContaining({ maxWait: 7000 }));
  });
});
