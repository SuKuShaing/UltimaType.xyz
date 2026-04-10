interface WaitingForOthersOverlayProps {
  wpm: number;
  precision: number;
  score: number;
  onWatchLive?: () => void;
}

export function WaitingForOthersOverlay({
  wpm,
  precision,
  score,
  onWatchLive,
}: WaitingForOthersOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      role="status"
      aria-label="Esperando a los demás jugadores"
    >
      <div className="w-full max-w-sm rounded-card bg-surface-base/60 px-8 py-10 text-center backdrop-blur-glass">
        <p className="text-7xl font-bold text-primary">{wpm}</p>
        <p className="mt-1 text-lg text-text-muted">PPM</p>
        <p className="mt-4 text-3xl font-bold text-text-main">{score} pts</p>
        <p className="mt-1 text-lg text-text-muted">{precision}% precisión</p>
        <p className="mt-6 text-xs text-text-muted">
          Si esperas a los demás verás la pantalla de resultados
        </p>
        {onWatchLive && (
          <button
            type="button"
            onClick={onWatchLive}
            className="mt-4 rounded-full bg-surface-raised px-6 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Ver carrera en vivo
          </button>
        )}
        <p className="mt-4 text-sm text-text-muted">Esperando a los demás…</p>
      </div>
    </div>
  );
}
