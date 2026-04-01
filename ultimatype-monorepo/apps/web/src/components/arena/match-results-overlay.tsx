import { useState, useEffect, useCallback, useRef } from 'react';
import { PlayerResult, PLAYER_COLORS } from '@ultimatype-monorepo/shared';
import { CountryFlag } from '../ui/country-flag';

const REMATCH_DELAY_SECONDS = 5;

interface MatchResultsOverlayProps {
  results: PlayerResult[];
  localUserId: string;
  reason: 'all_finished' | 'timeout';
  isHost?: boolean;
  isGuest?: boolean;
  onRematch: () => void;
  onExit: () => void;
  onJoinAsPlayer?: () => void;
}

export function MatchResultsOverlay({
  results,
  localUserId,
  reason,
  isHost = false,
  isGuest = false,
  onRematch,
  onExit,
  onJoinAsPlayer,
}: MatchResultsOverlayProps) {
  const localResult = results.find((r) => r.playerId === localUserId);
  const [joined, setJoined] = useState(false);
  const [rematchCountdown, setRematchCountdown] = useState(REMATCH_DELAY_SECONDS);
  const rematchReady = rematchCountdown <= 0;
  const rematchBtnRef = useRef<HTMLButtonElement>(null);

  // 5-second countdown before rematch is enabled
  useEffect(() => {
    if (!isHost || onJoinAsPlayer) return;
    if (rematchCountdown <= 0) return;
    const timer = setInterval(() => {
      setRematchCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, onJoinAsPlayer, rematchCountdown]);

  // Focus rematch button as soon as countdown ends (P7)
  useEffect(() => {
    if (rematchReady) rematchBtnRef.current?.focus();
  }, [rematchReady]);

  // Block spacebar/enter during countdown — only needed for host (P1)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!rematchReady && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
      }
    },
    [rematchReady],
  );

  useEffect(() => {
    if (!isHost || onJoinAsPlayer) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isHost, onJoinAsPlayer]);

  const handleJoin = () => {
    onJoinAsPlayer?.();
    setJoined(true);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-label="Resultados de la partida"
    >
      <div className="w-full max-w-xl rounded-2xl bg-surface-base/95 px-8 py-10 shadow-2xl backdrop-blur-md">
        {/* Local player stats */}
        {localResult && (
          <div className="mb-8 text-center">
            <p className="text-7xl font-bold text-primary">
              {localResult.wpm}
            </p>
            <p className="text-lg text-text-muted">WPM</p>
            <p className="mt-2 text-3xl font-bold text-text-main">
              {localResult.score} pts
            </p>
            <p className="text-lg text-text-muted">
              {localResult.precision}% precisión
            </p>
            {localResult.missingChars > 0 && (
              <p className="mt-1 text-sm text-text-muted">
                {localResult.missingChars} caracteres faltantes
              </p>
            )}
          </div>
        )}

        {/* Title */}
        <h2 className="mb-1 text-center text-2xl font-bold text-text-main">
          Resultados
        </h2>
        {reason === 'timeout' && (
          <p className="mb-4 text-center text-sm text-text-muted">
            Tiempo agotado
          </p>
        )}

        {/* Results table */}
        <table className="mb-8 w-full text-left text-sm">
          <thead>
            <tr className="text-text-muted">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Jugador</th>
              <th className="pb-2 pr-2 text-right">WPM</th>
              <th className="pb-2 pr-2 text-right">Prec.</th>
              <th className="pb-2 pr-2 text-right">Faltantes</th>
              <th className="pb-2 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isLocal = r.playerId === localUserId;
              const color = PLAYER_COLORS[r.colorIndex] ?? PLAYER_COLORS[0];
              return (
                <tr
                  key={r.playerId}
                  className={
                    isLocal ? 'bg-surface-raised/60 font-semibold' : ''
                  }
                >
                  <td className="py-1.5 pr-2">{r.rank}</td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                      {r.countryCode && (
                        <span className="shrink-0">
                          <CountryFlag countryCode={r.countryCode} size={16} />
                        </span>
                      )}
                      {r.displayName}
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 text-right">{r.wpm}</td>
                  <td className="py-1.5 pr-2 text-right">{r.precision}%</td>
                  <td className="py-1.5 pr-2 text-right">{r.missingChars}</td>
                  <td className="py-1.5 text-right">{r.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Guest registration banner */}
        {isGuest && (
          <div className="mb-6 rounded-xl bg-surface-raised/80 px-6 py-4 text-center">
            <p className="mb-3 text-sm text-text-main">
              Registrate para guardar tu progreso y competir en el ranking
            </p>
            <div className="flex justify-center gap-3">
              <a
                href="/api/auth/google"
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-shadow hover:shadow-md"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.11a7.12 7.12 0 010-4.22V7.05H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-3.16z" fill="#FBBC05" />
                  <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335" />
                </svg>
                Google
              </a>
              <a
                href="/api/auth/github"
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-surface-raised px-6 py-3 text-lg font-medium text-text-muted transition-colors hover:text-text-main"
          >
            Salir
          </button>
          {onJoinAsPlayer && !joined ? (
            <button
              type="button"
              onClick={handleJoin}
              autoFocus
              className="rounded-lg bg-surface-raised px-8 py-3 text-lg font-medium text-text-main transition-colors hover:bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              Unirse a la partida
            </button>
          ) : onJoinAsPlayer && joined ? (
            <span className="px-8 py-3 text-lg font-medium text-success">
              Inscrito para la siguiente ✓
            </span>
          ) : isHost ? (
            <div className="relative">
              {/* Invisible focusable placeholder during countdown — receives autoFocus,
                  Tab navigation works, Enter/Space do nothing (P7) */}
              {!rematchReady && (
                <button
                  type="button"
                  autoFocus
                  className="absolute inset-0 opacity-0"
                  aria-label="Esperando para activar revancha"
                />
              )}
              <button
                ref={rematchBtnRef}
                type="button"
                onClick={onRematch}
                disabled={!rematchReady}
                className={`rounded-lg px-8 py-3 text-xl font-bold transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  rematchReady
                    ? 'bg-primary text-surface-base hover:opacity-90'
                    : 'cursor-not-allowed bg-primary/40 text-surface-base/60'
                }`}
              >
                {rematchReady ? 'Revancha' : `Revancha (${rematchCountdown}s)`}
              </button>
            </div>
          ) : (
            <span className="px-8 py-3 text-lg font-medium text-text-muted">
              Esperando revancha del host...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
