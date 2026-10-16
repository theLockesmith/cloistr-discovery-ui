/**
 * Production 2026-10-16 (WV3): name sort put unnamed relays first, and the
 * topic chips advertised a filter no relay can match (0 relays carry topics).
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

  it('reports the loaded relays so the page can tell whether any carry topics', async () => {
    const onRelaysLoaded = vi.fn();
    withAuth(<RelayList filters={{}} onRelaysLoaded={onRelaysLoaded} />);
    await waitFor(() => expect(onRelaysLoaded).toHaveBeenCalledWith(relays));
  });
});

describe('topic chips', () => {
  it('are hidden while no relay carries topics', () => {
    render(<FilterBar filters={{}} onFilterChange={() => {}} showTopics={false} />);
    expect(screen.queryByText('Topics:')).toBeNull();
    expect(screen.queryByRole('button', { name: 'bitcoin' })).toBeNull();
  });

  it('are shown when relays carry topics', () => {
    render(<FilterBar filters={{}} onFilterChange={() => {}} showTopics />);
    expect(screen.getByRole('button', { name: 'bitcoin' })).toBeTruthy();
  });

  it('stay visible while a topic filter is active, so it can be cleared', () => {
    render(<FilterBar filters={{ topic: 'bitcoin' }} onFilterChange={() => {}} showTopics={false} />);
    expect(screen.getByRole('button', { name: 'bitcoin' })).toBeTruthy();
  });
});
