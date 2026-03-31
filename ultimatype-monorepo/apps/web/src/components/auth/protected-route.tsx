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
      // Read the path BEFORE calling navigate, which synchronously changes
      // window.location via pushState. In StrictMode the effect runs twice:
      // the second run would read '/' instead of the original path.
      // Guard: only write when the current path is an actual protected route,
      // not '/' (which means navigate already fired in a prior mount cycle).
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/') {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
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
