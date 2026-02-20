import { Show, For, createSignal } from 'solid-js';
import type { Relay } from '../lib/types';
import { useAuth } from '../lib/nostr';
import { getCountryName } from '../lib/countries';

interface Props {
  relays: Relay[];
  isOpen: boolean;
  onClose: () => void;
}

export function CompareView(props: Props) {
  const auth = useAuth();
  const [addingRelay, setAddingRelay] = createSignal<string | null>(null);

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleAddRelay = async (url: string) => {
    if (!auth.state().pubkey) return;

    setAddingRelay(url);
    try {
      await auth.addRelay(url);
    } catch (err) {
      console.error('Failed to add relay:', err);
    } finally {
      setAddingRelay(null);
    }
  };

  // Find best values for highlighting
  const bestLatency = () => {
    const latencies = props.relays.map(r => r.latency_ms).filter(l => l > 0);
    return Math.min(...latencies);
  };

  const bestUptime = () => {
    const uptimes = props.relays.map(r => r.uptime_percent || 0);
    return Math.max(...uptimes);
  };

  const healthRank = (health: string) => {
    switch (health) {
      case 'online': return 0;
      case 'degraded': return 1;
      case 'offline': return 2;
      default: return 3;
    }
  };

  const bestHealth = () => {
    const ranks = props.relays.map(r => healthRank(r.health));
    return Math.min(...ranks);
  };

  const isBestLatency = (relay: Relay) => relay.latency_ms === bestLatency();
  const isBestUptime = (relay: Relay) => (relay.uptime_percent || 0) === bestUptime();
  const isBestHealth = (relay: Relay) => healthRank(relay.health) === bestHealth();

  return (
    <Show when={props.isOpen}>
      <div class="compare-overlay" onClick={handleBackdropClick}>
        <div class="compare-modal">
          <div class="compare-header">
            <h2>Compare Relays</h2>
            <button class="compare-close" onClick={props.onClose}>&times;</button>
          </div>

          <div class="compare-content">
            <div class="compare-grid" style={{ "--cols": props.relays.length }}>
              {/* Header row - Relay names */}
              <div class="compare-row compare-row-header">
                <div class="compare-label">Relay</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell compare-cell-header">
                      <strong>{relay.name || 'Unnamed'}</strong>
                      <span class="compare-url">{relay.url}</span>
                    </div>
                  )}
                </For>
              </div>

              {/* Health */}
              <div class="compare-row">
                <div class="compare-label">Health</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class={`compare-cell ${isBestHealth(relay) ? 'compare-best' : ''}`}>
                      <span class={`health-dot health-${relay.health}`} />
                      <span>{relay.health}</span>
                    </div>
                  )}
                </For>
              </div>

              {/* Latency */}
              <div class="compare-row">
                <div class="compare-label">Latency</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class={`compare-cell ${isBestLatency(relay) ? 'compare-best' : ''}`}>
                      {relay.latency_ms}ms
                    </div>
                  )}
                </For>
              </div>

              {/* Uptime */}
              <div class="compare-row">
                <div class="compare-label">Uptime</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class={`compare-cell ${isBestUptime(relay) ? 'compare-best' : ''}`}>
                      {relay.uptime_percent?.toFixed(1) || '?'}%
                    </div>
                  )}
                </For>
              </div>

              {/* NIPs */}
              <div class="compare-row">
                <div class="compare-label">NIPs</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell compare-cell-nips">
                      <span class="compare-nip-count">{relay.nips?.length || 0} NIPs</span>
                      <div class="compare-nip-list">
                        {relay.nips?.slice(0, 8).map(nip => (
                          <span class="nip-badge">{nip}</span>
                        ))}
                        <Show when={(relay.nips?.length || 0) > 8}>
                          <span class="nip-more">+{relay.nips!.length - 8}</span>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              {/* Moderation */}
              <div class="compare-row">
                <div class="compare-label">Moderation</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      {relay.moderation || 'unknown'}
                    </div>
                  )}
                </For>
              </div>

              {/* Content Policy */}
              <div class="compare-row">
                <div class="compare-label">Content</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      {relay.content_policy || 'unknown'}
                    </div>
                  )}
                </For>
              </div>

              {/* Payment */}
              <div class="compare-row">
                <div class="compare-label">Payment</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      <span class={`payment-badge payment-${relay.payment}`}>
                        {relay.payment || 'unknown'}
                      </span>
                    </div>
                  )}
                </For>
              </div>

              {/* Admission */}
              <div class="compare-row">
                <div class="compare-label">Admission</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      {relay.admission || 'unknown'}
                    </div>
                  )}
                </For>
              </div>

              {/* Location */}
              <div class="compare-row">
                <div class="compare-label">Location</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      {getCountryName(relay.country_code) || relay.location || 'unknown'}
                    </div>
                  )}
                </For>
              </div>

              {/* Software */}
              <div class="compare-row">
                <div class="compare-label">Software</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      {relay.software || 'unknown'}
                      <Show when={relay.version}>
                        <span class="compare-version"> v{relay.version}</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>

              {/* Action row */}
              <div class="compare-row compare-row-actions">
                <div class="compare-label">Action</div>
                <For each={props.relays}>
                  {(relay) => (
                    <div class="compare-cell">
                      <Show when={auth.state().pubkey} fallback={
                        <span class="compare-login-hint">Login to add</span>
                      }>
                        <Show when={auth.hasRelay(relay.url)} fallback={
                          <button
                            class="btn btn-add"
                            onClick={() => handleAddRelay(relay.url)}
                            disabled={addingRelay() === relay.url}
                          >
                            {addingRelay() === relay.url ? 'Adding...' : 'Add to My Relays'}
                          </button>
                        }>
                          <span class="compare-added">Already added</span>
                        </Show>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
