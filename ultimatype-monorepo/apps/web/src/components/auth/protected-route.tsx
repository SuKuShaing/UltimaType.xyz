import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isFetchingProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isFetchingProfile && !isAuthenticated) {
      navigate('/');
    }
  }, [isFetchingProfile, isAuthenticated, navigate]);

  if (isFetchingProfile || !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
          backgroundColor: '#0F1F29',
          color: '#F8F9FA',
        }}
      >
        <span style={{ opacity: 0.5, fontSize: '2rem' }}>_</span>
      </div>
    );
  }

  return <>{children}</>;
}
