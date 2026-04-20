import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/nostr';
import type { Relay } from '../lib/types';

type UseCase = 'general' | 'developer' | 'creator';
type Performance = 'fastest' | 'balanced' | 'any';
type Payment = 'free' | 'any' | 'paid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RecommendationWizard({ isOpen, onClose }: Props) {
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [results, setResults] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRelay, setAddingRelay] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setUseCase(null);
    setPerformance(null);
    setPayment(null);
    setResults([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const canProceed = () => {
    if (step === 1) return useCase !== null;
    if (step === 2) return performance !== null;
    if (step === 3) return payment !== null;
    return false;
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: Record<string, string> = {
        health: 'online',
        limit: '50', // Fetch more to filter client-side
      };

      // Apply payment filter
      if (payment === 'free') {
        filters.payment = 'free';
      } else if (payment === 'paid') {
        filters.payment = 'paid';
      }
      // 'any' means no filter

      // Apply use case specific filters
      if (useCase === 'developer') {
        filters.nips = '50'; // Search support (NIP-50)
      }

      const response = await api.getRelays(filters);
      let filtered = response.relays || [];

      // Filter by performance preference (client-side)
      if (performance === 'fastest') {
        filtered = filtered.filter(r => r.latency_ms > 0 && r.latency_ms < 200);
      } else if (performance === 'balanced') {
        filtered = filtered.filter(r => r.latency_ms > 0 && r.latency_ms < 500);
      }

      // Sort by latency (fastest first)
      const sorted = filtered
        .filter(r => r.latency_ms > 0) // Only relays with known latency
        .sort((a, b) => a.latency_ms - b.latency_ms);

      setResults(sorted.slice(0, 5));
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else if (step === 3) {
      fetchRecommendations();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddRelay = async (url: string) => {
    if (!auth.state.pubkey) return;

    setAddingRelay(url);
    try {
      await auth.addRelay(url);
    } catch (err) {
      console.error('Failed to add relay:', err);
    } finally {
      setAddingRelay(null);
    }
  };

  const useCaseOptions = [
    { value: 'general' as UseCase, label: 'General Use', desc: 'Social, browsing, chatting' },
    { value: 'developer' as UseCase, label: 'Developer', desc: 'Need search support (NIP-50)' },
    { value: 'creator' as UseCase, label: 'Content Creator', desc: 'Posting content, need reliability' },
  ];

  const performanceOptions = [
    { value: 'fastest' as Performance, label: 'Fastest', desc: 'Under 200ms latency' },
    { value: 'balanced' as Performance, label: 'Balanced', desc: 'Under 500ms latency' },
    { value: 'any' as Performance, label: 'Any Speed', desc: 'No preference' },
  ];

  const paymentOptions = [
    { value: 'free' as Payment, label: 'Free Only', desc: 'No payment required' },
    { value: 'any' as Payment, label: 'Any', desc: 'Free or paid is fine' },
    { value: 'paid' as Payment, label: 'Prefer Paid', desc: 'Often higher quality' },
  ];

  if (!isOpen) return null;

  return (
    <div className="wizard-overlay" onClick={handleBackdropClick}>
      <div className="wizard-modal">
        <div className="wizard-header">
          <h2>Find Your Relays</h2>
          <button className="wizard-close" onClick={handleClose}>&times;</button>
        </div>

        {step < 4 && (
          <div className="wizard-progress">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`wizard-dot ${n === step ? 'active' : ''} ${n < step ? 'completed' : ''}`}
              />
            ))}
          </div>
        )}

        <div className="wizard-content">
          {step === 1 && (
            <>
              <p className="wizard-question">What will you primarily use Nostr for?</p>
              <div className="wizard-options">
                {useCaseOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`wizard-option ${useCase === option.value ? 'selected' : ''}`}
                    onClick={() => setUseCase(option.value)}
                  >
                    <span className="option-label">{option.label}</span>
                    <span className="option-desc">{option.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="wizard-question">What performance level do you need?</p>
              <div className="wizard-options">
                {performanceOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`wizard-option ${performance === option.value ? 'selected' : ''}`}
                    onClick={() => setPerformance(option.value)}
                  >
                    <span className="option-label">{option.label}</span>
                    <span className="option-desc">{option.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="wizard-question">Are you willing to pay for relay access?</p>
              <div className="wizard-options">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`wizard-option ${payment === option.value ? 'selected' : ''}`}
                    onClick={() => setPayment(option.value)}
                  >
                    <span className="option-label">{option.label}</span>
                    <span className="option-desc">{option.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            results.length > 0 ? (
              <>
                <p className="wizard-question">Recommended relays for you:</p>
                <div className="wizard-results">
                  {results.map((relay) => (
                    <div key={relay.url} className="wizard-relay">
                      <div className="wizard-relay-info">
                        <div className="wizard-relay-header">
                          <span className={`health-dot health-${relay.health}`} />
                          <strong>{relay.name || relay.url}</strong>
                        </div>
                        <span className="wizard-relay-url">{relay.url}</span>
                        {relay.description && (
                          <p className="wizard-relay-desc">{relay.description}</p>
                        )}
                        <div className="wizard-relay-meta">
                          <span>{relay.latency_ms}ms latency</span>
                          {relay.payment_required ? (
                            <span className="tag">Paid</span>
                          ) : (
                            <span className="tag">Free</span>
                          )}
                          {relay.supported_nips?.includes(50) && (
                            <span className="tag">Search</span>
                          )}
                        </div>
                      </div>
                      <div className="wizard-relay-action">
                        {auth.state.pubkey ? (
                          auth.hasRelay(relay.url) ? (
                            <span className="wizard-added">Added</span>
                          ) : (
                            <button
                              className="btn btn-add"
                              onClick={() => handleAddRelay(relay.url)}
                              disabled={addingRelay === relay.url}
                            >
                              {addingRelay === relay.url ? 'Adding...' : 'Add'}
                            </button>
                          )
                        ) : (
                          <span className="wizard-login-hint">Login to add</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="wizard-no-results">
                <p>No relays found matching your criteria.</p>
                <p>Try adjusting your preferences.</p>
              </div>
            )
          )}

          {error && (
            <div className="wizard-error">{error}</div>
          )}
        </div>

        <div className="wizard-nav">
          {step > 1 && step < 4 && (
            <button className="btn btn-back" onClick={handleBack}>
              Back
            </button>
          )}
          {step === 4 && (
            <button className="btn btn-back" onClick={reset}>
              Start Over
            </button>
          )}
          <div className="wizard-nav-spacer" />
          {step < 4 && (
            <button
              className="btn btn-next"
              onClick={handleNext}
              disabled={!canProceed() || loading}
            >
              {loading ? 'Loading...' : step === 3 ? 'Get Recommendations' : 'Next'}
            </button>
          )}
          {step === 4 && (
            <button className="btn btn-done" onClick={handleClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
