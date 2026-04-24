import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_LEVELS, MatchPeriod } from '@ultimatype-monorepo/shared';
import { useMatchHistory } from '../../hooks/use-match-history';
import { useMatchStats } from '../../hooks/use-match-stats';

const PERIOD_OPTIONS: { value: MatchPeriod; label: string }[] = [
  { value: 'all', label: 'Todo el tiempo' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '1y', label: 'Último año' },
];

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getLevelName(level: number): string {
  return DIFFICULTY_LEVELS.find((d) => d.level === level)?.name ?? `Nv.${level}`;
}

export function MatchHistorySection() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<MatchPeriod>('all');
  const [level, setLevel] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  function handlePeriodChange(p: MatchPeriod) {
    setPeriod(p);
    setPage(1);
  }

  function handleLevelChange(l: number | null) {
    setLevel(l);
    setPage(1);
  }

  const { data: stats, isLoading: isStatsLoading } = useMatchStats({ level, period });
  const { data: history, isLoading: isHistoryLoading, isError, refetch } = useMatchHistory({ page, level, period });

  const hasFilters = period !== 'all' || level !== null;
  const isEmpty = !isHistoryLoading && !isError && (history?.data.length ?? 0) === 0;
  const totalPages = history?.meta.totalPages ?? 1;

  return (
    <div className="rounded-card bg-surface-container-low p-8">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-text-muted font-sans">Historial de Partidas</h2>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Mejor Puntaje', value: stats?.bestScore ?? 0 },
          { label: 'Puntaje Promedio', value: stats?.avgScore ?? 0 },
          { label: 'Precisión Promedio', value: stats ? `${stats.avgPrecision}%` : '0%' },
          { label: 'Total Partidas', value: stats?.totalMatches ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-card bg-surface-container-lowest p-4 text-center">
            {isStatsLoading ? (
              <div className="mx-auto h-8 w-16 animate-pulse rounded bg-surface-raised" />
            ) : (
              <div className="text-4xl font-bold text-primary font-mono font-sans">{value}</div>
            )}
            <div className="mt-1 text-xs uppercase tracking-wide text-text-muted font-sans">{label}</div>
          </div>
        ))}
      </div>

      {/* Period filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handlePeriodChange(value)}
            className={`rounded-full px-3 py-1.5 text-sm font-sans ${
              period === value
                ? 'bg-primary text-surface-base font-semibold'
                : 'bg-surface-container-lowest text-text-muted'
            }`}
            aria-pressed={period === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Level filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleLevelChange(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-sans ${
            level === null
              ? 'bg-primary text-surface-base font-semibold'
              : 'bg-surface-container-lowest text-text-muted'
          }`}
          aria-pressed={level === null}
        >
          Todos los niveles
        </button>
        {DIFFICULTY_LEVELS.map((d) => (
          <button
            key={d.level}
            type="button"
            onClick={() => handleLevelChange(d.level)}
            className={`rounded-full px-3 py-1.5 text-sm font-sans ${
              level === d.level
                ? 'bg-primary text-surface-base font-semibold'
                : 'bg-surface-container-lowest text-text-muted'
            }`}
            aria-pressed={level === d.level}
          >
            {d.level} {d.name}
          </button>
        ))}
      </div>

      {/* Match list */}
      {isHistoryLoading && (
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      )}

      {!isHistoryLoading && isError && (
        <div className="py-8 text-center font-sans text-sm">
          <p className="text-error">Error al cargar el historial</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted hover:text-text-main"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isHistoryLoading && isEmpty && (
        <div className="py-8 text-center text-text-muted font-sans text-sm italic">
          {!hasFilters
            ? 'Aún no tienes partidas registradas'
            : period !== 'all' && level !== null
              ? 'Sin partidas con estos filtros'
              : level !== null
                ? 'Sin partidas en este nivel'
                : 'Sin partidas en este período'}
        </div>
      )}

      {!isHistoryLoading && !isEmpty && history && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="pb-2 pr-4">Puntaje</th>
                  <th className="pb-2 pr-4">WPM</th>
                  <th className="pb-2 pr-4">Precisión</th>
                  <th className="pb-2 pr-4">Nivel</th>
                  <th className="pb-2 pr-4">Rank</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((r, index) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/match/${r.matchCode}`)}
                    className={`cursor-pointer ${index % 2 === 0 ? 'bg-surface-container-low/40' : ''} hover:bg-surface-raised/30`}
                  >
                    <td className="py-3 pr-4 font-semibold text-primary">{r.score.toFixed(1)}</td>
                    <td className="py-3 pr-4 text-text-main">{r.wpm.toFixed(1)}</td>
                    <td className="py-3 pr-4 text-text-main">{r.precision}%</td>
                    <td className="py-3 pr-4 text-text-muted">{getLevelName(r.level)}</td>
                    <td className="py-3 pr-4 text-text-muted">
                      {`#${r.rank}`}
                    </td>
                    <td className="py-3 text-text-muted">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted font-sans disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Página anterior"
              >
                ← Anterior
              </button>
              <span className="text-sm text-text-muted font-sans">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted font-sans disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Página siguiente"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
