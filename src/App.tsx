import { createSignal } from 'solid-js';
import { AuthContext, createAuthStore } from './lib/nostr';
import { RelayList, FilterBar, LoginButton } from './components';
import type { RelayFilters } from './lib/types';
import './App.css';

function App() {
  const auth = createAuthStore();
  const [filters, setFilters] = createSignal<RelayFilters>({ health: 'online' });

  return (
    <AuthContext.Provider value={auth}>
      <div class="app">
        <header class="header">
          <div class="header-content">
            <div class="brand">
              <h1>Relay Discovery</h1>
              <span class="tagline">Find your perfect Nostr relays</span>
            </div>
            <LoginButton />
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
      </div>
    </AuthContext.Provider>
  );
}

export default App;
