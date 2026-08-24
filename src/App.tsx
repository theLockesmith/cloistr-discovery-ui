import { useState } from 'react';
import { Header, Footer, ToastProvider, SharedAuthProvider, ThemeProvider } from '@cloistr/ui/components';
import '@cloistr/ui/styles';
import { AuthContext, createAuthStore } from './lib/nostr';
import { useRelayReconnect } from './lib/useRelayReconnect';
import { RelayList, RelayMap, FilterBar, RecommendationWizard, CompareBar, CompareView } from './components';
import type { Relay, RelayFilters } from './lib/types';
import './App.css';

type ViewMode = 'list' | 'map';
const MAX_COMPARE = 3;

// Inner component that uses auth - must be inside CollabAuthProvider
function AppContent() {
  const auth = createAuthStore();
  const [filters, setFilters] = useState<RelayFilters>({ health: 'online' });

  // Part 4 of signer resilience: reconnect relay WebSockets when the page
  // regains visibility (tab switch, app-switcher, lock screen unlock) or the
  // network comes back. This runs before the user acts so a backgrounded
  // NIP-46 signer is warmed up before the next signing call.
  //
  // @cloistr/ui 0.27.0 wires this into SharedAuthProvider automatically.
  // When 0.27.0 is published and the lockfile is regenerated, remove this
  // call and delete src/lib/useRelayReconnect.ts.
  useRelayReconnect();
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRelays, setSelectedRelays] = useState<Relay[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const handleSelectRelay = (relay: Relay, selected: boolean) => {
    if (selected) {
      if (selectedRelays.length < MAX_COMPARE) {
        setSelectedRelays([...selectedRelays, relay]);
      }
    } else {
      setSelectedRelays(selectedRelays.filter(r => r.url !== relay.url));
    }
  };

  const handleRemoveFromCompare = (relay: Relay) => {
    setSelectedRelays(selectedRelays.filter(r => r.url !== relay.url));
  };

  const handleClearSelection = () => {
    setSelectedRelays([]);
  };

  const handleCompare = () => {
    if (selectedRelays.length >= 2) {
      setShowCompare(true);
    }
  };

  const handleCloseCompare = () => {
    setShowCompare(false);
  };

  return (
    <AuthContext.Provider value={auth}>
      <div className="app">
        <Header activeServiceId="discover" />

        <main className="main">
          <div className="page-header">
            <h1>Relay Discovery</h1>
            <p className="tagline">Find your perfect Nostr relays</p>
            <button className="btn btn-wizard" onClick={() => setShowWizard(true)}>
              Find Relays
            </button>
          </div>
          <FilterBar filters={filters} onFilterChange={setFilters} />

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              Map
            </button>
          </div>

          {viewMode === 'list' && (
            <RelayList
              filters={filters}
              selectedRelays={selectedRelays}
              onSelectRelay={handleSelectRelay}
              maxSelection={MAX_COMPARE}
            />
          )}
          {viewMode === 'map' && (
            <RelayMap filters={filters} />
          )}
        </main>

        <Footer />

        <CompareBar
          selectedRelays={selectedRelays}
          onCompare={handleCompare}
          onClear={handleClearSelection}
          onRemove={handleRemoveFromCompare}
        />

        <CompareView
          relays={selectedRelays}
          isOpen={showCompare}
          onClose={handleCloseCompare}
        />

        <RecommendationWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
        />
      </div>
    </AuthContext.Provider>
  );
}

// Main App component - wraps with SharedAuthProvider for cross-domain SSO.
// SharedAuthProvider already renders the @cloistr/auth AuthProvider internally
// (and its SessionSyncManager drives the SSO connect on THAT instance). Nesting
// a second AuthProvider (CollabAuthProvider) here shadowed it: useNostrAuth() in
// the Header read the inner, SSO-untouched instance, so the header stayed on
// "Sign In" even though the nostrconnect handshake completed. One provider only.
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SharedAuthProvider>
          <AppContent />
        </SharedAuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
