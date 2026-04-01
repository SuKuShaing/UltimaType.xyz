import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      title="Competencias de mecanografía en tiempo real"
      className={`text-lg font-bold no-underline ${className}`}
    >
      <span className="text-text-main">Ultima</span>
      <span className="text-primary">Type</span>
    </Link>
  );
}
