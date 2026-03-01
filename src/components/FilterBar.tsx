import { createSignal, For, Show } from 'solid-js';
import type { RelayFilters } from '../lib/types';

interface FilterBarProps {
  filters: RelayFilters;
  onFilterChange: (filters: RelayFilters) => void;
}

// Common filter options
const HEALTH_OPTIONS = ['online', 'degraded', 'offline'] as const;
const MODERATION_OPTIONS = ['unmoderated', 'light', 'active', 'strict'] as const;
const CONTENT_POLICY_OPTIONS = ['anything', 'sfw', 'nsfw-allowed', 'nsfw-only'] as const;
const PAYMENT_OPTIONS = ['free', 'paid', 'hybrid'] as const;

// Popular topics for quick access
const POPULAR_TOPICS = ['bitcoin', 'nostr', 'tech', 'art', 'music', 'gaming', 'sports'];

// Popular NIPs
const POPULAR_NIPS = [
  { nip: 50, label: 'Search' },
  { nip: 42, label: 'Auth' },
  { nip: 77, label: 'Negentropy' },
  { nip: 59, label: 'Gift Wrap' },
  { nip: 57, label: 'Zaps' },
];

export function FilterBar(props: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [searchText, setSearchText] = createSignal('');

  const updateFilter = (key: keyof RelayFilters, value: string | undefined) => {
    const newFilters = { ...props.filters };
    if (value === undefined || value === '') {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }
    props.onFilterChange(newFilters);
  };

  const toggleTopic = (topic: string) => {
    const current = props.filters.topic?.split(',').filter(Boolean) || [];
    const index = current.indexOf(topic);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(topic);
    }

    updateFilter('topic', current.join(',') || undefined);
  };

  const toggleNip = (nip: number) => {
    const current = props.filters.nips?.split(',').filter(Boolean) || [];
    const nipStr = String(nip);
    const index = current.indexOf(nipStr);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(nipStr);
    }

    updateFilter('nips', current.join(',') || undefined);
  };

  const isTopicActive = (topic: string) => {
    const topics = props.filters.topic?.split(',') || [];
    return topics.includes(topic);
  };

  const isNipActive = (nip: number) => {
    const nips = props.filters.nips?.split(',') || [];
    return nips.includes(String(nip));
  };

  const clearFilters = () => {
    props.onFilterChange({});
    setSearchText('');
  };

  const hasActiveFilters = () => {
    return Object.keys(props.filters).length > 0;
  };

  return (
    <div class="filter-bar">
      {/* Search box */}
      <div class="search-box">
        <input
          type="text"
          placeholder="Search relays..."
          value={searchText()}
          onInput={(e) => {
            setSearchText(e.currentTarget.value);
            updateFilter('search', e.currentTarget.value || undefined);
          }}
        />
        <Show when={hasActiveFilters()}>
          <button class="clear-btn" onClick={clearFilters}>
            Clear all
          </button>
        </Show>
      </div>

      {/* Health filter chips */}
      <div class="filter-section">
        <span class="filter-label">Health:</span>
        <div class="filter-chips">
          <For each={HEALTH_OPTIONS}>
            {option => (
              <button
                class={`chip ${props.filters.health === option ? 'active' : ''}`}
                onClick={() => updateFilter('health', props.filters.health === option ? undefined : option)}
              >
                <span class={`health-indicator health-${option}`} />
                {option}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Topic chips */}
      <div class="filter-section">
        <span class="filter-label">Topics:</span>
        <div class="filter-chips">
          <For each={POPULAR_TOPICS}>
            {topic => (
              <button
                class={`chip ${isTopicActive(topic) ? 'active' : ''}`}
                onClick={() => toggleTopic(topic)}
              >
                {topic}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* NIP chips */}
      <div class="filter-section">
        <span class="filter-label">Features:</span>
        <div class="filter-chips">
          <For each={POPULAR_NIPS}>
            {({ nip, label }) => (
              <button
                class={`chip ${isNipActive(nip) ? 'active' : ''}`}
                onClick={() => toggleNip(nip)}
              >
                NIP-{nip} ({label})
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Advanced filters toggle */}
      <button
        class="advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced())}
      >
        {showAdvanced() ? 'Hide' : 'Show'} advanced filters
      </button>

      {/* Advanced filters */}
      <Show when={showAdvanced()}>
        <div class="advanced-filters">
          <div class="filter-row">
            <label>
              Moderation:
              <select
                value={props.filters.moderation || ''}
                onChange={(e) => updateFilter('moderation', e.currentTarget.value || undefined)}
              >
                <option value="">Any</option>
                <For each={MODERATION_OPTIONS}>
                  {option => <option value={option}>{option}</option>}
                </For>
              </select>
            </label>

            <label>
              Content Policy:
              <select
                value={props.filters.content_policy || ''}
                onChange={(e) => updateFilter('content_policy', e.currentTarget.value || undefined)}
              >
                <option value="">Any</option>
                <For each={CONTENT_POLICY_OPTIONS}>
                  {option => <option value={option}>{option}</option>}
                </For>
              </select>
            </label>

            <label>
              Payment:
              <select
                value={props.filters.payment || ''}
                onChange={(e) => updateFilter('payment', e.currentTarget.value || undefined)}
              >
                <option value="">Any</option>
                <For each={PAYMENT_OPTIONS}>
                  {option => <option value={option}>{option}</option>}
                </For>
              </select>
            </label>
          </div>
        </div>
      </Show>
    </div>
  );
}
