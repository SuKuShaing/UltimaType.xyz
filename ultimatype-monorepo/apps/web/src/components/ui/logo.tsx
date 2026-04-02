import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      title="Competencias de mecanografía en tiempo real"
      className={`font-bold no-underline ${className || 'text-lg'}`}
    >
      <span className="text-text-main">Ultima</span>
      <span className="text-primary">Type</span>
    </Link>
  );
}
