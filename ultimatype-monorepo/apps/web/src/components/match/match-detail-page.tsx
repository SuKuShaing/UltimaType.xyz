import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DIFFICULTY_LEVELS } from '@ultimatype-monorepo/shared';
import { useMatchDetail } from '../../hooks/use-match-detail';
import { useAuth } from '../../hooks/use-auth';

function getLevelName(level: number): string {
  return DIFFICULTY_LEVELS.find((d) => d.level === level)?.name ?? `Nv.${level}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MatchDetailPage() {
  const { matchCode } = useParams<{ matchCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: match, isLoading, isError, refetch } = useMatchDetail(matchCode!);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-6 pt-16 font-sans text-text-main">
      <Helmet>
        <title>{matchCode ? `Partida ${matchCode}` : 'Partida'} | UltimaType</title>
      </Helmet>
      <div className="w-full max-w-2xl">
        <button
          type="button"
          className="mb-6 rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted hover:text-text-main"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          ← Volver
        </button>

        <div className="rounded-card bg-surface-container-low p-8">
          {isLoading && (
            <div className="space-y-4">
              <div className="h-8 w-48 animate-pulse rounded bg-surface-raised" />
              <div className="h-4 w-32 animate-pulse rounded bg-surface-raised" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
              ))}
            </div>
          )}

          {isError && (
            <div className="py-8 text-center font-sans text-sm">
              <p className="text-error">Error al cargar la partida</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted hover:text-text-main"
              >
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && match && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-main">
                  Partida {match.matchCode}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {getLevelName(match.level)} · {formatDate(match.createdAt)}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full font-sans text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Jugador</th>
                      <th className="pb-2 pr-4">Puntaje</th>
                      <th className="pb-2 pr-4">WPM</th>
                      <th className="pb-2 pr-4">Precisión</th>
                      <th className="pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.participants.map((p, i) => (
                      <tr
                        key={i}
                        className={`${i % 2 === 0 ? 'bg-surface-container-low/40' : ''}`}
                      >
                        <td className="py-3 pr-4 font-semibold text-text-muted">
                          {p.rank}
                        </td>
                        <td className="py-3 pr-4">
                          <Link to={`/u/${p.slug}`} className="flex items-center gap-2 hover:opacity-80">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xs font-semibold text-primary">
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                p.displayName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-primary hover:underline">{p.displayName}</span>
                          </Link>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-primary">{p.score.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-text-main">{p.wpm.toFixed(1)}</td>
                        <td className="py-3 pr-4 text-text-main">{p.precision}%</td>
                        <td className="py-3 text-text-muted">
                          {p.finished ? 'Completada' : 'No completada'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {!isAuthenticated && !isLoading && !isError && match && (
          <div className="mt-6 text-center">
            <a
              href="/api/auth/google"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface-base"
            >
              Comienza a competir
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
