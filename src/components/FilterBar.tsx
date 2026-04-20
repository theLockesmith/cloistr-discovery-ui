import { useState } from 'react';
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

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchText, setSearchText] = useState('');

  const updateFilter = (key: keyof RelayFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value === undefined || value === '') {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }
    onFilterChange(newFilters);
  };

  const toggleTopic = (topic: string) => {
    const current = filters.topic?.split(',').filter(Boolean) || [];
    const index = current.indexOf(topic);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(topic);
    }

    updateFilter('topic', current.join(',') || undefined);
  };

  const toggleNip = (nip: number) => {
    const current = filters.nips?.split(',').filter(Boolean) || [];
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
    const topics = filters.topic?.split(',') || [];
    return topics.includes(topic);
  };

  const isNipActive = (nip: number) => {
    const nips = filters.nips?.split(',') || [];
    return nips.includes(String(nip));
  };

  const clearFilters = () => {
    onFilterChange({});
    setSearchText('');
  };

  const hasActiveFilters = () => {
    return Object.keys(filters).length > 0;
  };

  return (
    <div className="filter-bar">
      {/* Search box */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search relays..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            updateFilter('search', e.target.value || undefined);
          }}
        />
        {hasActiveFilters() && (
          <button className="clear-btn" onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>

      {/* Health filter chips */}
      <div className="filter-section">
        <span className="filter-label">Health:</span>
        <div className="filter-chips">
          {HEALTH_OPTIONS.map(option => (
            <button
              key={option}
              className={`chip ${filters.health === option ? 'active' : ''}`}
              onClick={() => updateFilter('health', filters.health === option ? undefined : option)}
            >
              <span className={`health-indicator health-${option}`} />
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Topic chips */}
      <div className="filter-section">
        <span className="filter-label">Topics:</span>
        <div className="filter-chips">
          {POPULAR_TOPICS.map(topic => (
            <button
              key={topic}
              className={`chip ${isTopicActive(topic) ? 'active' : ''}`}
              onClick={() => toggleTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* NIP chips */}
      <div className="filter-section">
        <span className="filter-label">Features:</span>
        <div className="filter-chips">
          {POPULAR_NIPS.map(({ nip, label }) => (
            <button
              key={nip}
              className={`chip ${isNipActive(nip) ? 'active' : ''}`}
              onClick={() => toggleNip(nip)}
            >
              NIP-{nip} ({label})
            </button>
          ))}
        </div>
      </div>

      {/* Advanced filters toggle */}
      <button
        className="advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced filters
      </button>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-row">
            <label>
              Moderation:
              <select
                value={filters.moderation || ''}
                onChange={(e) => updateFilter('moderation', e.target.value || undefined)}
              >
                <option value="">Any</option>
                {MODERATION_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              Content Policy:
              <select
                value={filters.content_policy || ''}
                onChange={(e) => updateFilter('content_policy', e.target.value || undefined)}
              >
                <option value="">Any</option>
                {CONTENT_POLICY_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              Payment:
              <select
                value={filters.payment || ''}
                onChange={(e) => updateFilter('payment', e.target.value || undefined)}
              >
                <option value="">Any</option>
                {PAYMENT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
