import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DIFFICULTY_LEVELS, MatchPeriod, COUNTRIES } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { usePublicProfile } from '../../hooks/use-public-profile';
import { useUserMatches } from '../../hooks/use-user-matches';
import { useUserStats } from '../../hooks/use-user-stats';
import { useUserPosition } from '../../hooks/use-user-position';
import { useCheckSlug } from '../../hooks/use-check-slug';
import { apiClient } from '../../lib/api-client';
import { CountryFlag } from '../ui/country-flag';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

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
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { data: profile, isLoading: isProfileLoading, isError } = usePublicProfile(slug!);

  // History/stats filters
  const [period, setPeriod] = useState<MatchPeriod>('all');
  const [level, setLevel] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Edit state — always declared (Rules of Hooks), only active when isOwnProfile
  const [selectedCountry, setSelectedCountry] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState('');
  const [hasChanged, setHasChanged] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSlugRef = useRef<string | null>(null);

  const isOwnProfile = isAuthenticated && !!user?.slug && user.slug === slug;

  const { data: slugCheck, isLoading: isCheckingSlug } = useCheckSlug(debouncedSlug);

  const mutation = useMutation({
    mutationFn: (data: { countryCode?: string; slug?: string }) =>
      apiClient('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setHasChanged(false);
      setSlugDirty(false);
      setSuccessMessage('¡Perfil actualizado correctamente!');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
      const newSlug = pendingSlugRef.current;
      pendingSlugRef.current = null;
      if (newSlug) navigate(`/u/${newSlug}`, { replace: true });
    },
  });

  const { data: stats, isLoading: isStatsLoading } = useUserStats({
    userId: profile?.id ?? '',
    level,
    period,
  });

  const { data: position, isLoading: isPositionLoading } = useUserPosition(profile?.id ?? '');

  const { data: history, isLoading: isHistoryLoading } = useUserMatches({
    userId: profile?.id ?? '',
    page,
    level,
    period,
  });

  // Initialize slug from user when own profile loads
  useEffect(() => {
    if (isOwnProfile && user?.slug && !slugDirty) {
      setSlugInput(user.slug);
    }
  }, [isOwnProfile, user?.slug, slugDirty]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
    };
  }, []);

  function handlePeriodChange(p: MatchPeriod) {
    setPeriod(p);
    setPage(1);
  }

  function handleLevelChange(l: number | null) {
    setLevel(l);
    setPage(1);
  }

  function handleSlugChange(value: string) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInput(normalized);
    setSlugDirty(true);
    checkHasChanged(selectedCountry, normalized);
    setSuccessMessage('');
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    slugTimerRef.current = setTimeout(() => {
      if (normalized !== user?.slug) setDebouncedSlug(normalized);
      else setDebouncedSlug('');
    }, 400);
  }

  function handleCountryChange(code: string) {
    setSelectedCountry(code);
    checkHasChanged(code, slugInput);
    setSuccessMessage('');
  }

  function checkHasChanged(country: string, slug: string) {
    const countryChanged = country !== '' && country !== (user?.countryCode ?? '');
    const slugChanged = slug !== (user?.slug ?? '') && slug.length >= 3;
    setHasChanged(countryChanged || slugChanged);
  }

  function handleSave() {
    if (!hasChanged || mutation.isPending) return;
    const data: { countryCode?: string; slug?: string } = {};
    if (selectedCountry && selectedCountry !== (user?.countryCode ?? '')) {
      data.countryCode = selectedCountry;
    }
    if (slugInput !== (user?.slug ?? '') && slugInput.length >= 3) {
      data.slug = slugInput;
      pendingSlugRef.current = slugInput;
    }
    if (Object.keys(data).length === 0) return;
    mutation.mutate(data);
  }

  const slugValid = SLUG_REGEX.test(slugInput);
  const slugChanged = slugInput !== (user?.slug ?? '');
  const slugAvailable = slugCheck?.available ?? false;

  const isEmpty = !isHistoryLoading && (history?.data.length ?? 0) === 0;
  const totalPages = Math.max(1, history?.meta.totalPages ?? 1);

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

  const effectiveCountry = selectedCountry || user?.countryCode || '';
  const currentCountryName = profile.countryCode
    ? COUNTRIES.find((c) => c.code === profile.countryCode)?.name ?? profile.countryCode
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-base px-4 pt-20 pb-10 font-sans text-text-main">
      <Helmet>
        <title>{isOwnProfile ? 'Mi perfil' : profile.displayName} — UltimaType</title>
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
          {user?.email && isOwnProfile && (
            <div className="mt-1 text-sm text-text-muted">{user.email}</div>
          )}
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-text-muted">
            <CountryFlag countryCode={profile.countryCode} size={16} />
            <span>{formatMemberSince(profile.createdAt)}</span>
          </div>

          {/* Edit panel — only shown for own profile */}
          {isOwnProfile && (
            <div className="mt-6 rounded-xl bg-surface-base p-6 text-left">
              {/* Slug */}
              <div className="mb-5">
                <label htmlFor="slug-input" className="mb-2 block text-xs uppercase tracking-wide text-text-muted">
                  Slug (URL pública)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">ultimatype.xyz/u/</span>
                  <input
                    id="slug-input"
                    type="text"
                    value={slugInput}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 rounded-lg bg-surface-raised px-3 py-2 text-sm text-text-main"
                    maxLength={30}
                    aria-label="Editar slug"
                    data-testid="slug-input"
                  />
                </div>
                {slugDirty && slugChanged && slugInput.length >= 3 && (
                  <div className="mt-1 text-xs" data-testid="slug-status">
                    {!slugValid && <span className="text-error">Formato inválido</span>}
                    {slugValid && isCheckingSlug && <span className="text-text-muted">Verificando...</span>}
                    {slugValid && !isCheckingSlug && slugAvailable && <span className="text-success">Disponible</span>}
                    {slugValid && !isCheckingSlug && !slugAvailable && <span className="text-error">No disponible</span>}
                  </div>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setLinkCopied(true);
                    if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
                    linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  {linkCopied ? '¡Enlace copiado!' : 'Copiar enlace'}
                </button>
              </div>

              {/* Country */}
              <div className="mb-5">
                <label htmlFor="country-select" className="mb-2 block text-xs uppercase tracking-wide text-text-muted">
                  País
                </label>
                {!selectedCountry && currentCountryName && (
                  <div className="mb-2 text-sm">{currentCountryName}</div>
                )}
                {!selectedCountry && !profile.countryCode && (
                  <div className="mb-2 text-sm italic text-text-muted">Sin país asignado</div>
                )}
                <select
                  id="country-select"
                  className="w-full appearance-none rounded-lg bg-surface-raised px-4 py-3 text-sm text-text-main font-sans"
                  value={effectiveCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  aria-label="Seleccionar país"
                >
                  <option value="">Seleccionar país...</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save */}
              <button
                className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-surface-base font-sans disabled:cursor-not-allowed disabled:opacity-40"
                onClick={handleSave}
                disabled={
                  !hasChanged ||
                  mutation.isPending ||
                  (slugChanged && slugValid && (isCheckingSlug || !slugAvailable))
                }
                aria-label="Guardar cambios de perfil"
              >
                {mutation.isPending ? '_' : 'Guardar cambios'}
              </button>

              {successMessage && (
                <div className="mt-3 text-center text-sm text-success">{successMessage}</div>
              )}
              {mutation.isError && (
                <div className="mt-3 text-center text-sm text-error">
                  Error al guardar. Intenta nuevamente.
                </div>
              )}
            </div>
          )}

          {/* CTA — only for unauthenticated visitors */}
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

        {/* Ranking positions */}
        {(isPositionLoading || position) && (
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Posición Global',
                value: position ? `#${position.globalRank}` : '—',
                sub: position ? `de ${position.globalTotal} jugadores` : null,
              },
              {
                label: position?.countryCode
                  ? (COUNTRIES.find((c) => c.code === position.countryCode)?.name ?? 'Posición Nacional')
                  : 'Posición Nacional',
                value: position?.countryRank != null ? `#${position.countryRank}` : '—',
                sub: position?.countryTotal != null ? `de ${position.countryTotal} jugadores` : null,
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl bg-surface-sunken p-4 text-center">
                {isPositionLoading ? (
                  <div className="mx-auto h-8 w-16 animate-pulse rounded bg-surface-raised" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-primary">{value}</div>
                    {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
                  </>
                )}
                <div className="mt-1 text-xs uppercase tracking-wide text-text-muted">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stats — se actualizan con los filtros de período y nivel */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Mejor Puntaje', value: stats?.bestScore ?? '—', tooltip: undefined },
            { label: 'Puntaje Promedio', value: stats?.avgScore ?? '—', tooltip: undefined },
            { label: 'Precisión Prom.', value: stats?.avgPrecision != null ? `${stats.avgPrecision}%` : '—', tooltip: 'Precisión promedio' },
            { label: 'WPM', value: stats?.avgWpm ?? '—', tooltip: 'Palabras por minuto' },
            { label: 'Total Partidas', value: stats?.totalMatches ?? '—', tooltip: undefined },
          ].map(({ label, value, tooltip }) => (
            <div key={label} title={tooltip} className="rounded-xl bg-surface-sunken p-4 text-center">
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
