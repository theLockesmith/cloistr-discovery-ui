import { SignerRecovery } from '@cloistr/ui/components';
import type { SignerRecoveryProps } from '@cloistr/ui/components';
import { RelayListNotSavedError } from '../lib/relayPublish';

/**
 * Recovery panel for a failed add/remove. SignerRecovery only knows signer
 * errors, so a relay list that no relay accepted would be shown as "Signing
 * was declined". That case gets its own wording, in the same panel styling.
 */
export function RelayActionRecovery(props: SignerRecoveryProps) {
  const { error, onRetry, onGoBack, retrying = false } = props;
  if (!(error instanceof RelayListNotSavedError)) {
    return <SignerRecovery {...props} />;
  }

  return (
    <div className="cloistr-signer-recovery" role="alert" aria-live="polite">
      <div className="cloistr-signer-recovery-icon" aria-hidden="true">📡</div>
      <h2 className="cloistr-signer-recovery-title">Your relay list was not saved</h2>
      <p className="cloistr-signer-recovery-detail">{error.reasons}</p>
      <div className="cloistr-signer-recovery-actions">
        {onRetry && (
          <button
            type="button"
            className="cloistr-signer-recovery-btn cloistr-signer-recovery-btn--primary"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? 'Trying again…' : 'Try again'}
          </button>
        )}
        {onGoBack && (
          <button type="button" className="cloistr-signer-recovery-btn" onClick={onGoBack}>
            Go back
          </button>
        )}
      </div>
    </div>
  );
}
