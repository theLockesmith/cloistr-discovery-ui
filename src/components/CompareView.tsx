import { useState, useMemo } from 'react';
import type { Relay } from '../lib/types';
import { useAuth } from '../lib/nostr';
import { getCountryName } from '../lib/countries';

interface Props {
  relays: Relay[];
  isOpen: boolean;
  onClose: () => void;
}

export function CompareView({ relays, isOpen, onClose }: Props) {
  const auth = useAuth();
  const [addingRelay, setAddingRelay] = useState<string | null>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddRelay = async (url: string) => {
    if (!auth.state.pubkey) return;

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
  const bestLatency = useMemo(() => {
    const latencies = relays.map(r => r.latency_ms).filter(l => l > 0);
    return Math.min(...latencies);
  }, [relays]);

  const bestUptime = useMemo(() => {
    const uptimes = relays.map(r => r.uptime_percent || 0);
    return Math.max(...uptimes);
  }, [relays]);

  const healthRank = (health: string) => {
    switch (health) {
      case 'online': return 0;
      case 'degraded': return 1;
      case 'offline': return 2;
      default: return 3;
    }
  };

  const bestHealth = useMemo(() => {
    const ranks = relays.map(r => healthRank(r.health));
    return Math.min(...ranks);
  }, [relays]);

  const isBestLatency = (relay: Relay) => relay.latency_ms === bestLatency;
  const isBestUptime = (relay: Relay) => (relay.uptime_percent || 0) === bestUptime;
  const isBestHealth = (relay: Relay) => healthRank(relay.health) === bestHealth;

  if (!isOpen) return null;

  return (
    <div className="compare-overlay" onClick={handleBackdropClick}>
      <div className="compare-modal">
        <div className="compare-header">
          <h2>Compare Relays</h2>
          <button className="compare-close" onClick={onClose}>&times;</button>
        </div>

        <div className="compare-content">
          <div className="compare-grid" style={{ '--cols': relays.length } as React.CSSProperties}>
            {/* Header row - Relay names */}
            <div className="compare-row compare-row-header">
              <div className="compare-label">Relay</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell compare-cell-header">
                  <strong>{relay.name || 'Unnamed'}</strong>
                  <span className="compare-url">{relay.url}</span>
                </div>
              ))}
            </div>

            {/* Health */}
            <div className="compare-row">
              <div className="compare-label">Health</div>
              {relays.map((relay) => (
                <div key={relay.url} className={`compare-cell ${isBestHealth(relay) ? 'compare-best' : ''}`}>
                  <span className={`health-dot health-${relay.health}`} />
                  <span>{relay.health}</span>
                </div>
              ))}
            </div>

            {/* Latency */}
            <div className="compare-row">
              <div className="compare-label">Latency</div>
              {relays.map((relay) => (
                <div key={relay.url} className={`compare-cell ${isBestLatency(relay) ? 'compare-best' : ''}`}>
                  {relay.latency_ms}ms
                </div>
              ))}
            </div>

            {/* Uptime */}
            <div className="compare-row">
              <div className="compare-label">Uptime</div>
              {relays.map((relay) => (
                <div key={relay.url} className={`compare-cell ${isBestUptime(relay) ? 'compare-best' : ''}`}>
                  {relay.uptime_percent?.toFixed(1) || '?'}%
                </div>
              ))}
            </div>

            {/* NIPs */}
            <div className="compare-row">
              <div className="compare-label">NIPs</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell compare-cell-nips">
                  <span className="compare-nip-count">{relay.supported_nips?.length || 0} NIPs</span>
                  <div className="compare-nip-list">
                    {relay.supported_nips?.slice(0, 8).map(nip => (
                      <span key={nip} className="nip-badge">{nip}</span>
                    ))}
                    {(relay.supported_nips?.length || 0) > 8 && (
                      <span className="nip-more">+{relay.supported_nips!.length - 8}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Moderation */}
            <div className="compare-row">
              <div className="compare-label">Moderation</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  {relay.moderation || 'unknown'}
                </div>
              ))}
            </div>

            {/* Content Policy */}
            <div className="compare-row">
              <div className="compare-label">Content</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  {relay.content_policy || 'unknown'}
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="compare-row">
              <div className="compare-label">Payment</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  <span className={`payment-badge ${relay.payment_required ? 'payment-paid' : 'payment-free'}`}>
                    {relay.payment_required ? 'paid' : 'free'}
                  </span>
                </div>
              ))}
            </div>

            {/* Auth Required */}
            <div className="compare-row">
              <div className="compare-label">Auth</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  {relay.auth_required ? 'required' : 'open'}
                </div>
              ))}
            </div>

            {/* Location */}
            <div className="compare-row">
              <div className="compare-label">Location</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  {getCountryName(relay.country_code) || relay.location || 'unknown'}
                </div>
              ))}
            </div>

            {/* Software */}
            <div className="compare-row">
              <div className="compare-label">Software</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  {relay.software || 'unknown'}
                  {relay.version && (
                    <span className="compare-version"> v{relay.version}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Action row */}
            <div className="compare-row compare-row-actions">
              <div className="compare-label">Action</div>
              {relays.map((relay) => (
                <div key={relay.url} className="compare-cell">
                  {auth.state.pubkey ? (
                    auth.hasRelay(relay.url) ? (
                      <span className="compare-added">Already added</span>
                    ) : (
                      <button
                        className="btn btn-add"
                        onClick={() => handleAddRelay(relay.url)}
                        disabled={addingRelay === relay.url}
                      >
                        {addingRelay === relay.url ? 'Adding...' : 'Add to My Relays'}
                      </button>
                    )
                  ) : (
                    <span className="compare-login-hint">Login to add</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
