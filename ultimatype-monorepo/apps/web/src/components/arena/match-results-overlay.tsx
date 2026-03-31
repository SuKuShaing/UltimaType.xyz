import { useState, useEffect, useCallback } from 'react';
import { PlayerResult, PLAYER_COLORS } from '@ultimatype-monorepo/shared';
import { CountryFlag } from '../ui/country-flag';

const REMATCH_DELAY_SECONDS = 5;

interface MatchResultsOverlayProps {
  results: PlayerResult[];
  localUserId: string;
  reason: 'all_finished' | 'timeout';
  isHost?: boolean;
  onRematch: () => void;
  onExit: () => void;
  onJoinAsPlayer?: () => void;
}

export function MatchResultsOverlay({
  results,
  localUserId,
  reason,
  isHost = false,
  onRematch,
  onExit,
  onJoinAsPlayer,
}: MatchResultsOverlayProps) {
  const localResult = results.find((r) => r.playerId === localUserId);
  const [joined, setJoined] = useState(false);
  const [rematchCountdown, setRematchCountdown] = useState(REMATCH_DELAY_SECONDS);
  const rematchReady = rematchCountdown <= 0;

  // 5-second countdown before rematch is enabled
  useEffect(() => {
    if (!isHost || onJoinAsPlayer) return;
    if (rematchCountdown <= 0) return;
    const timer = setInterval(() => {
      setRematchCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, onJoinAsPlayer, rematchCountdown]);

  // Block spacebar/enter during countdown
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!rematchReady && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
      }
    },
    [rematchReady],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
            <button
              type="button"
              onClick={onRematch}
              disabled={!rematchReady}
              autoFocus
              className={`rounded-lg px-8 py-3 text-xl font-bold transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                rematchReady
                  ? 'bg-primary text-surface-base hover:opacity-90'
                  : 'cursor-not-allowed bg-primary/40 text-surface-base/60'
              }`}
            >
              {rematchReady ? 'Revancha' : `Revancha (${rematchCountdown}s)`}
            </button>
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
