import type { Event, Filter } from 'nostr-tools';
import type { SubscribeManyParams } from 'nostr-tools/abstract-pool';
import { QUERY_MAX_WAIT_MS } from './relayPublish';

/**
 * Once one relay has answered, how much longer to wait for the rest. A relay
 * that never completes its connection otherwise holds the whole query to
 * maxWait (relay.nostr.band did: ~9s on every sign-in).
 */
export const QUERY_GRACE_MS = 1_500;

/** The reason nostr-tools closes a subscribeEose with once the relay sent EOSE. */
const EOSE_REASON = 'closed automatically on eose';

interface QueryPool {
  subscribeEose(
    relays: string[],
    filter: Filter,
    params: Pick<SubscribeManyParams, 'onevent' | 'onclose' | 'maxWait'>,
  ): { close(reason?: string): void };
}

/**
 * Query each relay on its own and return the newest matching event (for a
 * replaceable kind such as 10002), or null when a relay answered and none had
 * one. Throws when no relay answered at all: the caller must not treat
 * "unreachable" as "no list", or it would publish over a list it never saw.
 */
export async function queryNewest(
  pool: QueryPool,
  relays: string[],
  filter: Filter,
  { graceMs = QUERY_GRACE_MS, maxWaitMs = QUERY_MAX_WAIT_MS } = {},
): Promise<Event | null> {
  const found: Event[] = [];
  let answered = 0;

  await new Promise<void>(resolve => {
    let pending = relays.length;
    let grace: ReturnType<typeof setTimeout> | undefined;
    if (pending === 0) return resolve();

    const finish = () => {
      clearTimeout(grace);
      resolve();
    };

    for (const relay of relays) {
      let settled = false;
      pool.subscribeEose([relay], filter, {
        maxWait: maxWaitMs,
        onevent: e => { found.push(e); },
        onclose: reasons => {
          if (settled) return;
          settled = true;
          if (reasons.some(r => r.reason === EOSE_REASON)) answered += 1;
          pending -= 1;
          if (pending === 0) finish();
          else if (answered > 0 && !grace) grace = setTimeout(finish, graceMs);
        },
      });
    }
  });

  if (relays.length > 0 && answered === 0) {
    throw new Error('no relay answered');
  }
  return found.reduce<Event | null>((newest, e) => (!newest || e.created_at > newest.created_at ? e : newest), null);
}
