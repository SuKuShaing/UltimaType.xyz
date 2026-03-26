import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const success = handleCallback(searchParams);
    if (success) {
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
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
