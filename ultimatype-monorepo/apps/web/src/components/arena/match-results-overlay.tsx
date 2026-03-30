import { PlayerResult, PLAYER_COLORS } from '@ultimatype-monorepo/shared';
import { CountryFlag } from '../ui/country-flag';

interface MatchResultsOverlayProps {
  results: PlayerResult[];
  localUserId: string;
  reason: 'all_finished' | 'timeout';
  onRematch: () => void;
  onExit: () => void;
}

export function MatchResultsOverlay({
  results,
  localUserId,
  reason,
  onRematch,
  onExit,
}: MatchResultsOverlayProps) {
  const localResult = results.find((r) => r.playerId === localUserId);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-label="Resultados de la partida"
    >
      <div className="w-full max-w-xl rounded-2xl bg-surface-base/95 px-8 py-10 backdrop-blur-md">
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
          <button
            type="button"
            onClick={onRematch}
            autoFocus
            className="rounded-lg bg-primary px-8 py-3 text-xl font-bold text-surface-base transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Revancha
          </button>
        </div>
      </div>
    </div>
  );
}
