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

/** How far past our own timeout nostr-tools' maxWait is pushed. */
const SILENCE_MARGIN_MS = 60_000;

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

    const closers: { close(reason?: string): void }[] = [];
    let done = false;
    const finishAll = () => {
      if (done) return;
      done = true;
      finish();
      closers.forEach(c => c.close('query finished'));
    };

    for (const relay of relays) {
      let settled = false;
      const settle = (gotEose: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (gotEose) answered += 1;
        pending -= 1;
        if (pending === 0) finishAll();
        else if (answered > 0 && !grace) grace = setTimeout(finishAll, graceMs);
      };
      // Our own bound. nostr-tools turns a silent relay into a fake EOSE at
      // its maxWait, which would read as "no list", so its maxWait is set
      // past ours and a relay that has not sent EOSE by now is no answer.
      const timer = setTimeout(() => {
        settle(false);
        closer.close('no answer in time');
      }, maxWaitMs);
      const closer = pool.subscribeEose([relay], filter, {
        maxWait: maxWaitMs + SILENCE_MARGIN_MS,
        onevent: e => { found.push(e); },
        onclose: reasons => settle(reasons.some(r => r.reason === EOSE_REASON)),
      });
      closers.push(closer);
    }
  });

  if (relays.length > 0 && answered === 0) {
    throw new Error('no relay answered');
  }
  return found.reduce<Event | null>((newest, e) => (!newest || e.created_at > newest.created_at ? e : newest), null);
}
