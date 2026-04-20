import { useState, useEffect, useRef, useMemo } from 'react';
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

export function RelayMap({ filters }: Props) {
  const auth = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryGroup | null>(null);
  const [addingRelay, setAddingRelay] = useState<string | null>(null);

  // Group relays by country (skip relays without country_code)
  const countryGroups = useMemo((): CountryGroup[] => {
    const groups: Record<string, CountryGroup> = {};

    for (const relay of relays) {
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
  }, [relays]);

  // Check if any relays have geo data
  const hasGeoData = countryGroups.length > 0;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
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

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fetch relays when filters change
  useEffect(() => {
    let cancelled = false;

    async function fetchRelays() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.getRelays({ ...filters, limit: 200 });
        if (!cancelled) {
          setRelays(response.relays || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load relays');
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

  // Update markers when relays change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    for (const group of countryGroups) {
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

      markersLayerRef.current!.addLayer(marker);
    }
  }, [countryGroups]);

  const handleAddRelay = async (url: string) => {
    if (!auth.state.pubkey) return;

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
    <div className="relay-map-container">
      {loading && (
        <div className="map-loading">
          <div className="spinner" />
          <span>Loading relays...</span>
        </div>
      )}

      {error && (
        <div className="map-error">{error}</div>
      )}

      {!loading && !error && relays.length > 0 && !hasGeoData && (
        <div className="map-no-geo">
          <strong>Geographic data not available</strong>
          <br />
          <span className="map-no-geo-hint">
            Relay location data is being collected and will be available soon.
          </span>
        </div>
      )}

      {!loading && !error && relays.length === 0 && (
        <div className="map-no-geo">
          <strong>No relays found</strong>
          <br />
          <span className="map-no-geo-hint">
            Try adjusting your filters to see relays on the map.
          </span>
        </div>
      )}

      <div ref={mapContainerRef} className="relay-map" />

      {selectedCountry && (
        <div className="map-panel">
          <div className="map-panel-header">
            <h3>{selectedCountry.name}</h3>
            <span className="map-panel-count">
              {selectedCountry.relays.length} relay{selectedCountry.relays.length !== 1 ? 's' : ''}
            </span>
            <button className="map-panel-close" onClick={closePanel}>&times;</button>
          </div>
          <div className="map-panel-content">
            {selectedCountry.relays.map((relay) => (
              <div key={relay.url} className="map-relay">
                <div className="map-relay-header">
                  <span className={`health-dot health-${relay.health}`} />
                  <strong>{relay.name || relay.url}</strong>
                </div>
                <span className="map-relay-url">{relay.url}</span>
                <div className="map-relay-meta">
                  <span>{relay.latency_ms || '?'}ms</span>
                  <span>{relay.uptime_percent?.toFixed(0) || '?'}% up</span>
                </div>
                <div className="map-relay-action">
                  {auth.state.pubkey ? (
                    auth.hasRelay(relay.url) ? (
                      <span className="map-added">Added</span>
                    ) : (
                      <button
                        className="btn btn-add btn-sm"
                        onClick={() => handleAddRelay(relay.url)}
                        disabled={addingRelay === relay.url}
                      >
                        {addingRelay === relay.url ? '...' : 'Add'}
                      </button>
                    )
                  ) : (
                    <span className="map-login-hint">Login to add</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="map-legend">
        <div className="map-legend-item">
          <span className="health-dot health-online" /> Online
        </div>
        <div className="map-legend-item">
          <span className="health-dot health-degraded" /> Degraded
        </div>
        <div className="map-legend-item">
          <span className="health-dot health-offline" /> Offline
        </div>
      </div>
    </div>
  );
}
