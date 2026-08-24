/**
 * Signer-resilience behavioural tests for cloistr-discovery-ui.
 *
 * These are DOM tests (jsdom, @testing-library/react). They verify that a
 * signing failure in the relay-list management flow surfaces SignerRecovery
 * ("You are still signed in.") and never redirects to a login screen or calls
 * logout.
 *
 * WHAT IS TESTED
 *
 * The tests mock auth.addRelay to throw a signer error and then assert on what
 * the DOM shows. The auth.logout spy is asserted to have never been called:
 * that is the one invariant that must never break — a signing failure is a
 * reachability problem, not a credentials problem.
 *
 * ASSERTION APPROACH
 *
 * Source-level: the code paths from handleAddRelay / handleRemoveRelay in
 * RelayCard, CompareView, and RecommendationWizard now feed into runAction /
 * handleAddRelay which catch any thrown error and call setSignerError instead
 * of swallowing it or calling logout. SignerRecovery renders when signerError
 * is non-null. The tests confirm that both sides of this are true.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RelayCard } from '../components/RelayCard';
import { CompareView } from '../components/CompareView';
import { AuthContext } from '../lib/nostr';
import type { Relay } from '../lib/types';

// A retryable error: relay unreachable. withSignerRetry exhausts its budget
// and rethrows, so by the time it reaches the component it is still this shape.
const retryableError = Object.assign(new Error('No relays available'), {
  code: 'CONNECTION_FAILED',
});

// A terminal error: the user declined the request. Must never be retried
// automatically and must not trigger logout.
const denialError = Object.assign(new Error('Request cancelled by user'), {
  code: 'CANCELLED',
});

function makeRelay(url: string, name?: string): Relay {
  return {
    url,
    name: name ?? url.replace('wss://', ''),
    description: '',
    pubkey: '',
    software: '',
    version: '',
    supported_nips: [],
    health: 'online',
    latency_ms: 10,
    last_checked: '',
    payment_required: false,
    auth_required: false,
  };
}

/**
 * Build a mock auth context value.
 *
 * logout is a spy; by asserting it was never called we confirm that signing
 * failures do not cause a session clear.
 */
function makeAuth(opts: {
  addRelay?: () => Promise<void>;
  removeRelay?: () => Promise<void>;
  hasRelay?: boolean;
} = {}) {
  return {
    state: { pubkey: 'deadbeef', method: 'nip46' as const, relayList: [] },
    login: vi.fn(),
    loginNip46: vi.fn(),
    logout: vi.fn(),
    addRelay: vi.fn(opts.addRelay ?? (() => Promise.resolve())),
    removeRelay: vi.fn(opts.removeRelay ?? (() => Promise.resolve())),
    hasRelay: vi.fn().mockReturnValue(opts.hasRelay ?? false),
    isLoading: false,
    hasNip07: vi.fn().mockReturnValue(false),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RelayCard
// ─────────────────────────────────────────────────────────────────────────────

describe('RelayCard — signer resilience', () => {
  it('shows "You are still signed in." on connection failure, not a login prompt', async () => {
    const auth = makeAuth({ addRelay: () => Promise.reject(retryableError) });
    const relay = makeRelay('wss://relay.example.com');

    render(
      <AuthContext.Provider value={auth}>
        <RelayCard relay={relay} />
      </AuthContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to My Relays' }));

    await waitFor(() => {
      expect(screen.getByText('You are still signed in.')).toBeInTheDocument();
    });

    // Must NOT expose any sign-in prompt in response to a signer error.
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/log in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();

    // logout must never be called from a signing error path.
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('shows "You are still signed in." on denial (terminal), not a login prompt', async () => {
    const auth = makeAuth({ addRelay: () => Promise.reject(denialError) });
    const relay = makeRelay('wss://relay.example.com');

    render(
      <AuthContext.Provider value={auth}>
        <RelayCard relay={relay} />
      </AuthContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to My Relays' }));

    await waitFor(() => {
      expect(screen.getByText('You are still signed in.')).toBeInTheDocument();
    });

    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('"Go back" dismisses the recovery screen and restores the normal card', async () => {
    const auth = makeAuth({ addRelay: () => Promise.reject(retryableError) });
    const relay = makeRelay('wss://relay.example.com');

    render(
      <AuthContext.Provider value={auth}>
        <RelayCard relay={relay} />
      </AuthContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to My Relays' }));

    await waitFor(() => {
      expect(screen.getByText('You are still signed in.')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));

    await waitFor(() => {
      expect(screen.queryByText('You are still signed in.')).not.toBeInTheDocument();
      // Normal action button is back.
      expect(screen.getByRole('button', { name: 'Add to My Relays' })).toBeInTheDocument();
    });
  });

  it('"Try again" re-runs the action and clears recovery on success', async () => {
    let callCount = 0;
    const auth = makeAuth({
      addRelay: () => {
        callCount++;
        // Fail on first call, succeed on second (simulating a retry after relay recovers).
        if (callCount === 1) return Promise.reject(retryableError);
        return Promise.resolve();
      },
    });
    const relay = makeRelay('wss://relay.example.com');

    render(
      <AuthContext.Provider value={auth}>
        <RelayCard relay={relay} />
      </AuthContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to My Relays' }));

    await waitFor(() => {
      expect(screen.getByText('You are still signed in.')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      // Recovery screen gone — action succeeded.
      expect(screen.queryByText('You are still signed in.')).not.toBeInTheDocument();
    });

    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('shows "You are still signed in." on remove-relay failure', async () => {
    const auth = makeAuth({
      removeRelay: () => Promise.reject(retryableError),
      hasRelay: true,
    });
    const relay = makeRelay('wss://relay.example.com');

    render(
      <AuthContext.Provider value={auth}>
        <RelayCard relay={relay} />
      </AuthContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(screen.getByText('You are still signed in.')).toBeInTheDocument();
    });

    expect(auth.logout).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CompareView
// ─────────────────────────────────────────────────────────────────────────────

describe('CompareView — signer resilience', () => {
  it('shows "You are still signed in." in the action cell on signing failure', async () => {
    const auth = makeAuth({ addRelay: () => Promise.reject(retryableError) });
    const relays = [makeRelay('wss://a.example', 'Alpha'), makeRelay('wss://b.example', 'Beta')];

    render(
      <AuthContext.Provider value={auth}>
        <CompareView relays={relays} isOpen onClose={vi.fn()} />
      </AuthContext.Provider>
    );

    // CompareView renders both a desktop grid and a mobile card section in
    // jsdom (CSS is not evaluated). Each section has one Add button per relay,
    // so getAllByRole finds 4 buttons total. Click the first (desktop/Alpha).
    const addButtons = screen.getAllByRole('button', { name: 'Add to My Relays' });
    await userEvent.click(addButtons[0]);

    await waitFor(() => {
      // SignerRecovery appears in both the desktop grid and mobile card for the
      // failed relay, so getAllByText (not getByText) is the right assertion.
      const instances = screen.getAllByText('You are still signed in.');
      expect(instances.length).toBeGreaterThan(0);
    });

    // Must not expose any sign-in prompt.
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
