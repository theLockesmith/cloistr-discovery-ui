import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompareBar } from '../components/CompareBar';
import type { Relay } from '../lib/types';

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

describe('CompareBar', () => {
  it('renders nothing when no relays are selected', () => {
    const { container } = render(
      <CompareBar selectedRelays={[]} onCompare={vi.fn()} onClear={vi.fn()} onRemove={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the count and relay names when relays are selected', () => {
    const relays = [makeRelay('wss://alpha.example', 'Alpha'), makeRelay('wss://beta.example', 'Beta')];
    render(
      <CompareBar selectedRelays={relays} onCompare={vi.fn()} onClear={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('disables Compare button with fewer than 2 relays', () => {
    render(
      <CompareBar
        selectedRelays={[makeRelay('wss://solo.example')]}
        onCompare={vi.fn()}
        onClear={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled();
  });

  it('enables Compare button with 2 or more relays', () => {
    const relays = [makeRelay('wss://a.example'), makeRelay('wss://b.example')];
    render(
      <CompareBar selectedRelays={relays} onCompare={vi.fn()} onClear={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Compare' })).not.toBeDisabled();
  });

  it('calls onRemove when a relay remove button is clicked', async () => {
    const onRemove = vi.fn();
    const relay = makeRelay('wss://alpha.example', 'Alpha');
    render(
      <CompareBar selectedRelays={[relay]} onCompare={vi.fn()} onClear={vi.fn()} onRemove={onRemove} />
    );
    const removeButtons = screen.getAllByTitle('Remove from comparison');
    await userEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(relay);
  });

  it('each remove button has a min-height >= 44px via inline style or class', () => {
    const relay = makeRelay('wss://alpha.example', 'Alpha');
    render(
      <CompareBar selectedRelays={[relay]} onCompare={vi.fn()} onClear={vi.fn()} onRemove={vi.fn()} />
    );
    const removeBtn = screen.getByTitle('Remove from comparison');
    // The CSS class compare-bar-relay-remove sets min-height: 44px.
    // We verify the element carries the class that the CSS targets.
    expect(removeBtn).toHaveClass('compare-bar-relay-remove');
  });

  it('calls onClear when Clear button is clicked', async () => {
    const onClear = vi.fn();
    render(
      <CompareBar
        selectedRelays={[makeRelay('wss://a.example')]}
        onCompare={vi.fn()}
        onClear={onClear}
        onRemove={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('calls onCompare when Compare button is clicked and 2+ relays selected', async () => {
    const onCompare = vi.fn();
    const relays = [makeRelay('wss://a.example'), makeRelay('wss://b.example')];
    render(
      <CompareBar selectedRelays={relays} onCompare={onCompare} onClear={vi.fn()} onRemove={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compare' }));
    expect(onCompare).toHaveBeenCalled();
  });
});
