import type { Event } from 'nostr-tools';

/**
 * How long one relay may take to answer a publish, NIP-42 AUTH round trip
 * included. Matches @cloistr/collab-common's PUBLISH_TIMEOUT_MS.
 */
export const PUBLISH_TIMEOUT_MS = 15_000;

/** How long to wait for relays to return the user's relay list. */
export const QUERY_MAX_WAIT_MS = 10_000;

export class PublishTimeoutError extends Error {
  readonly relay: string;

  constructor(relay: string, timeoutMs: number) {
    super(`${relay} did not answer within ${timeoutMs / 1000}s`);
    this.relay = relay;
    this.name = 'PublishTimeoutError';
  }
}

export interface PublishOutcome {
  accepted: string[];
  refused: { relay: string; reason: string }[];
}

interface PublishPool {
  publish(relays: string[], event: Event): Promise<string>[];
}

/**
 * Publish to each relay, bounding every one. nostr-tools' publish promise can
 * stay pending forever (a relay that never sends OK, or an AUTH the signer
 * never answers), which left the UI spinning; a relay that has not answered
 * within timeoutMs is reported as refused instead.
 */
export async function publishToRelays(
  pool: PublishPool,
  relays: string[],
  event: Event,
  timeoutMs = PUBLISH_TIMEOUT_MS,
): Promise<PublishOutcome> {
  const results = await Promise.allSettled(
    relays.map(relay => {
      let timer: ReturnType<typeof setTimeout>;
      return Promise.race([
        pool.publish([relay], event)[0],
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new PublishTimeoutError(relay, timeoutMs)), timeoutMs);
        }),
      ]).finally(() => clearTimeout(timer));
    }),
  );

  const outcome: PublishOutcome = { accepted: [], refused: [] };
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      outcome.accepted.push(relays[i]);
    } else {
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
      outcome.refused.push({ relay: relays[i], reason });
    }
  });
  return outcome;
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
