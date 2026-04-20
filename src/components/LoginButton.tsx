import { useState } from 'react';
import { useAuth } from '../lib/nostr';

export function LoginButton() {
  const auth = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'select' | 'nip46' | null>('select');
  const [bunkerUrl, setBunkerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const truncatePubkey = (pubkey: string) => {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setLoginMethod('select');
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setLoginMethod('select');
    setBunkerUrl('');
    setError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleNip07Login = async () => {
    setError(null);
    try {
      await auth.login();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleNip46Login = async () => {
    setError(null);
    const input = bunkerUrl.trim();
    if (!input) {
      setError('Please enter a bunker URL or NIP-05 identifier');
      return;
    }

    try {
      await auth.loginNip46(input);
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNip46Login();
    }
  };

  return (
    <>
      {auth.state.pubkey ? (
        <div className="user-info">
          <span className="user-pubkey">{truncatePubkey(auth.state.pubkey)}</span>
          <span className="auth-method">
            {auth.state.method === 'nip07' ? 'Extension' : 'Remote'}
          </span>
          <span className="relay-count">
            {auth.state.relayList.length} relays
          </span>
          <button className="btn btn-logout" onClick={auth.logout}>
            Logout
          </button>
        </div>
      ) : (
        <button
          className="btn btn-login"
          onClick={handleOpenModal}
          disabled={auth.isLoading}
        >
          {auth.isLoading ? 'Connecting...' : 'Login with Nostr'}
        </button>
      )}

      {showModal && (
        <div className="wizard-overlay" onClick={handleBackdropClick}>
          <div className="wizard-modal login-modal">
            <div className="wizard-header">
              <h2>Login with Nostr</h2>
              <button className="wizard-close" onClick={handleCloseModal}>&times;</button>
            </div>

            <div className="wizard-content">
              {loginMethod === 'select' && (
                <>
                  <p className="wizard-question">Choose your login method:</p>
                  <div className="wizard-options">
                    <button
                      className="wizard-option"
                      onClick={handleNip07Login}
                      disabled={auth.isLoading || !auth.hasNip07()}
                      title={auth.hasNip07() ? 'Login with browser extension' : 'No extension detected'}
                    >
                      <span className="option-label">Browser Extension</span>
                      <span className="option-desc">
                        {auth.hasNip07() ? 'Use Alby, nos2x, or similar' : 'No extension detected'}
                      </span>
                    </button>
                    <button
                      className="wizard-option"
                      onClick={() => setLoginMethod('nip46')}
                      disabled={auth.isLoading}
                    >
                      <span className="option-label">Remote Signer</span>
                      <span className="option-desc">Use nsec.app, Amber, or bunker URL</span>
                    </button>
                  </div>
                </>
              )}

              {loginMethod === 'nip46' && (
                <>
                  <p className="wizard-question">Enter your remote signer:</p>
                  <div className="login-input-group">
                    <input
                      type="text"
                      className="login-input"
                      placeholder="bunker://... or user@nsec.app"
                      value={bunkerUrl}
                      onChange={(e) => setBunkerUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={auth.isLoading}
                      autoFocus
                    />
                    <div className="login-actions">
                      <button
                        className="btn btn-back"
                        onClick={() => {
                          setLoginMethod('select');
                          setBunkerUrl('');
                          setError(null);
                        }}
                        disabled={auth.isLoading}
                      >
                        Back
                      </button>
                      <button
                        className="btn btn-next"
                        onClick={handleNip46Login}
                        disabled={auth.isLoading || !bunkerUrl.trim()}
                      >
                        {auth.isLoading ? 'Connecting...' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="wizard-error">{error}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
