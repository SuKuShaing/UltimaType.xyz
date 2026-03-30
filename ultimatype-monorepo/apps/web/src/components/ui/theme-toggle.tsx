import { useTheme } from '../../hooks/use-theme';

const ICONS: Record<string, string> = {
  light: '\u2600',   // sun
  dark: '\u263E',     // moon
  system: '\u2699',   // gear
};

const LABELS: Record<string, string> = {
  light: 'Tema claro',
  dark: 'Tema oscuro',
  system: 'Tema del sistema',
};

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  return (
    <button
      onClick={cycleTheme}
      className="rounded-lg bg-surface-raised px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:text-text-main"
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
    >
      {ICONS[theme]}
    </button>
  );
}
