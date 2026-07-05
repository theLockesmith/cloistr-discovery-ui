import type { Relay } from '../lib/types';
import { useAuth } from '../lib/nostr';

interface RelayCardProps {
  relay: Relay;
  selected?: boolean;
  onSelect?: (relay: Relay, selected: boolean) => void;
  selectionDisabled?: boolean;
}

export function RelayCard({ relay, selected, onSelect, selectionDisabled }: RelayCardProps) {
  const auth = useAuth();

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onSelect?.(relay, checked);
  };

  const healthColor = () => {
    switch (relay.health) {
      case 'online': return 'var(--cloistr-success)';
      case 'degraded': return 'var(--cloistr-warning)';
      case 'offline': return 'var(--cloistr-error)';
      default: return 'var(--cloistr-text-muted)';
    }
  };

  const handleAddRelay = async () => {
    try {
      await auth.addRelay(relay.url);
    } catch (err) {
      console.error('Failed to add relay:', err);
    }
  };

  const handleRemoveRelay = async () => {
    try {
      await auth.removeRelay(relay.url);
    } catch (err) {
      console.error('Failed to remove relay:', err);
    }
  };

  return (
    <div className={`relay-card ${selected ? 'relay-card-selected' : ''}`}>
      {onSelect && (
        <label className="relay-checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            disabled={selectionDisabled && !selected}
          />
          <span className="checkbox-mark" />
        </label>
      )}
      <div className="relay-header">
        <div className="relay-title">
          <span className="health-dot" style={{ backgroundColor: healthColor() }} />
          <h3>{relay.name || relay.url}</h3>
        </div>
        <div className="relay-latency">
          {relay.latency_ms}ms
        </div>
      </div>

      <p className="relay-url">{relay.url}</p>

      {relay.description && (
        <p className="relay-description">{relay.description}</p>
      )}

      <div className="relay-tags">
        {relay.topics?.length && relay.topics.map(topic => (
          <span key={topic} className="tag tag-topic">{topic}</span>
        ))}
        {relay.atmosphere && (
          <span className="tag tag-atmosphere">{relay.atmosphere}</span>
        )}
        {relay.moderation && relay.moderation !== 'unmoderated' && (
          <span className="tag tag-moderation">{relay.moderation} moderation</span>
        )}
        {relay.content_policy && relay.content_policy !== 'anything' && (
          <span className="tag tag-content">{relay.content_policy}</span>
        )}
      </div>

      <div className="relay-nips">
        <span className="nips-label">NIPs:</span>
        {relay.supported_nips?.length ? (
          <>
            {relay.supported_nips.slice(0, 10).map(nip => (
              <span key={nip} className="nip-badge">{nip}</span>
            ))}
            {relay.supported_nips.length > 10 && (
              <span className="nip-more">+{relay.supported_nips.length - 10} more</span>
            )}
          </>
        ) : (
          <span className="nip-badge">—</span>
        )}
      </div>

      <div className="relay-footer">
        <div className="relay-meta">
          {relay.uptime_percent !== undefined && (
            <span>{relay.uptime_percent.toFixed(1)}% uptime</span>
          )}
          <span className="payment-badge">{relay.payment_required ? 'paid' : 'free'}</span>
        </div>

        {auth.state.pubkey && (
          auth.hasRelay(relay.url) ? (
            <button className="btn btn-remove" onClick={handleRemoveRelay}>
              Remove
            </button>
          ) : (
            <button className="btn btn-add" onClick={handleAddRelay}>
              Add to My Relays
            </button>
          )
        )}
      </div>
    </div>
  );
}
