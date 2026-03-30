import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLobby } from '../../hooks/use-lobby';
import { useAuth } from '../../hooks/use-auth';
import { PlayerAvatarPill } from './player-avatar-pill';
import { ArenaPage } from '../arena/arena-page';
import { DIFFICULTY_LEVELS, TIME_LIMIT_OPTIONS } from '@ultimatype-monorepo/shared';

const TIME_LIMIT_LABELS: Record<number, string> = {
  0: 'Finalizar texto',
  30_000: '30s',
  60_000: '1 min',
  120_000: '2 min',
  180_000: '3 min',
  240_000: '4 min',
  300_000: '5 min',
};

export function LobbyPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    roomState,
    error,
    isConnected,
    matchStarted,
    matchData,
    toggleReady,
    selectLevel,
    setTimeLimit,
    setMaxPlayers,
    startMatch,
    leaveRoom,
  } = useLobby(code);

  const [copied, setCopied] = useState(false);

  const isHost = roomState?.hostId === user?.id;
  const currentPlayer = roomState?.players.find((p) => p.id === user?.id);
  const otherPlayers = roomState?.players.filter((p) => p.id !== user?.id) ?? [];
  const allOthersReady =
    roomState && otherPlayers.every((p) => p.isReady);
  const roomLink = `${window.location.origin}/room/${code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: link is visible in the UI
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  if (!code) return null;

  // Transition to arena when match starts
  if (matchStarted && matchData && user) {
    return (
      <ArenaPage
        matchData={matchData}
        localUserId={user.id}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-base px-4 py-8 font-sans text-text-main">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Sala de Espera</h1>
        <div className="flex items-center justify-center gap-2">
          <span className="rounded bg-surface-raised px-3 py-1 font-mono text-lg tracking-wider text-primary">
            {code}
          </span>
          <button
            onClick={handleCopyLink}
            className="rounded bg-surface-raised px-3 py-1 text-sm text-text-muted transition-colors hover:text-text-main"
          >
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-2 text-sm text-error">Conectando...</p>
        )}
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>

      {/* Players list */}
      <div className="mb-8 w-full max-w-md">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">
          Jugadores ({roomState?.players.length ?? 0}/{roomState?.maxPlayers ?? 20})
        </h2>
        <div className="flex flex-col gap-2">
          {roomState?.players.map((player) => (
            <PlayerAvatarPill
              key={player.id}
              player={player}
              isHost={player.id === roomState.hostId}
              isLocal={player.id === user?.id}
            />
          ))}
        </div>
      </div>

      {/* Difficulty selector (host only) */}
      {isHost && roomState && (
        <div className="mb-6 w-full max-w-md">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">
            Nivel de Dificultad
          </h2>
          <div className="flex gap-2">
            {DIFFICULTY_LEVELS.map((dl) => (
              <button
                key={dl.level}
                onClick={() => selectLevel(dl.level)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  roomState.level === dl.level
                    ? 'bg-primary text-surface-base'
                    : 'bg-surface-raised text-text-muted hover:text-text-main'
                }`}
              >
                {dl.level}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-text-muted">
            {DIFFICULTY_LEVELS.find((dl) => dl.level === roomState.level)?.name}
          </p>
        </div>
      )}

      {/* Time limit selector (host only) */}
      {isHost && roomState && (
        <div className="mb-6 w-full max-w-md">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">
            Límite de Tiempo
          </h2>
          <div className="flex flex-wrap gap-2">
            {TIME_LIMIT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setTimeLimit(opt)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  roomState.timeLimit === opt
                    ? 'bg-primary text-surface-base'
                    : 'bg-surface-raised text-text-muted hover:text-text-main'
                }`}
              >
                {TIME_LIMIT_LABELS[opt] ?? `${opt / 1000}s`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Max players selector (host only) */}
      {isHost && roomState && (
        <div className="mb-6 w-full max-w-md">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">
            Máximo de Jugadores
          </h2>
          <select
            value={roomState.maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full rounded-lg bg-surface-raised px-3 py-2 text-sm font-medium text-text-main"
          >
            {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n} jugadores
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Non-host: show selected level, time limit, and max players */}
      {!isHost && roomState && (
        <div className="mb-6 text-center">
          <span className="text-sm text-text-muted">Nivel: </span>
          <span className="font-semibold text-primary">
            {DIFFICULTY_LEVELS.find((dl) => dl.level === roomState.level)?.name ??
              roomState.level}
          </span>
          <span className="ml-4 text-sm text-text-muted">Tiempo: </span>
          <span className="font-semibold text-primary">
            {TIME_LIMIT_LABELS[roomState.timeLimit] ?? `${roomState.timeLimit / 1000}s`}
          </span>
          <span className="ml-4 text-sm text-text-muted">Máx: </span>
          <span className="font-semibold text-primary">
            {roomState.maxPlayers} jugadores
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex w-full max-w-md gap-3">
        <button
          onClick={handleLeave}
          className="flex-1 rounded-lg bg-surface-raised px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:text-text-main"
        >
          Salir
        </button>

        {!isHost && currentPlayer && (
          <button
            onClick={() => toggleReady(!currentPlayer.isReady)}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
              currentPlayer.isReady
                ? 'bg-success/20 text-success'
                : 'bg-primary text-surface-base'
            }`}
          >
            {currentPlayer.isReady ? 'Listo ✓' : 'Listo'}
          </button>
        )}

        {isHost && (
          <button
            onClick={startMatch}
            disabled={!allOthersReady}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
              allOthersReady
                ? 'bg-primary text-surface-base hover:bg-primary/90'
                : 'cursor-not-allowed bg-surface-raised text-text-muted opacity-50'
            }`}
          >
            Iniciar
          </button>
        )}
      </div>
    </div>
  );
}
