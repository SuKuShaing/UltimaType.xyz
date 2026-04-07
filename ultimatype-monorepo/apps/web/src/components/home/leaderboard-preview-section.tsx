import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboardPreview } from '../../hooks/use-leaderboard-preview';
import { CountryFlag } from '../ui/country-flag';
import { LoginModal } from '../ui/login-modal';

function formatScore(score: number): string {
  return score.toLocaleString('es', { maximumFractionDigits: 1 });
}

export function LeaderboardPreviewSection() {
  const { user, isAuthenticated } = useAuth();
  const [showMyCountry, setShowMyCountry] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) setShowLogin(false);
  }, [isAuthenticated]);

  const country = showMyCountry && user?.countryCode ? user.countryCode : null;
  const { data, isLoading, isError } = useLeaderboardPreview({ country });
  const entries = data?.data ?? [];

  const showToggle = isAuthenticated && !!user?.countryCode;

  return (
    <section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Clasificación Global
        </h2>
        {showToggle && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMyCountry(false)}
              className={`rounded-lg px-3 py-1 text-xs font-sans ${
                !showMyCountry
                  ? 'bg-primary text-surface-base font-semibold'
                  : 'bg-surface-raised text-text-muted'
              }`}
              aria-pressed={!showMyCountry}
            >
              Mundial
            </button>
            <button
              type="button"
              onClick={() => setShowMyCountry(true)}
              className={`rounded-lg px-3 py-1 text-xs font-sans ${
                showMyCountry
                  ? 'bg-primary text-surface-base font-semibold'
                  : 'bg-surface-raised text-text-muted'
              }`}
              aria-pressed={showMyCountry}
            >
              Mi país
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3 py-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="py-8 text-center text-sm text-error font-sans">Error al cargar el ranking</p>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <div className="py-8 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted" aria-hidden="true">
            emoji_events
          </span>
          <p className="mt-2 text-sm text-text-muted font-sans">No hay jugadores en el ranking aún</p>
        </div>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.userId}
                  className="group relative"
                >
                  <td className="rounded-l-lg py-2 pr-3 w-8 font-semibold text-text-muted group-hover:bg-surface-raised/50">
                    <Link
                      to={`/match/${entry.bestScoreMatchCode}`}
                      className="absolute inset-0 z-10"
                      aria-label={`Ver partida de ${entry.displayName}`}
                    />
                    {entry.position}
                  </td>
                  <td className="py-2 pr-3 group-hover:bg-surface-raised/50">
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
                  <td className="rounded-r-lg py-2 text-right font-semibold font-mono text-primary group-hover:bg-surface-raised/50">
                    {formatScore(entry.bestScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Link
          to="/leaderboard"
          className="text-sm text-text-muted hover:text-primary font-sans transition-colors"
        >
          Ver clasificación completa →
        </Link>
        {!isAuthenticated && (
          <>
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="text-sm text-text-muted hover:text-primary font-sans transition-colors"
            >
              Inicia sesión para competir
            </button>
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
          </>
        )}
      </div>
    </section>
  );
}
