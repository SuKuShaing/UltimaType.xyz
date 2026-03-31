import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLobby } from '../../hooks/use-lobby';
import { useAuth } from '../../hooks/use-auth';
import { PlayerAvatarPill } from './player-avatar-pill';
import { ArenaPage } from '../arena/arena-page';
import { DIFFICULTY_LEVELS, TIME_LIMIT_OPTIONS, MAX_SPECTATORS } from '@ultimatype-monorepo/shared';

const TIME_LIMIT_LABELS: Record<number, string> = {
  0: 'Finalizar texto',
  30_000: '30s',
  60_000: '1 min',
  120_000: '2 min',
  180_000: '3 min',
  240_000: '4 min',
  300_000: '5 min',
};

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

let toastIdCounter = 0;

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
    isSpectator,
    isSwitchingRole,
    autoSpectateMessage,
    kickedMessage,
    movedToSpectatorMessage,
    pendingJoinAsPlayer,
    toggleReady,
    selectLevel,
    setTimeLimit,
    setMaxPlayers,
    startMatch,
    leaveRoom,
    switchToSpectator,
    switchToPlayer,
    requestJoinAsPlayer,
    clearAutoSpectateMessage,
    kickPlayer,
    moveToSpectator,
    clearKickedMessage,
    clearMovedToSpectatorMessage,
  } = useLobby(code, user?.id);

  const [copied, setCopied] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    action: 'kick' | 'moveToSpectator';
    playerId: string;
    playerName: string;
  } | null>(null);
  const hasConnectedRef = useRef(false);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = String(++toastIdCounter);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Connection status toasts — skip initial connecting state
  useEffect(() => {
    if (isConnected) {
      if (hasConnectedRef.current) {
        addToast('Conexión restaurada', 'success');
      }
      hasConnectedRef.current = true;
    } else if (hasConnectedRef.current) {
      addToast('Sin conexión · Reconectando...', 'error');
    }
  }, [isConnected, addToast]);

  // Auto-spectate toast
  useEffect(() => {
    if (autoSpectateMessage) {
      addToast(autoSpectateMessage, 'info');
      clearAutoSpectateMessage();
    }
  }, [autoSpectateMessage, addToast, clearAutoSpectateMessage]);

  // Kicked toast + navigate home
  useEffect(() => {
    if (!kickedMessage) return;
    addToast(kickedMessage, 'error');
    clearKickedMessage();
    const tid = setTimeout(() => navigate('/'), 2000);
    return () => clearTimeout(tid);
  }, [kickedMessage, addToast, clearKickedMessage, navigate]);

  // Moved to spectator toast
  useEffect(() => {
    if (movedToSpectatorMessage) {
      addToast(movedToSpectatorMessage, 'info');
      clearMovedToSpectatorMessage();
    }
  }, [movedToSpectatorMessage, addToast, clearMovedToSpectatorMessage]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuFor) return;
    const handleClick = () => setOpenMenuFor(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuFor]);

  const isHost = roomState?.hostId === user?.id;
  const currentPlayer = roomState?.players.find((p) => p.id === user?.id);
  const otherPlayers = roomState?.players.filter((p) => p.id !== user?.id) ?? [];
  const allOthersReady = roomState && otherPlayers.every((p) => p.isReady);
  const roomLink = `${window.location.origin}/room/${code}`;
  const isPlayerRoomFull = (roomState?.players.length ?? 0) >= (roomState?.maxPlayers ?? 20);

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

  const handleSwitchToSpectator = () => {
    setOpenMenuFor(null);
    switchToSpectator();
  };

  const handleSwitchToPlayer = () => {
    setOpenMenuFor(null);
    switchToPlayer();
  };

  if (!code) return null;

  // Transition to arena when match starts
  if (matchStarted && matchData && user) {
    return (
      <ArenaPage
        matchData={matchData}
        localUserId={user.id}
        isSpectator={isSpectator}
        onJoinAsPlayer={isSpectator ? requestJoinAsPlayer : undefined}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-base px-4 pt-16 pb-8 font-sans text-text-main">
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'error'
                  ? 'bg-error text-white'
                  : toast.type === 'success'
                    ? 'bg-success text-white'
                    : 'bg-surface-raised text-text-main'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="ml-2 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

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

      {/* Spectator badge */}
      {isSpectator && (
        <div className="mb-4 rounded-lg bg-surface-raised px-4 py-2 text-sm text-text-muted">
          Estás como espectador
        </div>
      )}

      {/* Players list */}
      <div className="mb-8 w-full max-w-md">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">
          Jugadores ({roomState?.players.length ?? 0}/{roomState?.maxPlayers ?? 20})
          {(roomState?.spectators?.length ?? 0) > 0 && (
            <span className="ml-2">| {roomState?.spectators?.length} espectadores</span>
          )}
        </h2>
        <div className="flex flex-col gap-2">
          {roomState?.players.map((player) => {
            const isOwnCard = player.id === user?.id;
            const menuOpen = openMenuFor === `player-${player.id}`;

            const menuContent = (() => {
              if (roomState.status !== 'waiting') return null;

              // Own card: switch to spectator
              if (isOwnCard) {
                return (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuFor(menuOpen ? null : `player-${player.id}`);
                      }}
                      disabled={isSwitchingRole}
                      className="rounded p-1 text-text-muted hover:bg-surface-base hover:text-text-main disabled:opacity-40"
                      title="Opciones"
                    >
                      {isSwitchingRole ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        '···'
                      )}
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-surface-raised py-1 shadow-lg">
                        <button
                          onClick={handleSwitchToSpectator}
                          className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-surface-base"
                        >
                          Cambiar a espectador
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // Host viewing another player: kick / move to spectator
              if (isHost && !isOwnCard) {
                return (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuFor(menuOpen ? null : `player-${player.id}`);
                      }}
                      className="rounded p-1 text-text-muted hover:bg-surface-base hover:text-text-main"
                      title="Opciones del host"
                    >
                      ···
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-surface-raised py-1 shadow-lg">
                        <button
                          onClick={() => {
                            setOpenMenuFor(null);
                            setConfirmModal({ action: 'kick', playerId: player.id, playerName: player.displayName });
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-error hover:bg-surface-base"
                        >
                          Sacar jugador
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuFor(null);
                            setConfirmModal({ action: 'moveToSpectator', playerId: player.id, playerName: player.displayName });
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-surface-base"
                        >
                          Pasar a espectador
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })();

            return (
              <PlayerAvatarPill
                key={player.id}
                player={player}
                isHost={player.id === roomState.hostId}
                isLocal={isOwnCard}
                menuContent={menuContent}
              />
            );
          })}
        </div>

        {/* Spectators list */}
        {(roomState?.spectators?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold text-text-muted">
              Espectadores ({roomState?.spectators?.length}/{MAX_SPECTATORS})
            </h3>
            <div className="flex flex-wrap gap-2">
              {roomState?.spectators.map((spec) => {
                const isOwnPill = spec.id === user?.id;
                const menuOpen = openMenuFor === `spectator-${spec.id}`;
                if (!isOwnPill) {
                  return (
                    <span
                      key={spec.id}
                      className="rounded bg-surface-raised px-2 py-1 text-xs text-text-muted"
                    >
                      {spec.displayName}
                    </span>
                  );
                }
                return (
                  <div key={spec.id} className="relative flex items-center gap-1">
                    <span className="rounded bg-surface-raised px-2 py-1 text-xs text-text-muted">
                      {spec.displayName}
                    </span>
                    {roomState.status === 'waiting' && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuFor(menuOpen ? null : `spectator-${spec.id}`);
                          }}
                          disabled={isSwitchingRole}
                          className="rounded px-1 py-0.5 text-xs text-text-muted hover:bg-surface-raised hover:text-text-main disabled:opacity-40"
                          title="Opciones"
                        >
                          {isSwitchingRole ? (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            '···'
                          )}
                        </button>
                        {menuOpen && (
                          <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg bg-surface-raised py-1 shadow-lg">
                            {isPlayerRoomFull ? (
                              <div className="cursor-not-allowed px-4 py-2 text-sm">
                                <span className="block text-text-muted opacity-60">
                                  Cambiar a jugador
                                </span>
                                <span className="mt-0.5 block text-xs text-error">
                                  Sala llena · {roomState.players.length}/{roomState.maxPlayers}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={handleSwitchToPlayer}
                                className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-surface-base"
                              >
                                Cambiar a jugador
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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

        {!isSpectator && !isHost && currentPlayer && (
          <button
            onClick={() => toggleReady(!currentPlayer.isReady)}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
              currentPlayer.isReady
                ? 'bg-success/20 text-success'
                : 'animate-pulse bg-primary text-surface-base'
            }`}
          >
            {currentPlayer.isReady ? 'Listo ✓' : 'Listo'}
          </button>
        )}

        {!isSpectator && isHost && (
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

      {/* Host action confirmation modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-base px-8 py-8 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-lg font-bold text-text-main">
              {confirmModal.action === 'kick' ? '¿Sacar jugador?' : '¿Pasar a espectador?'}
            </p>
            <p className="mb-6 text-sm text-text-muted">
              {confirmModal.action === 'kick'
                ? `${confirmModal.playerName} será expulsado de la sala.`
                : `${confirmModal.playerName} pasará a ser espectador.`}
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-lg bg-surface-raised px-6 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-main"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.action === 'kick') {
                    kickPlayer(confirmModal.playerId);
                  } else {
                    moveToSpectator(confirmModal.playerId);
                  }
                  setConfirmModal(null);
                }}
                className={`rounded-lg px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 ${
                  confirmModal.action === 'kick' ? 'bg-error' : 'bg-primary'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
