import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboardPosition } from '../../hooks/use-leaderboard-position';
import { LoginModal } from '../ui/login-modal';

export function PlayerProfileSection() {
  const { user, isAuthenticated, isFetchingProfile } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const { data: position, isLoading: isPositionLoading } = useLeaderboardPosition({
    level: null,
    period: 'all',
  });

  const isLoading = isFetchingProfile || (isAuthenticated && isPositionLoading);

  return (
    <section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
        Tu Perfil
      </h2>

      {/* Estado de carga */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-surface-raised" />
            <div className="h-4 w-28 animate-pulse rounded bg-surface-raised" />
          </div>
          <div className="h-12 animate-pulse rounded-xl bg-surface-raised" />
          <div className="h-12 animate-pulse rounded-xl bg-surface-raised" />
        </div>
      )}

      {/* CTA para no autenticados */}
      {!isFetchingProfile && !isAuthenticated && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="text-sm text-text-muted font-sans">
            Inicia sesión para ver tu ranking
          </p>
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-surface-base font-sans"
          >
            Iniciar sesión
          </button>
          {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </div>
      )}

      {/* Sin historial de partidas */}
      {isAuthenticated && !isLoading && position === null && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <UserAvatar user={user!} />
            <Link
              to={`/u/${user!.slug}`}
              className="text-sm font-semibold text-text-main hover:text-primary font-sans"
            >
              {user!.displayName}
            </Link>
          </div>
          <p className="text-sm text-text-muted font-sans">
            Juega tu primera partida para aparecer en el ranking
          </p>
        </div>
      )}

      {/* Tarjeta completa con historial */}
      {isAuthenticated && !isLoading && position != null && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <UserAvatar user={user!} />
            <Link
              to={`/u/${user!.slug}`}
              className="text-sm font-semibold text-text-main hover:text-primary font-sans"
            >
              {user!.displayName}
            </Link>
          </div>

          <div className="mb-4 space-y-2">
            <div className="rounded-xl bg-surface-raised p-3">
              <div className="text-xs uppercase tracking-wide text-text-muted font-sans">
                Mejor Puntaje
              </div>
              <div className="text-xl font-semibold text-primary font-mono">
                {position.bestScore.toLocaleString('es', { maximumFractionDigits: 1 })}
              </div>
            </div>
            <div className="rounded-xl bg-surface-raised p-3">
              <div className="text-xs uppercase tracking-wide text-text-muted font-sans">
                Ranking Mundial
              </div>
              <div className="text-xl font-semibold text-primary font-sans">
                Top {position.globalPercentile}% Mundial
              </div>
            </div>
          </div>

          <Link
            to={`/u/${user!.slug}`}
            className="text-sm text-primary hover:underline font-sans"
          >
            Ver mi perfil →
          </Link>
        </div>
      )}
    </section>
  );
}

interface UserAvatarProps {
  user: { displayName: string; avatarUrl: string | null };
}

function UserAvatar({ user }: UserAvatarProps) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  );
}
