import { useTheme } from '../../hooks/use-theme';

function MonitorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const LABELS: Record<string, string> = {
  light: 'Tema claro',
  dark: 'Tema oscuro',
  system: 'Tema del sistema',
};

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  const icon =
    theme === 'light' ? '\u2600' : theme === 'dark' ? '\u263E' : <MonitorIcon />;

  return (
    <button
      onClick={cycleTheme}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-sm text-text-muted transition-colors hover:text-text-main"
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
    >
      {icon}
    </button>
  );
}
