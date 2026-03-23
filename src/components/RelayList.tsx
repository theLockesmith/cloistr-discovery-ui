import { For, Show, createSignal, createEffect, on } from 'solid-js';
import type { Relay, RelayFilters } from '../lib/types';
import { api } from '../lib/api';
import { RelayCard } from './RelayCard';

interface RelayListProps {
  filters: RelayFilters;
  selectedRelays?: Relay[];
  onSelectRelay?: (relay: Relay, selected: boolean) => void;
  maxSelection?: number;
}

type SortField = 'latency_ms' | 'name';
type SortOrder = 'asc' | 'desc';

export function RelayList(props: RelayListProps) {
  const [relays, setRelays] = createSignal<Relay[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [sortField, setSortField] = createSignal<SortField>('latency_ms');
  const [sortOrder, setSortOrder] = createSignal<SortOrder>('asc');

  // Fetch relays when filters change
  createEffect(on(() => props.filters, async (filters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getRelays(filters);
      setRelays(response.relays || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch relays');
      setRelays([]);
    } finally {
      setLoading(false);
    }
  }));

  const sortedRelays = () => {
    const list = [...relays()];
    const field = sortField();
    const order = sortOrder();

    list.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      // Handle strings (name field)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle numbers (latency_ms field)
      const aNum = aVal as number;
      const bNum = bVal as number;

      if (order === 'asc') {
        return aNum - bNum;
      }
      return bNum - aNum;
    });

    return list;
  };

  const toggleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortButton = (props: { field: SortField; label: string }) => {
    const isActive = () => sortField() === props.field;
    const arrow = () => {
      if (!isActive()) return '';
      return sortOrder() === 'asc' ? ' ^' : ' v';
    };

    return (
      <button
        class={`sort-btn ${isActive() ? 'active' : ''}`}
        onClick={() => toggleSort(props.field)}
      >
        {props.label}{arrow()}
      </button>
    );
  };

  return (
    <div class="relay-list">
      <div class="relay-list-header">
        <div class="relay-count">
          <Show when={!loading()} fallback="Loading...">
            {relays().length} relays
          </Show>
        </div>
        <div class="sort-controls">
          <span class="sort-label">Sort by:</span>
          <SortButton field="latency_ms" label="Latency" />
          <SortButton field="name" label="Name" />
        </div>
      </div>

      <Show when={error()}>
        <div class="error-message">
          {error()}
        </div>
      </Show>

      <Show when={loading()}>
        <div class="loading">
          <div class="spinner" />
          <span>Loading relays...</span>
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={sortedRelays().length === 0}>
          <div class="no-results">
            No relays found matching your filters.
          </div>
        </Show>

        <div class="relay-grid">
          <For each={sortedRelays()}>
            {relay => (
              <RelayCard
                relay={relay}
                selected={props.selectedRelays?.some(r => r.url === relay.url)}
                onSelect={props.onSelectRelay}
                selectionDisabled={
                  props.maxSelection !== undefined &&
                  (props.selectedRelays?.length ?? 0) >= props.maxSelection
                }
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
