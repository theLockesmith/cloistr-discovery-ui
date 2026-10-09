import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Event } from 'nostr-tools';
import { assertPublished, publishToRelays } from './relayPublish';

const EVENT = { id: 'x', kind: 10002, pubkey: 'p', created_at: 1, tags: [], content: '', sig: 's' } as Event;
const never = () => new Promise<string>(() => {});

function poolFor(byRelay: Record<string, () => Promise<string>>) {
  return { publish: vi.fn((relays: string[]) => relays.map(r => byRelay[r]())) };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('publishToRelays', () => {
  it('REJECTS IN BOUNDED TIME when the relay never acks, instead of waiting forever', async () => {
    vi.useFakeTimers();
    const pool = poolFor({ 'wss://hangs.example': never });
    const outcome = publishToRelays(pool, ['wss://hangs.example'], EVENT, 1000);
    await vi.advanceTimersByTimeAsync(1001);
    const result = await outcome;
    expect(result.accepted).toEqual([]);
    expect(result.refused).toEqual([
      { relay: 'wss://hangs.example', reason: 'wss://hangs.example did not answer within 1s' },
    ]);
    expect(() => assertPublished(result)).toThrow(/not saved: wss:\/\/hangs.example did not answer within 1s/);
  });

  it('reports each relay on its own: the answering one accepted, the silent one refused', async () => {
    vi.useFakeTimers();
    const pool = poolFor({ 'wss://ok.example': () => Promise.resolve('ok'), 'wss://hangs.example': never });
    const outcome = publishToRelays(pool, ['wss://ok.example', 'wss://hangs.example'], EVENT, 1000);
    await vi.advanceTimersByTimeAsync(1001);
    const result = await outcome;
    expect(result.accepted).toEqual(['wss://ok.example']);
    expect(result.refused.map(r => r.relay)).toEqual(['wss://hangs.example']);
    expect(() => assertPublished(result)).not.toThrow();
  });

  it('passes a relay rejection through as the reason', async () => {
    const pool = poolFor({ 'wss://no.example': () => Promise.reject(new Error('blocked: auth-required')) });
    const result = await publishToRelays(pool, ['wss://no.example'], EVENT, 1000);
    expect(result.refused).toEqual([{ relay: 'wss://no.example', reason: 'blocked: auth-required' }]);
  });

  it('publishes through the shared collab-common helper: one pool call for all relays', async () => {
    const pool = poolFor({ 'wss://a.example': () => Promise.resolve('ok'), 'wss://b.example': () => Promise.resolve('ok') });
    const result = await publishToRelays(pool, ['wss://a.example', 'wss://b.example'], EVENT, 1000);
    expect(pool.publish).toHaveBeenCalledTimes(1);
    expect(pool.publish.mock.calls[0][0]).toEqual(['wss://a.example', 'wss://b.example']);
    expect(result.accepted).toEqual(['wss://a.example', 'wss://b.example']);
  });

  it('treats no relays at all as not saved', () => {
    expect(() => assertPublished({ accepted: [], refused: [] })).toThrow(/no relays configured/);
  });
});
