// Relay types matching the discovery API response

export interface Relay {
  url: string;
  name: string;
  description: string;
  pubkey: string;
  software: string;
  version: string;
  supported_nips: number[] | null;

  // Health & performance
  health: 'online' | 'degraded' | 'offline';
  latency_ms: number;
  last_checked: string;

  // Access (from API)
  payment_required: boolean;
  auth_required: boolean;

  // Optional fields (may be added to backend later)
  contact?: string;
  uptime_percent?: number;
  topics?: string[];
  atmosphere?: string;
  moderation?: 'unmoderated' | 'light' | 'active' | 'strict';
  content_policy?: 'anything' | 'sfw' | 'nsfw-allowed' | 'nsfw-only';
  languages?: string[];
  community?: string;
  payment?: 'free' | 'paid' | 'hybrid';
  admission?: 'open' | 'approval' | 'invite' | 'closed';
  location?: string;
  country_code?: string;  // ISO 2-letter code (e.g., "US", "DE")
  first_seen?: string;
  last_seen?: string;
}

export interface RelayFilters {
  health?: 'online' | 'degraded' | 'offline';
  nips?: string;  // comma-separated
  search?: string; // full-text search
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
