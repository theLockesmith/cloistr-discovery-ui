// Relay types matching the discovery API response

export interface Relay {
  url: string;
  name: string;
  description: string;
  pubkey: string;
  contact: string;
  software: string;
  version: string;
  nips: number[];

  // Health & performance
  health: 'online' | 'degraded' | 'offline';
  latency_ms: number;
  uptime_percent: number;

  // Social/community metadata
  topics: string[];
  atmosphere: string;
  moderation: 'unmoderated' | 'light' | 'active' | 'strict';
  content_policy: 'anything' | 'sfw' | 'nsfw-allowed' | 'nsfw-only';
  languages: string[];
  community: string;

  // Access
  payment: 'free' | 'paid' | 'hybrid';
  admission: 'open' | 'approval' | 'invite' | 'closed';

  // Location
  location: string;
  country_code?: string;  // ISO 2-letter code (e.g., "US", "DE")

  // Timestamps
  first_seen: string;
  last_seen: string;
  last_checked: string;
}

export interface RelayFilters {
  health?: 'online' | 'degraded' | 'offline';
  nips?: string;  // comma-separated
  topic?: string; // comma-separated, OR logic
  atmosphere?: string;
  moderation?: string;
  content_policy?: string;
  language?: string;
  community?: string;
  payment?: string;
  admission?: string;
  location?: string;
  limit?: number;
}

export interface RelayListResponse {
  relays: Relay[];
  total: number;
}

// User's relay list (NIP-65)
export interface UserRelayList {
  pubkey: string;
  relays: UserRelay[];
}

export interface UserRelay {
  url: string;
  read: boolean;
  write: boolean;
}

// Auth state
export interface AuthState {
  pubkey: string | null;
  method: 'nip07' | 'nip46' | null;
  relayList: UserRelay[];
}
