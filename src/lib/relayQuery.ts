import type { Event, Filter } from 'nostr-tools';
import { QUERY_MAX_WAIT_MS } from './relayPublish';

/**
 * Once one relay has answered, how much longer to wait for the rest. A relay
 * that never completes its connection otherwise holds the whole query to
 * maxWait (relay.nostr.band did: ~9s on every sign-in).
 */
export const QUERY_GRACE_MS = 1_500;

interface QueryPool {
  querySync(relays: string[], filter: Filter, params?: { maxWait?: number }): Promise<Event[]>;
}

/**
 * Query each relay on its own and return the newest matching event (for a
 * replaceable kind such as 10002), or null when no relay has one.
 */
export async function queryNewest(
  pool: QueryPool,
  relays: string[],
  filter: Filter,
  { graceMs = QUERY_GRACE_MS, maxWaitMs = QUERY_MAX_WAIT_MS } = {},
): Promise<Event | null> {
  const found: Event[] = [];

  await new Promise<void>(resolve => {
    let pending = relays.length;
    let grace: ReturnType<typeof setTimeout> | undefined;
    if (pending === 0) return resolve();

    const finish = () => {
      clearTimeout(grace);
      resolve();
    };

    for (const relay of relays) {
      pool
        .querySync([relay], filter, { maxWait: maxWaitMs })
        .then(events => { found.push(...events); }, () => {})
        .finally(() => {
          pending -= 1;
          if (pending === 0) finish();
          else if (!grace) grace = setTimeout(finish, graceMs);
        });
    }
  });

  return found.reduce<Event | null>((newest, e) => (!newest || e.created_at > newest.created_at ? e : newest), null);
}
