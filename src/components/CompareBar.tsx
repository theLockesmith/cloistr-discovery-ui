import { Show, For } from 'solid-js';
import type { Relay } from '../lib/types';

interface Props {
  selectedRelays: Relay[];
  onCompare: () => void;
  onClear: () => void;
  onRemove: (relay: Relay) => void;
}

export function CompareBar(props: Props) {
  const canCompare = () => props.selectedRelays.length >= 2;

  return (
    <Show when={props.selectedRelays.length > 0}>
      <div class="compare-bar">
        <div class="compare-bar-content">
          <div class="compare-bar-selected">
            <span class="compare-bar-count">
              {props.selectedRelays.length} selected
            </span>
            <div class="compare-bar-relays">
              <For each={props.selectedRelays}>
                {(relay) => (
                  <div class="compare-bar-relay">
                    <span class="compare-bar-relay-name">
                      {relay.name || relay.url.replace('wss://', '')}
                    </span>
                    <button
                      class="compare-bar-relay-remove"
                      onClick={() => props.onRemove(relay)}
                      title="Remove from comparison"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="compare-bar-actions">
            <button class="btn btn-clear" onClick={props.onClear}>
              Clear
            </button>
            <button
              class="btn btn-compare"
              onClick={props.onCompare}
              disabled={!canCompare()}
              title={canCompare() ? 'Compare selected relays' : 'Select at least 2 relays'}
            >
              Compare
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
