import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '../../hooks/use-auth';
import { LoginModal } from './login-modal';
import { Logo } from './logo';

const NAV_TABS = [
  { label: 'Principal', to: '/' },
  { label: 'Leaderboard', to: '/leaderboard' },
] as const;

function isActive(pathname: string, to: string) {
  return pathname === to;
}

function tabClass(pathname: string, to: string) {
  return `text-sm font-sans transition-colors ${
    isActive(pathname, to)
      ? 'text-text-main font-semibold'
      : 'text-text-muted hover:text-text-main'
  }`;
}

function HamburgerIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function NavBar() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [imgError, setImgError] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Close hamburger menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Reset avatar error state when avatar URL changes
  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  // Close hamburger menu on Escape key or click outside
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const initials =
    user?.displayName
      ?.split(' ')
      .filter((w) => w.trim().length > 0)
      .map((w) => [...w][0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  return (
    <>
      <nav
        ref={menuRef}
        aria-label="Navegación principal"
        className="nav-bar-global fixed left-0 right-0 top-0 z-40 bg-surface-sunken transition-opacity duration-500"
      >
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Logo + tabs */}
          <div className="flex items-center gap-6">
            <Logo />
            <div className="hidden items-center gap-4 md:flex">
              {NAV_TABS.map((tab) => (
                <Link key={tab.to} to={tab.to} className={tabClass(location.pathname, tab.to)}>
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: hamburger (mobile), theme toggle, avatar/login */}
          <div className="flex items-center gap-3">
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="text-text-muted transition-colors hover:text-text-main md:hidden"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
            <ThemeToggle />
            {isAuthenticated && user ? (
              <Link
                to={`/u/${user.slug}`}
                className="no-underline"
              >
                {user.avatarUrl && !imgError ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-8 w-8 rounded-full object-cover transition-opacity hover:opacity-80"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface-base">
                    {initials}
                  </span>
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-sans font-semibold text-surface-base transition-opacity hover:opacity-90"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="flex flex-col gap-2 bg-surface-base px-4 pb-3 md:hidden">
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className={tabClass(location.pathname, tab.to)}
                onClick={() => setMenuOpen(false)}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
