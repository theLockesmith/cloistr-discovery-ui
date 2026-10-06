import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PUBLIC_RELAYS, getPublicRelays } from './publicRelays';

const g = globalThis as { __CLOISTR_CONFIG__?: Record<string, unknown> };

describe('getPublicRelays', () => {
  afterEach(() => {
    delete g.__CLOISTR_CONFIG__;
  });

  it('uses production defaults when there is no runtime config', () => {
    expect(getPublicRelays()).toEqual(DEFAULT_PUBLIC_RELAYS);
  });

  it('uses production defaults when the field is absent', () => {
    g.__CLOISTR_CONFIG__ = { relayUrl: 'wss://relay.cloistr.xyz' };
    expect(getPublicRelays()).toEqual(DEFAULT_PUBLIC_RELAYS);
  });

  it('returns no relays when the field is empty (staging)', () => {
    g.__CLOISTR_CONFIG__ = { publicRelays: '' };
    expect(getPublicRelays()).toEqual([]);
  });

  it('parses a comma-separated list, trimming blanks', () => {
    g.__CLOISTR_CONFIG__ = { publicRelays: ' wss://a.example , ,wss://b.example' };
    expect(getPublicRelays()).toEqual(['wss://a.example', 'wss://b.example']);
  });
});
