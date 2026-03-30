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
      sessionStorage.setItem(
        'redirectAfterLogin',
        window.location.pathname + window.location.search,
      );
      navigate('/');
    }
  }, [isFetchingProfile, isAuthenticated, navigate]);

  if (isFetchingProfile || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base font-sans text-text-main">
        <span className="text-2xl opacity-50">_</span>
      </div>
    );
  }

  return <>{children}</>;
}
