import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { getAccessToken } from '../../lib/api-client';

// Module-level guard: prevents StrictMode double-mount from calling
// handleCallback twice with the same single-use auth code.
let callbackInFlight = false;

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();

  useEffect(() => {
    if (callbackInFlight) return;
    callbackInFlight = true;

    handleCallback(searchParams).then((success) => {
      // If the code exchange failed but tokens were already set
      // (e.g. by a prior StrictMode mount cycle), treat as success.
      const effectiveSuccess = success || !!getAccessToken();

      if (effectiveSuccess) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/';
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirect, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }).finally(() => {
      callbackInFlight = false;
    });
  }, [searchParams, handleCallback, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: "'Space Grotesk', sans-serif",
        color: '#999',
      }}
    >
      <span style={{ opacity: 0.6, animation: 'blink 1s infinite' }}>
        _
      </span>
    </div>
  );
}
