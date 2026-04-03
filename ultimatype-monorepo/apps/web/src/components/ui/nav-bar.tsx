import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '../../hooks/use-auth';
import { LoginModal } from './login-modal';
import { Logo } from './logo';

export function NavBar() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [imgError, setImgError] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const isLeaderboard = location.pathname === '/leaderboard';

  const initials = user?.displayName
    ?.split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <>
      <nav className="nav-bar-global fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-surface-sunken px-4 py-2 transition-opacity duration-500">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            to="/leaderboard"
            className={`text-sm transition-colors font-sans ${
              isLeaderboard ? 'text-text-main font-semibold' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Ranking
          </Link>
          <ThemeToggle />
          {isAuthenticated && user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 no-underline transition-colors hover:bg-surface-raised/80"
            >
              {user.avatarUrl && !imgError ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-6 w-6 rounded-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-surface-base">
                  {initials}
                </span>
              )}
              <span className="text-sm text-text-muted transition-colors hover:text-text-main">
                Perfil
              </span>
            </Link>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-surface-base transition-opacity hover:opacity-90"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
