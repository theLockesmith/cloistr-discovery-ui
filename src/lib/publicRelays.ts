import { getServiceConfig } from '@cloistr/collab-common/config';

/**
 * Public (non-Cloistr) relays used alongside the Cloistr relay for fetching
 * and publishing the user's kind 10002 relay list.
 *
 * Read from the runtime config written by the container (`publicRelays`, a
 * comma-separated string from CLOISTR_PUBLIC_RELAYS). An explicit value,
 * including an empty one, is used as given. Otherwise ("auto", the image
 * default, or no value at all) production gets DEFAULT_PUBLIC_RELAYS and every
 * other environment gets none. A non-production deployment that forgets the
 * variable must not publish test relay lists to the real network, where they
 * would overwrite that key's real list.
 */
export const DEFAULT_PUBLIC_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

export function getPublicRelays(): string[] {
  const raw = (globalThis as { __CLOISTR_CONFIG__?: { publicRelays?: unknown } })
    .__CLOISTR_CONFIG__?.publicRelays;
  // "${...}" means nginx left the variable unsubstituted (it was never defined).
  if (typeof raw === 'string' && raw !== 'auto' && !raw.includes('${')) {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return getServiceConfig().environment === 'production' ? DEFAULT_PUBLIC_RELAYS : [];
}
