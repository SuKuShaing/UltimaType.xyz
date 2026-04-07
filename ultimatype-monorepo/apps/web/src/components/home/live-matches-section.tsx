import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActiveRoomDto,
  ActiveRoomPlayerDto,
  CreateRoomResponse,
  DIFFICULTY_LEVELS,
  PLAYER_COLORS,
} from '@ultimatype-monorepo/shared';
import { useActiveRooms } from '../../hooks/use-active-rooms';
import { useAuth } from '../../hooks/use-auth';
import { apiClient } from '../../lib/api-client';
import { LoginModal } from '../ui/login-modal';

function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function MiniLeaderboardRow({
  player,
  status,
  startedAt,
  textLength,
}: {
  player: ActiveRoomPlayerDto;
  status: 'waiting' | 'playing';
  startedAt?: string;
  textLength?: number;
}) {
  const matchStartTime = startedAt ? new Date(startedAt).getTime() : null;
  const elapsedMinutes = matchStartTime
    ? Math.max((Date.now() - matchStartTime) / 60_000, 0.01)
    : 0;

  const wpm =
    status === 'playing' && elapsedMinutes > 0 && player.position
      ? Math.min(Math.round((player.position / 5) / elapsedMinutes), 500)
      : 0;

  const progress =
    status === 'playing' && textLength && textLength > 0
      ? Math.min(((player.position ?? 0) / textLength) * 100, 100)
      : 0;

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: PLAYER_COLORS[player.colorIndex] ?? PLAYER_COLORS[0],
        }}
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-sm font-sans text-text-main">
        {player.displayName}
      </span>
      {status === 'playing' && wpm > 0 && (
        <span className="shrink-0 font-mono text-xs text-text-muted">
          {wpm} wpm
        </span>
      )}
      {status === 'playing' && (
        <div
          className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-surface-raised"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function LiveMatchCard({ room }: { room: ActiveRoomDto }) {
  const navigate = useNavigate();
  const levelInfo = DIFFICULTY_LEVELS.find((d) => d.level === room.level);

  const elapsedMs =
    room.startedAt ? Math.max(Date.now() - new Date(room.startedAt).getTime(), 0) : 0;

  return (
    <div className="rounded-card bg-surface-container-low p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-sans font-semibold text-text-main truncate">
            {levelInfo?.name ?? `Nivel ${room.level}`}
          </p>
          <p className="text-xs font-sans text-text-muted">
            {room.playerCount} jugador{room.playerCount !== 1 ? 'es' : ''}
            {room.status === 'playing' && elapsedMs > 0 && (
              <span className="ml-1 font-mono">· {formatElapsed(elapsedMs)}</span>
            )}
            {room.status === 'waiting' && (
              <span className="ml-1">· Esperando</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/room/${room.code}`)}
          className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-sans font-semibold text-text-main transition-colors hover:bg-primary hover:text-surface-base"
          aria-label={`Observar partida ${room.code}`}
        >
          Observar
        </button>
      </div>

      {room.players.length > 0 && (
        <div className="flex flex-col gap-2">
          {room.players.map((player) => (
            <MiniLeaderboardRow
              key={`${player.displayName}-${player.colorIndex}`}
              player={player}
              status={room.status}
              startedAt={room.startedAt}
              textLength={room.textLength}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  const { isAuthenticated, isFetchingProfile } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleCreateRoom = async () => {
    if (isFetchingProfile) return;
    if (!isAuthenticated) {
      localStorage.setItem('returnAfterLogin', window.location.pathname);
      setShowLogin(true);
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    try {
      const { code } = await apiClient<CreateRoomResponse>('/rooms', {
        method: 'POST',
      });
      navigate(`/room/${code}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span
        className="material-symbols-outlined text-4xl text-text-muted"
        aria-hidden="true"
      >
        sports_esports
      </span>
      <div>
        <p className="text-sm font-sans font-semibold text-text-main">
          No hay partidas en vivo
        </p>
        <p className="mt-0.5 text-xs font-sans text-text-muted">
          ¡Crea una partida y sé el primero!
        </p>
      </div>
      <button
        type="button"
        onClick={handleCreateRoom}
        disabled={isCreating}
        className="rounded-full bg-primary px-4 py-1.5 text-sm font-sans font-semibold text-surface-base transition-opacity disabled:opacity-50"
      >
        Crear partida
      </button>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export function LiveMatchesSection() {
  const { data, isLoading } = useActiveRooms();
  const rooms = data?.rooms ?? [];

  return (
    <section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
        Partidas en Vivo
      </h2>

      {isLoading && rooms.length === 0 ? null : rooms.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <LiveMatchCard key={room.code} room={room} />
          ))}
        </div>
      )}
    </section>
  );
}
