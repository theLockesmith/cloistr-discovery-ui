import { createSignal, Show } from 'solid-js';
import { AuthContext, createAuthStore } from './lib/nostr';
import { RelayList, RelayMap, FilterBar, LoginButton, RecommendationWizard } from './components';
import type { RelayFilters } from './lib/types';
import './App.css';

type ViewMode = 'list' | 'map';

function App() {
  const auth = createAuthStore();
  const [filters, setFilters] = createSignal<RelayFilters>({ health: 'online' });
  const [showWizard, setShowWizard] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<ViewMode>('list');

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
            <RelayList filters={filters()} />
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

        <RecommendationWizard
          isOpen={showWizard()}
          onClose={() => setShowWizard(false)}
        />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
