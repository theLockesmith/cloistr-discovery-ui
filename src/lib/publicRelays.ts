/**
 * Public (non-Cloistr) relays used alongside the Cloistr relay for fetching
 * and publishing the user's kind 10002 relay list.
 *
 * Read from the runtime config written by the container (`publicRelays`, a
 * comma-separated string from CLOISTR_PUBLIC_RELAYS). Staging sets it empty so
 * a test session never publishes a relay list to the real network, where it
 * would overwrite that key's real list. With no runtime config (dev server),
 * the production defaults apply.
 */
export const DEFAULT_PUBLIC_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

export function getPublicRelays(): string[] {
  const raw = (globalThis as { __CLOISTR_CONFIG__?: { publicRelays?: unknown } })
    .__CLOISTR_CONFIG__?.publicRelays;
  if (typeof raw !== 'string') {
    return DEFAULT_PUBLIC_RELAYS;
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
