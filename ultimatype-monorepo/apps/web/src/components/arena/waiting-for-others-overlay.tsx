interface WaitingForOthersOverlayProps {
  wpm: number;
  precision: number;
  score: number;
}

export function WaitingForOthersOverlay({
  wpm,
  precision,
  score,
}: WaitingForOthersOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      role="status"
      aria-label="Esperando a los demás jugadores"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface-base/95 px-8 py-10 text-center backdrop-blur-md">
        <p className="text-7xl font-bold text-primary">{wpm}</p>
        <p className="mt-1 text-lg text-text-muted">WPM</p>
        <p className="mt-4 text-3xl font-bold text-text-main">{score} pts</p>
        <p className="mt-1 text-lg text-text-muted">{precision}% precisión</p>
        <p className="mt-8 text-sm text-text-muted">Esperando a los demás…</p>
      </div>
    </div>
  );
}
