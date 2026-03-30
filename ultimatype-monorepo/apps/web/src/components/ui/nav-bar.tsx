import { Link } from 'react-router-dom';
import { ThemeToggle } from './theme-toggle';

export function NavBar() {
  return (
    <nav className="nav-bar-global fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-surface-sunken px-4 py-2 transition-opacity duration-500">
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
