import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompareView } from '../components/CompareView';
import { AuthContext } from '../lib/nostr';
import type { Relay } from '../lib/types';

// Minimal auth context value that satisfies the interface
const mockAuth = {
  state: { pubkey: null, method: null, relayList: [] },
  login: vi.fn(),
  loginNip46: vi.fn(),
  logout: vi.fn(),
  addRelay: vi.fn(),
  removeRelay: vi.fn(),
  hasRelay: vi.fn().mockReturnValue(false),
  isLoading: false,
  hasNip07: vi.fn().mockReturnValue(false),
};

function makeRelay(url: string, name?: string): Relay {
  return {
    url,
    name: name ?? url.replace('wss://', ''),
    description: '',
    pubkey: '',
    software: 'khatru',
    version: '1.0',
    supported_nips: [1, 4, 11],
    health: 'online',
    latency_ms: 20,
    last_checked: '',
    payment_required: false,
    auth_required: false,
    uptime_percent: 99.5,
    country_code: 'US',
  };
}

function renderView(relays: Relay[], isOpen: boolean, onClose = vi.fn()) {
  return render(
    <AuthContext.Provider value={mockAuth}>
      <CompareView relays={relays} isOpen={isOpen} onClose={onClose} />
    </AuthContext.Provider>
  );
}

describe('CompareView', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = renderView([makeRelay('wss://a.example')], false);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true', () => {
    renderView([makeRelay('wss://a.example', 'Alpha')], true);
    expect(screen.getByText('Compare Relays')).toBeInTheDocument();
  });

  it('shows relay names in the desktop grid', () => {
    const relays = [makeRelay('wss://a.example', 'Alpha'), makeRelay('wss://b.example', 'Beta')];
    renderView(relays, true);
    // grid has relay names in header cells
    const nameCells = screen.getAllByText('Alpha');
    expect(nameCells.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the mobile card section (compare-mobile-cards) when open', () => {
    const relays = [makeRelay('wss://a.example', 'Alpha'), makeRelay('wss://b.example', 'Beta')];
    const { container } = renderView(relays, true);
    // The mobile card container must be present in the DOM.
    // CSS hides it on desktop — this is a DOM presence test, not a visibility test.
    const mobileCards = container.querySelector('.compare-mobile-cards');
    expect(mobileCards).not.toBeNull();
  });

  it('mobile cards contain one card per relay', () => {
    const relays = [makeRelay('wss://a.example', 'Alpha'), makeRelay('wss://b.example', 'Beta')];
    const { container } = renderView(relays, true);
    const cards = container.querySelectorAll('.compare-mobile-card');
    expect(cards).toHaveLength(2);
  });

  it('mobile cards show relay health', () => {
    const relay = makeRelay('wss://a.example', 'Alpha');
    relay.health = 'online';
    const { container } = renderView([relay], true);
    const mobileCards = container.querySelector('.compare-mobile-cards');
    expect(mobileCards?.textContent).toContain('online');
  });

  it('mobile cards show latency', () => {
    const relay = makeRelay('wss://a.example', 'Alpha');
    relay.latency_ms = 42;
    const { container } = renderView([relay], true);
    const mobileCards = container.querySelector('.compare-mobile-cards');
    expect(mobileCards?.textContent).toContain('42ms');
  });

  it('close button has aria-label for screen-reader and touch-target semantics', () => {
    renderView([makeRelay('wss://a.example')], true);
    const closeBtn = screen.getByLabelText('Close comparison');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveClass('compare-close');
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    renderView([makeRelay('wss://a.example')], true, onClose);
    await userEvent.click(screen.getByLabelText('Close comparison'));
    expect(onClose).toHaveBeenCalled();
  });
});
