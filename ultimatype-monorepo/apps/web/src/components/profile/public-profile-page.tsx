import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DIFFICULTY_LEVELS, MatchPeriod } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { usePublicProfile } from '../../hooks/use-public-profile';
import { useUserMatches } from '../../hooks/use-user-matches';
import { useUserStats } from '../../hooks/use-user-stats';
import { CountryFlag } from '../ui/country-flag';

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

function formatMemberSince(isoString: string): string {
  const date = new Date(isoString);
  const month = date.toLocaleDateString('es', { month: 'long' });
  const year = date.getFullYear();
  return `Jugador desde ${month} ${year}`;
}

function getLevelName(level: number): string {
  return DIFFICULTY_LEVELS.find((d) => d.level === level)?.name ?? `Nv.${level}`;
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: profile, isLoading: isProfileLoading, isError } = usePublicProfile(slug!);

  const [period, setPeriod] = useState<MatchPeriod>('all');
  const [level, setLevel] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: isStatsLoading } = useUserStats({
    userId: profile?.id ?? '',
    level,
    period,
  });

  const { data: history, isLoading: isHistoryLoading } = useUserMatches({
    userId: profile?.id ?? '',
    page,
    level,
    period,
  });

  function handlePeriodChange(p: MatchPeriod) {
    setPeriod(p);
    setPage(1);
  }

  function handleLevelChange(l: number | null) {
    setLevel(l);
    setPage(1);
  }

  const isEmpty = !isHistoryLoading && (history?.data.length ?? 0) === 0;
  const totalPages = history?.meta.totalPages ?? 1;

  const displayInitials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'
    : '?';

  if (isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base font-sans text-text-main">
        <span className="text-2xl opacity-50">_</span>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base font-sans text-text-main">
        <p className="text-lg text-text-muted">Usuario no encontrado</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted hover:text-text-main"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-base px-4 pt-20 pb-10 font-sans text-text-main">
      <Helmet>
        <title>{profile.displayName} — UltimaType</title>
      </Helmet>

      <div className="w-full max-w-2xl space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-surface-sunken p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-3xl font-semibold text-primary">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`Avatar de ${profile.displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              displayInitials
            )}
          </div>
          <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-text-muted">
            <CountryFlag countryCode={profile.countryCode} size={16} />
            <span>{formatMemberSince(profile.createdAt)}</span>
          </div>

          {!isAuthenticated && (
            <a
              href="/api/auth/google"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-surface-base"
              data-testid="cta-login"
            >
              Comienza a competir
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Mejor Puntaje', value: stats?.bestScore ?? 0 },
            { label: 'Puntaje Promedio', value: stats?.avgScore ?? 0 },
            { label: 'Total Partidas', value: stats?.totalMatches ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface-sunken p-4 text-center">
              {isStatsLoading ? (
                <div className="mx-auto h-8 w-16 animate-pulse rounded bg-surface-raised" />
              ) : (
                <div className="text-2xl font-semibold text-primary">{value}</div>
              )}
              <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">{label}</div>
            </div>
          ))}
        </div>

        {/* Match History */}
        <div className="rounded-2xl bg-surface-sunken p-8">
          <h2 className="mb-6 text-lg font-semibold">Historial de partidas</h2>

          {/* Period filter */}
          <div className="mb-3 flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handlePeriodChange(value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  period === value
                    ? 'bg-primary text-surface-base font-semibold'
                    : 'bg-surface-raised text-text-muted'
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
              onClick={() => handleLevelChange(null)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
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
                className={`rounded-lg px-3 py-1.5 text-sm ${
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

          {isHistoryLoading && (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-raised" />
              ))}
            </div>
          )}

          {!isHistoryLoading && isEmpty && (
            <div className="py-8 text-center text-sm italic text-text-muted">
              Sin partidas registradas
            </div>
          )}

          {!isHistoryLoading && !isEmpty && history && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="pb-2 pr-4">Puntaje</th>
                      <th className="pb-2 pr-4">WPM</th>
                      <th className="pb-2 pr-4">Precisión</th>
                      <th className="pb-2 pr-4">Nivel</th>
                      <th className="pb-2 pr-4">Rank</th>
                      <th className="pb-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/match/${r.matchCode}`)}
                        className="cursor-pointer border-b border-surface-raised last:border-0 hover:bg-surface-raised/50"
                      >
                        <td className="py-3 pr-4 font-semibold text-primary">{r.score.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-text-main">{r.wpm.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-text-main">{r.precision}%</td>
                        <td className="py-3 pr-4 text-text-muted">{getLevelName(r.level)}</td>
                        <td className="py-3 pr-4 text-text-muted">#{r.rank}</td>
                        <td className="py-3 text-text-muted">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    className="rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página anterior"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-text-muted">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted disabled:cursor-not-allowed disabled:opacity-40"
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
