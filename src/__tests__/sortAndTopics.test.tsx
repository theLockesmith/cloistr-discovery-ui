/**
 * Production 2026-10-16 (WV3): name sort put unnamed relays first, and the
 * topic chips advertised a filter no relay can match (0 relays carry topics).
 * The chips were later removed outright; see the filter bar tests below.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Relay } from '../lib/types';

const relay = (url: string, name: string, latency_ms: number): Relay => ({
  url, name, latency_ms, description: '', pubkey: '', software: '', version: '', supported_nips: [1],
  health: 'online', last_checked: '', payment_required: false, auth_required: false,
});
const relays = [
  relay('wss://zz-unnamed.example', '', 10),
  relay('wss://b.example', 'Bravo', 20),
  relay('wss://a.example', 'alpha', 30),
  relay('wss://blank.example', '   ', 40),
];
const mockAuth = {
  state: { pubkey: null, method: null, relayList: [] },
  login: vi.fn(), loginNip46: vi.fn(), logout: vi.fn(), addRelay: vi.fn(), removeRelay: vi.fn(),
  hasRelay: vi.fn().mockReturnValue(false), isLoading: false, hasNip07: vi.fn().mockReturnValue(false),
};
const withAuth = (ui: React.ReactElement) => render(<AuthContext.Provider value={mockAuth}>{ui}</AuthContext.Provider>);
vi.mock('../lib/api', () => ({ api: { getRelays: vi.fn(async () => ({ relays, total: relays.length })) } }));

import { RelayList } from '../components/RelayList';
import { AuthContext } from '../lib/nostr';
import { FilterBar } from '../components/FilterBar';

const order = () => [...document.querySelectorAll('.relay-card .relay-url')].map(e => e.textContent);

describe('name sort', () => {
  it('sorts named relays by name, case-insensitively, and unnamed relays last in both directions', async () => {
    withAuth(<RelayList filters={{}} />);
    await waitFor(() => expect(order()).toHaveLength(4));

    fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
    expect(order().slice(0, 2)).toEqual(['wss://a.example', 'wss://b.example']);
    expect(order().slice(2).sort()).toEqual(['wss://blank.example', 'wss://zz-unnamed.example']);

    fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
    expect(order().slice(0, 2)).toEqual(['wss://b.example', 'wss://a.example']);
    expect(order().slice(2).sort()).toEqual(['wss://blank.example', 'wss://zz-unnamed.example']);
  });

});

// 2026-10-29: the server has no topic source (the annotation aggregator was
// removed), so every topic filter matches zero relays. The chips are gone, not
// hidden, and the Payment dropdown offers only what NIP-11 can answer.
describe('filter bar', () => {
  it('never shows topic chips, even with a topic filter set', () => {
    render(<FilterBar filters={{ topic: 'bitcoin' } as never} onFilterChange={() => {}} />);
    expect(screen.queryByText('Topics:')).toBeNull();
    expect(screen.queryByRole('button', { name: 'bitcoin' })).toBeNull();
  });

  it('offers only free and paid as payment filters', () => {
    render(<FilterBar filters={{}} onFilterChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /advanced filters/ }));
    const select = screen.getByText('Payment:').querySelector('select')!;
    expect([...select.options].map(o => o.value)).toEqual(['', 'free', 'paid']);
  });
});
