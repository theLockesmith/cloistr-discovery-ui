import type { Relay } from '../lib/types';

interface Props {
  selectedRelays: Relay[];
  onCompare: () => void;
  onClear: () => void;
  onRemove: (relay: Relay) => void;
}

export function CompareBar({ selectedRelays, onCompare, onClear, onRemove }: Props) {
  const canCompare = selectedRelays.length >= 2;

  if (selectedRelays.length === 0) return null;

  return (
    <div className="compare-bar">
      <div className="compare-bar-content">
        <div className="compare-bar-selected">
          <span className="compare-bar-count">
            {selectedRelays.length} selected
          </span>
          <div className="compare-bar-relays">
            {selectedRelays.map((relay) => (
              <div key={relay.url} className="compare-bar-relay">
                <span className="compare-bar-relay-name">
                  {relay.name || relay.url.replace('wss://', '')}
                </span>
                <button
                  className="compare-bar-relay-remove"
                  onClick={() => onRemove(relay)}
                  title="Remove from comparison"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="compare-bar-actions">
          <button className="btn btn-clear" onClick={onClear}>
            Clear
          </button>
          <button
            className="btn btn-compare"
            onClick={onCompare}
            disabled={!canCompare}
            title={canCompare ? 'Compare selected relays' : 'Select at least 2 relays'}
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
