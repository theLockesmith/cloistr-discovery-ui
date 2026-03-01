import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
import { useAuth } from '../lib/nostr';
import { getCountryCoordinates, getCountryName } from '../lib/countries';
import type { Relay, RelayFilters } from '../lib/types';

interface Props {
  filters: RelayFilters;
}

interface CountryGroup {
  code: string;
  name: string;
  coords: [number, number];
  relays: Relay[];
}

export function RelayMap(props: Props) {
  const auth = useAuth();
  let mapContainer: HTMLDivElement | undefined;
  let map: L.Map | undefined;
  let markersLayer: L.LayerGroup | undefined;

  const [relays, setRelays] = createSignal<Relay[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedCountry, setSelectedCountry] = createSignal<CountryGroup | null>(null);
  const [addingRelay, setAddingRelay] = createSignal<string | null>(null);

  // Group relays by country (skip relays without country_code)
  const countryGroups = (): CountryGroup[] => {
    const groups: Record<string, CountryGroup> = {};

    for (const relay of relays()) {
      const code = relay.country_code;
      if (!code) continue; // Skip relays without geo data

      const coords = getCountryCoordinates(code);
      if (!coords) continue;

      if (!groups[code]) {
        groups[code] = {
          code,
          name: getCountryName(code),
          coords,
          relays: [],
        };
      }
      groups[code].relays.push(relay);
    }

    return Object.values(groups);
  };

  // Check if any relays have geo data
  const hasGeoData = () => countryGroups().length > 0;

  // Initialize map
  onMount(() => {
    if (!mapContainer) return;

    map = L.map(mapContainer, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      worldCopyJump: true,
    });

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
  });

  onCleanup(() => {
    if (map) {
      map.remove();
      map = undefined;
    }
  });

  // Fetch relays when filters change
  createEffect(async () => {
    const filters = props.filters;
    setLoading(true);
    setError(null);

    try {
      const response = await api.getRelays({ ...filters, limit: 200 });
      setRelays(response.relays || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relays');
    } finally {
      setLoading(false);
    }
  });

  // Update markers when relays change
  createEffect(() => {
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    const groups = countryGroups();

    for (const group of groups) {
      const count = group.relays.length;
      const onlineCount = group.relays.filter(r => r.health === 'online').length;

      // Create custom icon with count
      const icon = L.divIcon({
        className: 'relay-marker',
        html: `<div class="relay-marker-inner" data-count="${count}">${count}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(group.coords, { icon });

      marker.on('click', () => {
        setSelectedCountry(group);
      });

      // Tooltip on hover
      marker.bindTooltip(`${group.name}: ${count} relay${count !== 1 ? 's' : ''} (${onlineCount} online)`, {
        className: 'relay-tooltip',
      });

      markersLayer.addLayer(marker);
    }
  });

  const handleAddRelay = async (url: string) => {
    if (!auth.state().pubkey) return;

    setAddingRelay(url);
    try {
      await auth.addRelay(url);
    } catch (err) {
      console.error('Failed to add relay:', err);
    } finally {
      setAddingRelay(null);
    }
  };

  const closePanel = () => {
    setSelectedCountry(null);
  };

  return (
    <div class="relay-map-container">
      <Show when={loading()}>
        <div class="map-loading">
          <div class="spinner" />
          <span>Loading relays...</span>
        </div>
      </Show>

      <Show when={error()}>
        <div class="map-error">{error()}</div>
      </Show>

      <Show when={!loading() && !error() && relays().length > 0 && !hasGeoData()}>
        <div class="map-no-geo">
          Geographic data not available for relays.
          <br />
          <span class="map-no-geo-hint">Relay location data will be added in a future update.</span>
        </div>
      </Show>

      <div ref={mapContainer} class="relay-map" />

      <Show when={selectedCountry()}>
        <div class="map-panel">
          <div class="map-panel-header">
            <h3>{selectedCountry()!.name}</h3>
            <span class="map-panel-count">
              {selectedCountry()!.relays.length} relay{selectedCountry()!.relays.length !== 1 ? 's' : ''}
            </span>
            <button class="map-panel-close" onClick={closePanel}>&times;</button>
          </div>
          <div class="map-panel-content">
            <For each={selectedCountry()!.relays}>
              {(relay) => (
                <div class="map-relay">
                  <div class="map-relay-header">
                    <span class={`health-dot health-${relay.health}`} />
                    <strong>{relay.name || relay.url}</strong>
                  </div>
                  <span class="map-relay-url">{relay.url}</span>
                  <div class="map-relay-meta">
                    <span>{relay.latency_ms || '?'}ms</span>
                    <span>{relay.uptime_percent?.toFixed(0) || '?'}% up</span>
                  </div>
                  <div class="map-relay-action">
                    <Show when={auth.state().pubkey} fallback={
                      <span class="map-login-hint">Login to add</span>
                    }>
                      <Show when={auth.hasRelay(relay.url)} fallback={
                        <button
                          class="btn btn-add btn-sm"
                          onClick={() => handleAddRelay(relay.url)}
                          disabled={addingRelay() === relay.url}
                        >
                          {addingRelay() === relay.url ? '...' : 'Add'}
                        </button>
                      }>
                        <span class="map-added">Added</span>
                      </Show>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div class="map-legend">
        <div class="map-legend-item">
          <span class="health-dot health-online" /> Online
        </div>
        <div class="map-legend-item">
          <span class="health-dot health-degraded" /> Degraded
        </div>
        <div class="map-legend-item">
          <span class="health-dot health-offline" /> Offline
        </div>
      </div>
    </div>
  );
}
