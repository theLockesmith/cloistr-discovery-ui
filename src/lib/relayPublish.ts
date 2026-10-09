import type { Event, EventTemplate, VerifiedEvent } from 'nostr-tools';
import {
  boundedPoolPublish,
  settlePoolPublish,
  PUBLISH_TIMEOUT_MS,
  type PublishablePool,
} from '@cloistr/collab-common/relay';

/** How long to wait for relays to return the user's relay list. */
export const QUERY_MAX_WAIT_MS = 10_000;

/**
 * No relay accepted the relay list. Distinct from a signer error so the UI
 * says the list was not saved instead of "Signing was declined".
 */
export class RelayListNotSavedError extends Error {
  /** Why each relay refused, for showing under the panel title. */
  readonly reasons: string;

  constructor(reasons: string) {
    super(`Your relay list was not saved: ${reasons}`);
    this.reasons = reasons;
    this.name = 'RelayListNotSavedError';
  }
}

export interface PublishOutcome {
  accepted: string[];
  refused: { relay: string; reason: string }[];
}

/**
 * Publish to each relay through collab-common's bounded pool publish, so a
 * relay that never sends OK (or an AUTH the signer never answers) is reported
 * as refused instead of leaving the UI spinning.
 */
export async function publishToRelays(
  pool: PublishablePool,
  relays: string[],
  event: Event,
  timeoutMs = PUBLISH_TIMEOUT_MS,
  onauth?: (evt: EventTemplate) => Promise<VerifiedEvent>,
): Promise<PublishOutcome> {
  // onauth answers NIP-42 challenges: relay.cloistr.xyz refuses writes from
  // an unauthenticated connection.
  const result = await settlePoolPublish(relays, boundedPoolPublish(pool, relays, event, { timeoutMs, onauth }));

  // The shared timeout error does not name the relay, so build the
  // user-facing reason here.
  const timedOut = new Set(result.timedOut);
  const refused = relays
    .filter(relay => !result.accepted.includes(relay))
    .map(relay =>
      timedOut.has(relay)
        ? { relay, reason: `${relay} did not answer within ${timeoutMs / 1000}s` }
        : rejectionFor(relay, result.rejected),
    );
  return { accepted: result.accepted, refused };
}

function rejectionFor(relay: string, rejected: { relay: string; reason: string }[]) {
  const r = rejected.find(x => x.relay === relay);
  if (!r) return { relay, reason: 'unknown error' };
  // nostr-tools gives up on an unanswered publish itself (after ~4.4s) with
  // a bare "publish timed out" that does not say which relay.
  if (/timed out/i.test(r.reason)) return { relay, reason: `${relay} did not answer in time` };
  return r;
}

/**
 * Throws when no relay accepted the event, so the caller shows an error
 * rather than treating an unsaved relay list as saved.
 */
export function assertPublished(outcome: PublishOutcome): void {
  if (outcome.accepted.length === 0) {
    const reasons = outcome.refused.map(r => r.reason).join('; ') || 'no relays configured';
    throw new RelayListNotSavedError(reasons);
  }
}
