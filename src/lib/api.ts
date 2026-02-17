import type { Relay, RelayFilters, RelayListResponse } from './types';

// Use relative path since UI and API are on the same domain via path-based routing
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class DiscoveryAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async getRelays(filters?: RelayFilters): Promise<RelayListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const url = `${this.baseUrl}/relays${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getRelay(url: string): Promise<Relay | null> {
    const encoded = encodeURIComponent(url);
    const response = await fetch(`${this.baseUrl}/relay/${encoded}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getHealth(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`);
    return response.json();
  }
}

// Default instance
export const api = new DiscoveryAPI();
