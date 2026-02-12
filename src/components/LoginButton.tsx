import { Show } from 'solid-js';
import { useAuth } from '../lib/nostr';

export function LoginButton() {
  const auth = useAuth();

  const truncatePubkey = (pubkey: string) => {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
  };

  const handleLogin = async () => {
    try {
      await auth.login();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div class="login-section">
      <Show
        when={auth.state().pubkey}
        fallback={
          <button
            class="btn btn-login"
            onClick={handleLogin}
            disabled={auth.isLoading()}
          >
            <Show when={auth.isLoading()} fallback="Login with Nostr">
              Connecting...
            </Show>
          </button>
        }
      >
        <div class="user-info">
          <span class="user-pubkey">{truncatePubkey(auth.state().pubkey!)}</span>
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
