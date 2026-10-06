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

  it('uses production defaults for "auto" in production', () => {
    g.__CLOISTR_CONFIG__ = { environment: 'production', publicRelays: 'auto' };
    expect(getPublicRelays()).toEqual(DEFAULT_PUBLIC_RELAYS);
  });

  it('returns no relays for "auto" outside production', () => {
    g.__CLOISTR_CONFIG__ = { environment: 'staging', publicRelays: 'auto' };
    expect(getPublicRelays()).toEqual([]);
  });

  it('returns no relays when the field is absent outside production', () => {
    g.__CLOISTR_CONFIG__ = { environment: 'staging' };
    expect(getPublicRelays()).toEqual([]);
  });

  it('treats an unsubstituted nginx variable as unset', () => {
    g.__CLOISTR_CONFIG__ = { environment: 'staging', publicRelays: '${CLOISTR_PUBLIC_RELAYS}' };
    expect(getPublicRelays()).toEqual([]);
  });

  it('returns no relays when explicitly empty, even in production', () => {
    g.__CLOISTR_CONFIG__ = { environment: 'production', publicRelays: '' };
    expect(getPublicRelays()).toEqual([]);
  });

  it('parses an explicit comma-separated list, trimming blanks', () => {
    g.__CLOISTR_CONFIG__ = { environment: 'staging', publicRelays: ' wss://a.example , ,wss://b.example' };
    expect(getPublicRelays()).toEqual(['wss://a.example', 'wss://b.example']);
  });
});
