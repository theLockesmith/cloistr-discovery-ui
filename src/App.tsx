import { createSignal, Show } from 'solid-js';
import { AuthContext, createAuthStore } from './lib/nostr';
import { RelayList, RelayMap, FilterBar, LoginButton, RecommendationWizard, CompareBar, CompareView } from './components';
import type { Relay, RelayFilters } from './lib/types';
import './App.css';

type ViewMode = 'list' | 'map';
const MAX_COMPARE = 3;

function App() {
  const auth = createAuthStore();
  const [filters, setFilters] = createSignal<RelayFilters>({ health: 'online' });
  const [showWizard, setShowWizard] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<ViewMode>('list');
  const [selectedRelays, setSelectedRelays] = createSignal<Relay[]>([]);
  const [showCompare, setShowCompare] = createSignal(false);

  const handleSelectRelay = (relay: Relay, selected: boolean) => {
    if (selected) {
      if (selectedRelays().length < MAX_COMPARE) {
        setSelectedRelays([...selectedRelays(), relay]);
      }
    } else {
      setSelectedRelays(selectedRelays().filter(r => r.url !== relay.url));
    }
  };

  const handleRemoveFromCompare = (relay: Relay) => {
    setSelectedRelays(selectedRelays().filter(r => r.url !== relay.url));
  };

  const handleClearSelection = () => {
    setSelectedRelays([]);
  };

  const handleCompare = () => {
    if (selectedRelays().length >= 2) {
      setShowCompare(true);
    }
  };

  const handleCloseCompare = () => {
    setShowCompare(false);
  };

  return (
    <AuthContext.Provider value={auth}>
      <div class="app">
        <header class="header">
          <div class="header-content">
            <div class="brand">
              <h1>Relay Discovery</h1>
              <span class="tagline">Find your perfect Nostr relays</span>
            </div>
            <div class="header-actions">
              <button class="btn btn-wizard" onClick={() => setShowWizard(true)}>
                Find Relays
              </button>
              <LoginButton />
            </div>
          </div>
        </header>

        <main class="main">
          <FilterBar filters={filters()} onFilterChange={setFilters} />

          <div class="view-toggle">
            <button
              class={`view-toggle-btn ${viewMode() === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              class={`view-toggle-btn ${viewMode() === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              Map
            </button>
          </div>

          <Show when={viewMode() === 'list'}>
            <RelayList
              filters={filters()}
              selectedRelays={selectedRelays()}
              onSelectRelay={handleSelectRelay}
              maxSelection={MAX_COMPARE}
            />
          </Show>
          <Show when={viewMode() === 'map'}>
            <RelayMap filters={filters()} />
          </Show>
        </main>

        <footer class="footer">
          <p>
            Powered by <a href="https://cloistr.xyz">Cloistr</a> |
            Discovery API: <a href="https://discovery.coldforge.xyz">discovery.coldforge.xyz</a>
          </p>
        </footer>

        <CompareBar
          selectedRelays={selectedRelays()}
          onCompare={handleCompare}
          onClear={handleClearSelection}
          onRemove={handleRemoveFromCompare}
        />

        <CompareView
          relays={selectedRelays()}
          isOpen={showCompare()}
          onClose={handleCloseCompare}
        />

        <RecommendationWizard
          isOpen={showWizard()}
          onClose={() => setShowWizard(false)}
        />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
