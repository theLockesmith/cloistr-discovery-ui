import { Show, createSignal } from 'solid-js';
import { useAuth } from '../lib/nostr';

export function LoginButton() {
  const auth = useAuth();
  const [showOptions, setShowOptions] = createSignal(false);
  const [showBunkerInput, setShowBunkerInput] = createSignal(false);
  const [bunkerUrl, setBunkerUrl] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);

  const truncatePubkey = (pubkey: string) => {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
  };

  const handleNip07Login = async () => {
    setError(null);
    setShowOptions(false);
    try {
      await auth.login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleNip46Login = async () => {
    setError(null);
    const input = bunkerUrl().trim();
    if (!input) {
      setError('Please enter a bunker URL or NIP-05 identifier');
      return;
    }

    try {
      await auth.loginNip46(input);
      setShowBunkerInput(false);
      setBunkerUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNip46Login();
    }
  };

  return (
    <div class="login-section">
      <Show
        when={auth.state().pubkey}
        fallback={
          <div class="login-options">
            <Show when={!showBunkerInput()}>
              <Show
                when={showOptions()}
                fallback={
                  <button
                    class="btn btn-login"
                    onClick={() => setShowOptions(true)}
                    disabled={auth.isLoading()}
                  >
                    <Show when={auth.isLoading()} fallback="Login with Nostr">
                      Connecting...
                    </Show>
                  </button>
                }
              >
                <div class="login-dropdown">
                  <button
                    class="btn btn-login-option"
                    onClick={handleNip07Login}
                    disabled={auth.isLoading() || !auth.hasNip07()}
                    title={auth.hasNip07() ? 'Login with browser extension' : 'No extension detected'}
                  >
                    Extension (NIP-07)
                  </button>
                  <button
                    class="btn btn-login-option"
                    onClick={() => {
                      setShowOptions(false);
                      setShowBunkerInput(true);
                    }}
                    disabled={auth.isLoading()}
                  >
                    Remote Signer (NIP-46)
                  </button>
                  <button
                    class="btn btn-cancel"
                    onClick={() => setShowOptions(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Show>
            </Show>

            <Show when={showBunkerInput()}>
              <div class="bunker-input-container">
                <input
                  type="text"
                  class="bunker-input"
                  placeholder="bunker://... or user@nsec.app"
                  value={bunkerUrl()}
                  onInput={(e) => setBunkerUrl(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  disabled={auth.isLoading()}
                />
                <button
                  class="btn btn-connect"
                  onClick={handleNip46Login}
                  disabled={auth.isLoading() || !bunkerUrl().trim()}
                >
                  <Show when={auth.isLoading()} fallback="Connect">
                    Connecting...
                  </Show>
                </button>
                <button
                  class="btn btn-cancel"
                  onClick={() => {
                    setShowBunkerInput(false);
                    setBunkerUrl('');
                    setError(null);
                  }}
                  disabled={auth.isLoading()}
                >
                  Cancel
                </button>
              </div>
            </Show>

            <Show when={error()}>
              <div class="login-error">{error()}</div>
            </Show>
          </div>
        }
      >
        <div class="user-info">
          <span class="user-pubkey">{truncatePubkey(auth.state().pubkey!)}</span>
          <span class="auth-method">
            {auth.state().method === 'nip07' ? 'Extension' : 'Remote'}
          </span>
          <span class="relay-count">
            {auth.state().relayList.length} relays
          </span>
          <button class="btn btn-logout" onClick={auth.logout}>
            Logout
          </button>
        </div>
      </Show>
    </div>
  );
}
