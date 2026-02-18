import { createSignal } from 'solid-js';
import { AuthContext, createAuthStore } from './lib/nostr';
import { RelayList, FilterBar, LoginButton, RecommendationWizard } from './components';
import type { RelayFilters } from './lib/types';
import './App.css';

function App() {
  const auth = createAuthStore();
  const [filters, setFilters] = createSignal<RelayFilters>({ health: 'online' });
  const [showWizard, setShowWizard] = createSignal(false);

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
          <RelayList filters={filters()} />
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
