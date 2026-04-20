import { useState, useEffect, useMemo } from 'react';
import type { Relay, RelayFilters } from '../lib/types';
import { api } from '../lib/api';
import { RelayCard } from './RelayCard';

interface RelayListProps {
  filters: RelayFilters;
  selectedRelays?: Relay[];
  onSelectRelay?: (relay: Relay, selected: boolean) => void;
  maxSelection?: number;
}

type SortField = 'latency_ms' | 'uptime_percent' | 'health' | 'name';
type SortOrder = 'asc' | 'desc';

export function RelayList({ filters, selectedRelays, onSelectRelay, maxSelection }: RelayListProps) {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('latency_ms');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Fetch relays when filters change
  useEffect(() => {
    let cancelled = false;

    async function fetchRelays() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.getRelays(filters);
        if (!cancelled) {
          setRelays(response.relays || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch relays');
          setRelays([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRelays();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const sortedRelays = useMemo(() => {
    const list = [...relays];

    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle health as priority: online > degraded > offline
      if (sortField === 'health') {
        const healthOrder: Record<string, number> = { online: 0, degraded: 1, offline: 2 };
        const aHealth = healthOrder[a.health] ?? 3;
        const bHealth = healthOrder[b.health] ?? 3;
        return sortOrder === 'asc' ? aHealth - bHealth : bHealth - aHealth;
      }

      // Handle uptime_percent - null values sort to end
      if (sortField === 'uptime_percent') {
        const aUptime = a.uptime_percent ?? -1;
        const bUptime = b.uptime_percent ?? -1;
        if (aUptime === -1 && bUptime === -1) return 0;
        if (aUptime === -1) return 1; // nulls to end
        if (bUptime === -1) return -1; // nulls to end
        return sortOrder === 'asc' ? aUptime - bUptime : bUptime - aUptime;
      }

      // Handle strings (name field)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle numbers (latency_ms field)
      const aNum = aVal as number;
      const bNum = bVal as number;

      if (sortOrder === 'asc') {
        return aNum - bNum;
      }
      return bNum - aNum;
    });

    return list;
  }, [relays, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => {
    const isActive = sortField === field;
    const arrow = isActive ? (sortOrder === 'asc' ? ' ^' : ' v') : '';

    return (
      <button
        className={`sort-btn ${isActive ? 'active' : ''}`}
        onClick={() => toggleSort(field)}
      >
        {label}{arrow}
      </button>
    );
  };

  return (
    <div className="relay-list">
      <div className="relay-list-header">
        <div className="relay-count">
          {loading ? 'Loading...' : `${relays.length} relays`}
        </div>
        <div className="sort-controls">
          <span className="sort-label">Sort by:</span>
          <SortButton field="latency_ms" label="Latency" />
          <SortButton field="uptime_percent" label="Uptime" />
          <SortButton field="health" label="Health" />
          <SortButton field="name" label="Name" />
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Loading relays...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {sortedRelays.length === 0 && (
            <div className="no-results">
              No relays found matching your filters.
            </div>
          )}

          <div className="relay-grid">
            {sortedRelays.map(relay => (
              <RelayCard
                key={relay.url}
                relay={relay}
                selected={selectedRelays?.some(r => r.url === relay.url)}
                onSelect={onSelectRelay}
                selectionDisabled={
                  maxSelection !== undefined &&
                  (selectedRelays?.length ?? 0) >= maxSelection
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
