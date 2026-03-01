import { Show } from 'solid-js';
import type { Relay } from '../lib/types';
import { useAuth } from '../lib/nostr';

interface RelayCardProps {
  relay: Relay;
  selected?: boolean;
  onSelect?: (relay: Relay, selected: boolean) => void;
  selectionDisabled?: boolean;
}

export function RelayCard(props: RelayCardProps) {
  const auth = useAuth();
  const relay = () => props.relay;

  const handleCheckboxChange = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    props.onSelect?.(relay(), checked);
  };

  const healthColor = () => {
    switch (relay().health) {
      case 'online': return '#22c55e';
      case 'degraded': return '#eab308';
      case 'offline': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleAddRelay = async () => {
    try {
      await auth.addRelay(relay().url);
    } catch (err) {
      console.error('Failed to add relay:', err);
    }
  };

  const handleRemoveRelay = async () => {
    try {
      await auth.removeRelay(relay().url);
    } catch (err) {
      console.error('Failed to remove relay:', err);
    }
  };

  return (
    <div class={`relay-card ${props.selected ? 'relay-card-selected' : ''}`}>
      <Show when={props.onSelect}>
        <label class="relay-checkbox">
          <input
            type="checkbox"
            checked={props.selected}
            onChange={handleCheckboxChange}
            disabled={props.selectionDisabled && !props.selected}
          />
          <span class="checkbox-mark" />
        </label>
      </Show>
      <div class="relay-header">
        <div class="relay-title">
          <span class="health-dot" style={{ "background-color": healthColor() }} />
          <h3>{relay().name || relay().url}</h3>
        </div>
        <div class="relay-latency">
          {relay().latency_ms}ms
        </div>
      </div>

      <p class="relay-url">{relay().url}</p>

      <Show when={relay().description}>
        <p class="relay-description">{relay().description}</p>
      </Show>

      <div class="relay-tags">
        <Show when={relay().topics?.length}>
          {relay().topics?.map(topic => (
            <span class="tag tag-topic">{topic}</span>
          ))}
        </Show>
        <Show when={relay().atmosphere}>
          <span class="tag tag-atmosphere">{relay().atmosphere}</span>
        </Show>
        <Show when={relay().moderation && relay().moderation !== 'unmoderated'}>
          <span class="tag tag-moderation">{relay().moderation} moderation</span>
        </Show>
        <Show when={relay().content_policy && relay().content_policy !== 'anything'}>
          <span class="tag tag-content">{relay().content_policy}</span>
        </Show>
      </div>

      <div class="relay-nips">
        <span class="nips-label">NIPs:</span>
        <Show when={relay().supported_nips?.length} fallback={<span class="nip-badge">—</span>}>
          {relay().supported_nips?.slice(0, 10).map(nip => (
            <span class="nip-badge">{nip}</span>
          ))}
          <Show when={(relay().supported_nips?.length || 0) > 10}>
            <span class="nip-more">+{relay().supported_nips!.length - 10} more</span>
          </Show>
        </Show>
      </div>

      <div class="relay-footer">
        <div class="relay-meta">
          <Show when={relay().uptime_percent !== undefined}>
            <span>{relay().uptime_percent!.toFixed(1)}% uptime</span>
          </Show>
          <span class="payment-badge">{relay().payment_required ? 'paid' : 'free'}</span>
        </div>

        <Show when={auth.state().pubkey}>
          <Show
            when={!auth.hasRelay(relay().url)}
            fallback={
              <button class="btn btn-remove" onClick={handleRemoveRelay}>
                Remove
              </button>
            }
          >
            <button class="btn btn-add" onClick={handleAddRelay}>
              Add to My Relays
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}
