import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DIFFICULTY_LEVELS, COUNTRIES, MatchPeriod } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboard } from '../../hooks/use-leaderboard';
import { useLeaderboardPosition } from '../../hooks/use-leaderboard-position';
import { CountryFlag } from '../ui/country-flag';

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatScore(score: number): string {
  return score.toLocaleString('es', { maximumFractionDigits: 1 });
}

function getCountryName(code: string | null): string {
  if (!code) return '';
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

const PERIOD_OPTIONS: { label: string; value: MatchPeriod }[] = [
  { label: 'Histórico', value: 'all' },
  { label: 'Último año', value: '1y' },
  { label: 'Último mes', value: '30d' },
  { label: 'Últimos 7 días', value: '7d' },
];

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [level, setLevel] = useState<number | null>(null);
  const [period, setPeriod] = useState<MatchPeriod>('all');
  const [country, setCountry] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function handleLevelChange(l: number | null) {
    setLevel(l);
    setPage(1);
  }

  function handlePeriodChange(p: MatchPeriod) {
    setPeriod(p);
    setPage(1);
  }

  function handleCountryChange(c: string | null) {
    setCountry(c);
    setPage(1);
  }

  const { data: leaderboard, isLoading, isError, refetch } = useLeaderboard({ level, period, country, page });
  const { data: position, isLoading: isPositionLoading } = useLeaderboardPosition({ level, period });

  const isEmpty = !isLoading && !isError && (leaderboard?.data.length ?? 0) === 0;

  const emptyMessage = (() => {
    const countryName = country ? getCountryName(country) : null;
    if (level !== null && countryName) return `No hay jugadores de ${countryName} registrados en este nivel`;
    if (countryName) return `No hay jugadores de ${countryName} registrados`;
    if (level !== null) return 'No hay jugadores registrados en este nivel';
    return 'No hay jugadores registrados aún';
  })();
  const totalPages = leaderboard?.meta.totalPages ?? 1;

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-base px-4 pt-20 pb-10 font-sans text-text-main">
      <Helmet>
        <title>Ranking Global - UltimaType</title>
      </Helmet>

      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Ranking Global</h1>

        {/* Position widget — only for authenticated users */}
        {isAuthenticated && (
          <div className="rounded-2xl bg-surface-sunken p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Tu posición</h2>
            {isPositionLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-5 w-64 animate-pulse rounded bg-surface-raised" />
                ))}
              </div>
            )}
            {!isPositionLoading && !position && (
              <p className="text-sm italic text-text-muted">
                Juega tu primera partida para aparecer en el ranking
              </p>
            )}
            {!isPositionLoading && position && (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-text-muted">Tu mejor puntaje: </span>
                  <span className="font-semibold text-primary">{formatScore(position.bestScore)} pts</span>
                  <span className="text-text-muted">
                    {' · '}partida{' '}
                    <Link
                      to={`/match/${position.bestScoreMatchCode}`}
                      className="text-primary underline hover:text-primary/80"
                    >
                      {position.bestScoreMatchCode}
                    </Link>
                    {', '}
                    {formatDate(position.bestScoreDate)}
                  </span>
                </p>
                <p>
                  <span className="text-text-muted">Mundial: </span>
                  <span className="font-semibold">#{position.globalRank}</span>
                  <span className="text-text-muted"> · Top {position.globalPercentile}% del mundo</span>
                </p>
                {position.countryCode && position.countryRank !== null && (
                  <p>
                    <CountryFlag countryCode={position.countryCode} size={14} />{' '}
                    <span className="text-text-muted">{getCountryName(position.countryCode)}: </span>
                    <span className="font-semibold">#{position.countryRank}</span>
                    <span className="text-text-muted"> · Top {position.countryPercentile}% de {getCountryName(position.countryCode)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard table */}
        <div className="rounded-2xl bg-surface-sunken p-6">
          {/* Level filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => handleLevelChange(null)}
              className={`rounded-lg px-3 py-1.5 text-sm font-sans ${
                level === null
                  ? 'bg-primary text-surface-base font-semibold'
                  : 'bg-surface-raised text-text-muted'
              }`}
              aria-pressed={level === null}
            >
              Todos los niveles
            </button>
            {DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.level}
                onClick={() => handleLevelChange(d.level)}
                className={`rounded-lg px-3 py-1.5 text-sm font-sans ${
                  level === d.level
                    ? 'bg-primary text-surface-base font-semibold'
                    : 'bg-surface-raised text-text-muted'
                }`}
                aria-pressed={level === d.level}
              >
                {d.level} {d.name}
              </button>
            ))}
          </div>

          {/* Period filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-sans ${
                  period === opt.value
                    ? 'bg-primary text-surface-base font-semibold'
                    : 'bg-surface-raised text-text-muted'
                }`}
                aria-pressed={period === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Country filter */}
          <div className="mb-6">
            <select
              value={country ?? ''}
              onChange={(e) => handleCountryChange(e.target.value || null)}
              className="rounded-lg bg-surface-raised px-3 py-1.5 text-sm text-text-muted font-sans"
              aria-label="Filtrar por país"
            >
              <option value="">Todos los países</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-raised" />
              ))}
            </div>
          )}

          {/* Error */}
          {!isLoading && isError && (
            <div className="py-8 text-center font-sans text-sm">
              <p className="text-error">Error al cargar el ranking</p>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted hover:text-text-main"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && isEmpty && (
            <div className="py-8 text-center text-text-muted font-sans text-sm italic">
              {emptyMessage}
            </div>
          )}

          {/* Table */}
          {!isLoading && !isEmpty && leaderboard && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-sm">
                  <thead>
                    <tr className="border-b border-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="pb-2 pr-4 w-12">#</th>
                      <th className="pb-2 pr-4">Jugador</th>
                      <th className="pb-2 pr-4 text-right">Mejor Puntaje</th>
                      <th className="pb-2 text-right">Precisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.data.map((entry) => (
                      <tr
                        key={entry.userId}
                        onClick={() => navigate(`/match/${entry.bestScoreMatchCode}`)}
                        className="cursor-pointer border-b border-surface-raised last:border-0 hover:bg-surface-raised/50"
                      >
                        <td className="py-3 pr-4 font-semibold text-text-muted">{entry.position}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <CountryFlag countryCode={entry.countryCode} size={16} />
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.displayName}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-surface-base">
                                {entry.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="text-text-main">{entry.displayName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-primary">{formatScore(entry.bestScore)}</td>
                        <td className="py-3 text-right text-text-muted">{entry.bestScorePrecision}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    className="rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted font-sans disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página anterior"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-text-muted font-sans">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted font-sans disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página siguiente"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
