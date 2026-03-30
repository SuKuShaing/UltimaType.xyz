import { Link } from 'react-router-dom';
import { ThemeToggle } from './theme-toggle';

interface NavBarProps {
  opacity?: number;
}

export function NavBar({ opacity = 1 }: NavBarProps) {
  return (
    <nav
      className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-surface-sunken px-4 py-2"
      style={{
        opacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: opacity < 0.5 ? 'none' : 'auto',
      }}
    >
      <Link to="/" className="text-lg font-bold text-primary no-underline">
        UltimaType
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          to="/profile"
          className="text-sm text-text-muted no-underline transition-colors hover:text-text-main"
        >
          Perfil
        </Link>
      </div>
    </nav>
  );
}
