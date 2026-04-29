import { useState } from 'react';
import { Footer, ToastProvider } from '@cloistr/ui/components';
import '@cloistr/ui/styles';
import { AuthContext, createAuthStore } from './lib/nostr';
import { RelayList, RelayMap, FilterBar, LoginButton, RecommendationWizard, CompareBar, CompareView } from './components';
import type { Relay, RelayFilters } from './lib/types';
import './App.css';

type ViewMode = 'list' | 'map';
const MAX_COMPARE = 3;

function App() {
  const auth = createAuthStore();
  const [filters, setFilters] = useState<RelayFilters>({ health: 'online' });
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
    <ToastProvider>
      <AuthContext.Provider value={auth}>
        <div className="app">
          <header className="header">
            <div className="header-content">
              <div className="brand">
                <img src="/cloistr-logo.svg" alt="Cloistr" className="brand-logo" />
                <div className="brand-text">
                  <h1>Relay Discovery</h1>
                  <span className="tagline">Find your perfect Nostr relays</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="btn btn-wizard" onClick={() => setShowWizard(true)}>
                  Find Relays
                </button>
                <LoginButton />
              </div>
            </div>
          </header>

          <main className="main">
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
    </ToastProvider>
  );
}

export default App;
