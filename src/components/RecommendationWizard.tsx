import { createSignal, Show, For } from 'solid-js';
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

export function RecommendationWizard(props: Props) {
  const auth = useAuth();
  const [step, setStep] = createSignal(1);
  const [useCase, setUseCase] = createSignal<UseCase | null>(null);
  const [performance, setPerformance] = createSignal<Performance | null>(null);
  const [payment, setPayment] = createSignal<Payment | null>(null);
  const [results, setResults] = createSignal<Relay[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [addingRelay, setAddingRelay] = createSignal<string | null>(null);

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
    props.onClose();
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const canProceed = () => {
    if (step() === 1) return useCase() !== null;
    if (step() === 2) return performance() !== null;
    if (step() === 3) return payment() !== null;
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
      if (payment() === 'free') {
        filters.payment = 'free';
      } else if (payment() === 'paid') {
        filters.payment = 'paid';
      }
      // 'any' means no filter

      // Apply use case specific filters
      if (useCase() === 'developer') {
        filters.nips = '50'; // Search support (NIP-50)
      }

      const response = await api.getRelays(filters);
      let filtered = response.relays || [];

      // Filter by performance preference (client-side)
      if (performance() === 'fastest') {
        filtered = filtered.filter(r => r.latency_ms > 0 && r.latency_ms < 200);
      } else if (performance() === 'balanced') {
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
    if (step() < 3) {
      setStep(step() + 1);
    } else if (step() === 3) {
      fetchRecommendations();
    }
  };

  const handleBack = () => {
    if (step() > 1) {
      setStep(step() - 1);
    }
  };

  const handleAddRelay = async (url: string) => {
    if (!auth.state().pubkey) return;

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

  return (
    <Show when={props.isOpen}>
      <div class="wizard-overlay" onClick={handleBackdropClick}>
        <div class="wizard-modal">
          <div class="wizard-header">
            <h2>Find Your Relays</h2>
            <button class="wizard-close" onClick={handleClose}>&times;</button>
          </div>

          <Show when={step() < 4}>
            <div class="wizard-progress">
              <For each={[1, 2, 3]}>
                {(n) => (
                  <div
                    class={`wizard-dot ${n === step() ? 'active' : ''} ${n < step() ? 'completed' : ''}`}
                  />
                )}
              </For>
            </div>
          </Show>

          <div class="wizard-content">
            <Show when={step() === 1}>
              <p class="wizard-question">What will you primarily use Nostr for?</p>
              <div class="wizard-options">
                <For each={useCaseOptions}>
                  {(option) => (
                    <button
                      class={`wizard-option ${useCase() === option.value ? 'selected' : ''}`}
                      onClick={() => setUseCase(option.value)}
                    >
                      <span class="option-label">{option.label}</span>
                      <span class="option-desc">{option.desc}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={step() === 2}>
              <p class="wizard-question">What performance level do you need?</p>
              <div class="wizard-options">
                <For each={performanceOptions}>
                  {(option) => (
                    <button
                      class={`wizard-option ${performance() === option.value ? 'selected' : ''}`}
                      onClick={() => setPerformance(option.value)}
                    >
                      <span class="option-label">{option.label}</span>
                      <span class="option-desc">{option.desc}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={step() === 3}>
              <p class="wizard-question">Are you willing to pay for relay access?</p>
              <div class="wizard-options">
                <For each={paymentOptions}>
                  {(option) => (
                    <button
                      class={`wizard-option ${payment() === option.value ? 'selected' : ''}`}
                      onClick={() => setPayment(option.value)}
                    >
                      <span class="option-label">{option.label}</span>
                      <span class="option-desc">{option.desc}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={step() === 4}>
              <Show when={results().length > 0} fallback={
                <div class="wizard-no-results">
                  <p>No relays found matching your criteria.</p>
                  <p>Try adjusting your preferences.</p>
                </div>
              }>
                <p class="wizard-question">Recommended relays for you:</p>
                <div class="wizard-results">
                  <For each={results()}>
                    {(relay) => (
                      <div class="wizard-relay">
                        <div class="wizard-relay-info">
                          <div class="wizard-relay-header">
                            <span class={`health-dot health-${relay.health}`} />
                            <strong>{relay.name || relay.url}</strong>
                          </div>
                          <span class="wizard-relay-url">{relay.url}</span>
                          <Show when={relay.description}>
                            <p class="wizard-relay-desc">{relay.description}</p>
                          </Show>
                          <div class="wizard-relay-meta">
                            <span>{relay.latency_ms}ms latency</span>
                            <Show when={relay.payment_required}>
                              <span class="tag">Paid</span>
                            </Show>
                            <Show when={!relay.payment_required}>
                              <span class="tag">Free</span>
                            </Show>
                            <Show when={relay.supported_nips?.includes(50)}>
                              <span class="tag">Search</span>
                            </Show>
                          </div>
                        </div>
                        <div class="wizard-relay-action">
                          <Show when={auth.state().pubkey} fallback={
                            <span class="wizard-login-hint">Login to add</span>
                          }>
                            <Show when={auth.hasRelay(relay.url)} fallback={
                              <button
                                class="btn btn-add"
                                onClick={() => handleAddRelay(relay.url)}
                                disabled={addingRelay() === relay.url}
                              >
                                {addingRelay() === relay.url ? 'Adding...' : 'Add'}
                              </button>
                            }>
                              <span class="wizard-added">Added</span>
                            </Show>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>

            <Show when={error()}>
              <div class="wizard-error">{error()}</div>
            </Show>
          </div>

          <div class="wizard-nav">
            <Show when={step() > 1 && step() < 4}>
              <button class="btn btn-back" onClick={handleBack}>
                Back
              </button>
            </Show>
            <Show when={step() === 4}>
              <button class="btn btn-back" onClick={reset}>
                Start Over
              </button>
            </Show>
            <div class="wizard-nav-spacer" />
            <Show when={step() < 4}>
              <button
                class="btn btn-next"
                onClick={handleNext}
                disabled={!canProceed() || loading()}
              >
                {loading() ? 'Loading...' : step() === 3 ? 'Get Recommendations' : 'Next'}
              </button>
            </Show>
            <Show when={step() === 4}>
              <button class="btn btn-done" onClick={handleClose}>
                Done
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
