import type { Event } from 'nostr-tools';
import {
  boundedPoolPublish,
  settlePoolPublish,
  PUBLISH_TIMEOUT_MS,
  type PublishablePool,
} from '@cloistr/collab-common/relay';

/** How long to wait for relays to return the user's relay list. */
export const QUERY_MAX_WAIT_MS = 10_000;

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
): Promise<PublishOutcome> {
  const result = await settlePoolPublish(relays, boundedPoolPublish(pool, relays, event, { timeoutMs }));

  // The shared timeout error does not name the relay, so build the
  // user-facing reason here.
  const timedOut = new Set(result.timedOut);
  const refused = relays
    .filter(relay => !result.accepted.includes(relay))
    .map(relay =>
      timedOut.has(relay)
        ? { relay, reason: `${relay} did not answer within ${timeoutMs / 1000}s` }
        : result.rejected.find(r => r.relay === relay) ?? { relay, reason: 'unknown error' },
    );
  return { accepted: result.accepted, refused };
}

/**
 * Throws when no relay accepted the event, so the caller shows an error
 * rather than treating an unsaved relay list as saved.
 */
export function assertPublished(outcome: PublishOutcome): void {
  if (outcome.accepted.length === 0) {
    const reasons = outcome.refused.map(r => r.reason).join('; ') || 'no relays configured';
    throw new Error(`Your relay list was not saved: ${reasons}`);
  }
}
