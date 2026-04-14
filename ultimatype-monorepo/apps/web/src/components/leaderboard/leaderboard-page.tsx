import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DIFFICULTY_LEVELS, COUNTRIES, MatchPeriod } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboard } from '../../hooks/use-leaderboard';
import { useLeaderboardPosition } from '../../hooks/use-leaderboard-position';
import { useWeeklyRecord } from '../../hooks/use-weekly-record';
import { CountryFlag } from '../ui/country-flag';
import { LoginModal } from '../ui/login-modal';

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

function getLevelName(level: number | undefined): string {
  if (level == null || isNaN(level)) return '—';
  return DIFFICULTY_LEVELS.find((d) => d.level === level)?.name ?? `Nv.${level}`;
}

const PERIOD_OPTIONS: { label: string; value: MatchPeriod }[] = [
  { label: 'Histórico', value: 'all' },
  { label: 'Último año', value: '1y' },
  { label: 'Último mes', value: '30d' },
  { label: 'Últimos 7 días', value: '7d' },
];

const PERIOD_LABELS: Record<MatchPeriod, string> = {
  'all': '',
  '1y': ' en el último año',
  '30d': ' en el último mes',
  '7d': ' en los últimos 7 días',
};

export function LeaderboardPage() {
  const { isAuthenticated, user } = useAuth();
  const [level, setLevel] = useState<number | null>(null);
  const [period, setPeriod] = useState<MatchPeriod>('all');
  const [country, setCountry] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showLogin, setShowLogin] = useState(false);

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
  const { data: weeklyRecord, isLoading: isWeeklyLoading } = useWeeklyRecord();

  const isEmpty = !isLoading && !isError && (leaderboard?.data.length ?? 0) === 0;

  const emptyMessage = (() => {
    const countryName = country ? getCountryName(country) : null;
    const periodSuffix = PERIOD_LABELS[period];
    if (level !== null && countryName) return `No hay jugadores de ${countryName} registrados en este nivel${periodSuffix}`;
    if (countryName) return `No hay jugadores de ${countryName} registrados${periodSuffix}`;
    if (level !== null) return `No hay jugadores registrados en este nivel${periodSuffix}`;
    return `No hay jugadores registrados${periodSuffix || ' aún'}`;
  })();
  const totalPages = leaderboard?.meta.totalPages ?? 1;

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-base px-4 pt-20 pb-10 font-sans text-text-main">
      <Helmet>
        <title>Ranking Global - UltimaType</title>
      </Helmet>

      <div className="w-full max-w-3xl 2xl:max-w-5xl space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-text-main tracking-headline">
          Global Rankings
        </h1>

        {/* Récord de la Semana + Tu Posición Global — grid 2 columnas */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Récord de la Semana */}
          <div className="rounded-card bg-surface-sunken p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                Tu récord de la semana
              </h2>
              {!isWeeklyLoading && weeklyRecord && (
                <Link
                  to={`/u/${weeklyRecord.slug}`}
                  className="shrink-0 text-xs font-semibold text-text-main hover:text-primary font-sans"
                >
                  {weeklyRecord.displayName}
                </Link>
              )}
            </div>
            {isWeeklyLoading && (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-raised" />
                ))}
              </div>
            )}
            {!isWeeklyLoading && !weeklyRecord && (
              <p className="py-2 text-sm italic text-text-muted">Sin récord esta semana</p>
            )}
            {!isWeeklyLoading && weeklyRecord && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-surface-raised p-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted font-sans">Puntaje</div>
                  <Link
                    to={`/match/${weeklyRecord.bestScoreMatchCode}`}
                    className="text-xl font-semibold text-primary font-mono hover:underline"
                  >
                    {formatScore(weeklyRecord.bestScore)}
                  </Link>
                </div>
                <div className="rounded-xl bg-surface-raised p-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted font-sans">Precisión</div>
                  <div className="text-xl font-semibold text-primary font-mono">{weeklyRecord.bestScorePrecision}%</div>
                </div>
                <div className="rounded-xl bg-surface-raised p-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted font-sans">Nivel</div>
                  <div className="text-xl font-semibold text-primary font-mono">{getLevelName(weeklyRecord.bestScoreLevel)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Tu Posición Global (authenticated) o CTA (unauthenticated) */}
          {isAuthenticated ? (
          <div className="rounded-card bg-surface-sunken p-6" data-testid="position-widget">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                Tu Posición Global
              </h2>
              {position && (
                <Link
                  to={`/match/${position.bestScoreMatchCode}`}
                  className="text-xs text-text-muted hover:text-primary"
                >
                  {formatDate(position.bestScoreDate)}
                </Link>
              )}
            </div>
            {isPositionLoading && (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-raised" />
                ))}
              </div>
            )}
            {!isPositionLoading && !position && (
              <p className="text-sm italic text-text-muted">
                Juega tu primera partida para aparecer en el ranking
              </p>
            )}
            {!isPositionLoading && position && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-surface-raised p-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted font-sans">🏆 Mejor Puntaje</div>
                  <Link
                    to={`/match/${position.bestScoreMatchCode}`}
                    className="text-xl font-semibold text-primary font-mono hover:underline"
                  >
                    {formatScore(position.bestScore)}
                  </Link>
                </div>
                <div className="rounded-xl bg-surface-raised p-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted font-sans">🌍 Mundial</div>
                  <div
                    className="text-xl font-semibold text-primary font-mono"
                    title={`#${position.globalRank} de ${position.globalTotal}`}
                  >
                    #{position.globalRank}
                  </div>
                </div>
                {position.countryCode && position.countryRank !== null ? (
                  <div className="rounded-xl bg-surface-raised p-3">
                    <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-text-muted font-sans">
                      <CountryFlag countryCode={position.countryCode} size={12} />
                      <span>{getCountryName(position.countryCode)}</span>
                    </div>
                    <div
                      className="text-xl font-semibold text-primary font-mono"
                      title={`#${position.countryRank} de ${position.countryTotal}`}
                    >
                      #{position.countryRank}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface-raised p-3 flex items-center justify-center">
                    <div className="text-xs text-text-muted italic">Sin país</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-card bg-surface-sunken p-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
              Tu Posición Global
            </h2>
            <p className="mb-4 text-sm text-text-muted">
              Inicia sesión para ver tu ranking
            </p>
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-surface-base"
            >
              Iniciar sesión
            </button>
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
          </div>
        )}
        </div>{/* fin grid 2 columnas */}

        {/* Filtros */}
        <div className="rounded-card bg-surface-container-low p-6 space-y-4">
          {/* Level filter */}
          <div className="flex flex-wrap gap-2">
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
                type="button"
                key={d.level}
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

          {/* Period filter */}
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-sans ${
                  period === opt.value
                    ? 'bg-primary text-surface-base font-semibold'
                    : 'bg-surface-container-lowest text-text-muted'
                }`}
                aria-pressed={period === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Country filter */}
          <div className="relative w-56">
            <select
              value={country ?? ''}
              onChange={(e) => handleCountryChange(e.target.value || null)}
              className="w-full appearance-none rounded-full bg-surface-container-lowest pl-4 pr-10 py-1.5 text-sm text-text-muted font-sans"
              aria-label="Filtrar por país"
            >
              <option value="">Todos los países</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] leading-none text-text-muted" aria-hidden="true">
              expand_more
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-card bg-surface-container-low p-6">
          {/* Loading */}
          {isLoading && (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-full bg-surface-container-lowest" />
              ))}
            </div>
          )}

          {/* Error */}
          {!isLoading && isError && (
            <div className="py-8 text-center font-sans text-sm">
              <p className="text-error">Error al cargar el ranking</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted hover:text-text-main"
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
              <div className="overflow-hidden rounded-card">
                <table className="w-full font-sans text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="pb-2 pr-4 w-12">#</th>
                      <th className="pb-2 pr-4">Jugador</th>
                      <th className="pb-2 pr-4 text-right">Nivel</th>
                      <th className="pb-2 pr-4 text-right">Precisión</th>
                      <th className="pb-2 text-right">Mejor Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.data.map((entry, index) => {
                      const isOwnRow = !!user && entry.userId === user.id;
                      const rowBg = isOwnRow
                        ? 'bg-primary/10 font-semibold'
                        : index % 2 === 0
                          ? 'bg-surface-container-low/40'
                          : '';
                      return (
                        <tr
                          key={entry.userId}
                          className={`relative ${rowBg}`}
                        >
                          <td className="py-3 pr-4 font-semibold text-text-muted">
                            <Link
                              to={`/match/${entry.bestScoreMatchCode}`}
                              className="absolute inset-0 z-10"
                              aria-label={`Ver partida de ${entry.displayName}`}
                            />
                            {entry.position}
                          </td>
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
                          <td className="py-3 pr-4 text-right text-text-muted">{getLevelName(entry.bestScoreLevel)}</td>
                          <td className="py-3 pr-4 text-right text-text-muted">{entry.bestScorePrecision}%</td>
                          <td className="py-3 text-right font-mono font-semibold text-primary">
                            {formatScore(entry.bestScore)}
                          </td>
                        </tr>
                      );
                    })}
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
      </div>
    </div>
  );
}
