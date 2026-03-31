import { useRef, useEffect, useCallback, useState } from 'react';
import { getSocket } from '../../lib/socket';
import { useCaretSync } from '../../hooks/use-caret-sync';
import { arenaStore, useArenaStore } from '../../hooks/use-arena-store';
import { LiveTextCanvas } from './live-text-canvas';
import { MultiplayerCaret } from './multiplayer-caret';
import { CountdownOverlay } from './countdown-overlay';
import { FocusWPMCounter } from './focus-wpm-counter';
import { MatchResultsOverlay } from './match-results-overlay';
import { WaitingForOthersOverlay } from './waiting-for-others-overlay';
import { ReconnectingOverlay } from './reconnecting-overlay';
import { SpectatorLeaderboard } from './spectator-leaderboard';
import {
  MatchStartPayload,
  MatchEndPayload,
  PlayerFinishPayload,
  PlayerDisconnectedPayload,
  PlayerReconnectedPayload,
  WS_EVENTS,
  PLAYER_COLORS,
} from '@ultimatype-monorepo/shared';

interface ArenaPageProps {
  matchData: MatchStartPayload;
  localUserId: string;
  isSpectator?: boolean;
  onJoinAsPlayer?: () => void;
}

interface AbandonedStats {
  wpm: number;
  precision: number;
}

export function ArenaPage({
  matchData,
  localUserId,
  isSpectator = false,
  onJoinAsPlayer,
}: ArenaPageProps) {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const otherPlayerIdsRef = useRef<string[]>([]);
  const matchDataRef = useRef(matchData);
  const socket = getSocket();
  const { emitCaretUpdate } = useCaretSync(socket);
  const textContent = useArenaStore((s) => s.textContent);
  const matchStatus = useArenaStore((s) => s.matchStatus);
  const localFinished = useArenaStore((s) => s.localFinished);
  const localFinishStats = useArenaStore((s) => s.localFinishStats);
  const matchResults = useArenaStore((s) => s.matchResults);
  const matchEndReason = useArenaStore((s) => s.matchEndReason);
  const connectionStatus = useArenaStore((s) => s.connectionStatus);
  const reconnectAttempt = useArenaStore((s) => s.reconnectAttempt);

  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandonedStats, setAbandonedStats] = useState<AbandonedStats | null>(null);

  // Determine local player's assigned color
  const localPlayerColorIndex =
    matchData.players.find((p) => p.id === localUserId)?.colorIndex ?? 0;
  const localCaretColor = PLAYER_COLORS[localPlayerColorIndex] ?? PLAYER_COLORS[0];

  // Initialize arena store on mount
  useEffect(() => {
    const data = matchDataRef.current;
    arenaStore.getState().initArena(data.textContent, data.players);
    // Spectators see ALL carets; players see all except their own
    otherPlayerIdsRef.current = isSpectator
      ? data.players.map((p) => p.id)
      : data.players.map((p) => p.id).filter((id) => id !== localUserId);

    return () => {
      arenaStore.getState().reset();
    };
  }, [localUserId, isSpectator]);

  // Listen for PLAYER_FINISH events
  useEffect(() => {
    const handlePlayerFinish = (payload: PlayerFinishPayload) => {
      if (payload.playerId === localUserId) {
        const score =
          Math.trunc(payload.wpm * 10 * (payload.precision / 100) * 100) / 100;
        arenaStore
          .getState()
          .setLocalFinishStats(payload.wpm, payload.precision, score);
      } else {
        arenaStore
          .getState()
          .updatePlayerPosition(payload.playerId, payload.position);
      }
    };
    socket.on(WS_EVENTS.PLAYER_FINISH, handlePlayerFinish);
    return () => {
      socket.off(WS_EVENTS.PLAYER_FINISH, handlePlayerFinish);
    };
  }, [socket, localUserId]);

  // Listen for MATCH_END events
  useEffect(() => {
    const handleMatchEnd = (payload: MatchEndPayload) => {
      setAbandonedStats(null);
      arenaStore
        .getState()
        .setMatchFinished(payload.results, payload.reason);
    };
    socket.on(WS_EVENTS.MATCH_END, handleMatchEnd);
    return () => {
      socket.off(WS_EVENTS.MATCH_END, handleMatchEnd);
    };
  }, [socket]);

  // Listen for PLAYER_DISCONNECTED events
  useEffect(() => {
    const handlePlayerDisconnected = (payload: PlayerDisconnectedPayload) => {
      if (payload.playerId !== localUserId) {
        arenaStore.getState().markPlayerDisconnected(payload.playerId);
      }
    };
    socket.on(WS_EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
    return () => {
      socket.off(WS_EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
    };
  }, [socket, localUserId]);

  // Listen for PLAYER_RECONNECTED events
  useEffect(() => {
    const handlePlayerReconnected = (payload: PlayerReconnectedPayload) => {
      if (payload.playerId !== localUserId) {
        arenaStore.getState().markPlayerReconnected(payload.playerId);
      }
    };
    socket.on(WS_EVENTS.PLAYER_RECONNECTED, handlePlayerReconnected);
    return () => {
      socket.off(WS_EVENTS.PLAYER_RECONNECTED, handlePlayerReconnected);
    };
  }, [socket, localUserId]);

  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handlePositionChange = useCallback(
    (position: number) => {
      if (isSpectator) return;
      arenaStore.getState().setLocalPosition(position);
      emitCaretUpdate(position);
    },
    [emitCaretUpdate, isSpectator],
  );

  const handleCountdownEnd = useCallback(() => {
    arenaStore.getState().setMatchStarted();
  }, []);

  const handleRematch = useCallback(() => {
    socket.emit(WS_EVENTS.MATCH_REMATCH);
  }, [socket]);

  const handleConfirmAbandon = useCallback(() => {
    setShowAbandonModal(false);
    const state = arenaStore.getState();
    const { totalKeystrokes, errorKeystrokes, matchStartTime, localPosition } = state;

    // Calculate partial stats locally
    const elapsedMs = matchStartTime ? Math.max(Date.now() - matchStartTime, 0) : 0;
    const elapsedMinutes = elapsedMs / 60_000;
    const wpm =
      elapsedMinutes > 0
        ? Math.trunc(((localPosition / 5) / elapsedMinutes) * 100) / 100
        : 0;
    const precision =
      totalKeystrokes > 0
        ? Math.round(((totalKeystrokes - errorKeystrokes) / totalKeystrokes) * 100)
        : 100;

    // Notify server — only if connected; skip if reconnecting to avoid lost event
    if (!socket.connected) return;
    socket.emit(WS_EVENTS.PLAYER_ABANDON, { totalKeystrokes, errorKeystrokes });

    // Show partial results
    setAbandonedStats({ wpm: Math.round(wpm), precision });
  }, [socket]);

  const isPlaying = matchStatus === 'playing';

  // Toggle body class for NavBar Focus Fade (single CSS variable controls all fade opacity)
  // Spectators never get Focus Fade — they see full UI + leaderboard
  useEffect(() => {
    if (isPlaying && !isSpectator) {
      document.body.classList.add('arena-active');
    } else {
      document.body.classList.remove('arena-active');
    }
    return () => document.body.classList.remove('arena-active');
  }, [isPlaying, isSpectator]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-4 py-8 font-sans text-text-main">
      {!isSpectator && <FocusWPMCounter matchStatus={matchStatus} />}

      {/* Perimeter UI — fades via --focus-fade-opacity during race (players only, not spectators) */}
      <div className={`w-full max-w-3xl ${isPlaying && !isSpectator ? 'focus-faded' : ''}`}>
        {/* Live leaderboard for spectators during race */}
        {isSpectator && matchStatus === 'playing' && <SpectatorLeaderboard />}
        {/* Room header / player list area — populated by future stories */}
      </div>

      {/* Canvas area — always full opacity */}
      <div className="relative w-full max-w-3xl" ref={textContainerRef}>
        {/* Countdown overlay — shown during countdown phase */}
        {matchStatus === 'countdown' && (
          <CountdownOverlay onCountdownEnd={handleCountdownEnd} />
        )}

        <LiveTextCanvas
          text={textContent}
          onPositionChange={handlePositionChange}
          isActive={isPlaying && !isSpectator}
          disabled={isSpectator || connectionStatus !== 'connected'}
          caretColor={localCaretColor}
        />

        {/* Multiplayer carets for other players */}
        {otherPlayerIdsRef.current.map((playerId) => (
          <MultiplayerCaret
            key={playerId}
            playerId={playerId}
            containerRef={textContainerRef}
          />
        ))}

        {/* Abandon button — visible but discrete, participates in Focus Fade */}
        {!isSpectator && isPlaying && !localFinished && !abandonedStats && (
          <button
            onClick={() => setShowAbandonModal(true)}
            className={`absolute right-0 top-0 -translate-y-7 text-xs text-text-muted transition-opacity hover:opacity-100 ${
              isPlaying ? 'focus-faded' : ''
            }`}
            style={{ pointerEvents: 'auto' }}
          >
            Salir
          </button>
        )}

        {/* Waiting overlay — shown when local player finished but match still ongoing (not for spectators) */}
        {!isSpectator && localFinished && matchStatus !== 'finished' && localFinishStats && (
          <WaitingForOthersOverlay
            wpm={localFinishStats.wpm}
            precision={localFinishStats.precision}
            score={localFinishStats.score}
          />
        )}

        {/* Results overlay — shown when match is finished */}
        {matchStatus === 'finished' && matchResults && matchEndReason && (
          <MatchResultsOverlay
            results={matchResults}
            localUserId={localUserId}
            reason={matchEndReason}
            onRematch={handleRematch}
            onExit={handleGoHome}
            onJoinAsPlayer={onJoinAsPlayer}
          />
        )}

        {/* Abandoned partial results overlay */}
        {abandonedStats && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl bg-surface-base/95 px-8 py-10 text-center backdrop-blur-md">
              <p className="mb-2 text-sm text-text-muted">Saliste de la partida</p>
              <p className="text-6xl font-bold text-primary">{abandonedStats.wpm}</p>
              <p className="text-lg text-text-muted">WPM</p>
              <p className="mt-2 text-2xl font-bold text-text-main">
                {abandonedStats.precision}% precisión
              </p>
              <button
                type="button"
                onClick={handleGoHome}
                autoFocus
                className="mt-6 rounded-lg bg-primary px-8 py-3 text-lg font-bold text-surface-base transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        )}

        {/* Reconnecting overlay — shown when connection lost */}
        {connectionStatus !== 'connected' && (
          <ReconnectingOverlay
            status={connectionStatus}
            attempt={reconnectAttempt}
            maxAttempts={5}
            onGoHome={handleGoHome}
          />
        )}
      </div>

      {/* Abandon confirmation modal */}
      {showAbandonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAbandonModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-base px-8 py-8 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-lg font-bold text-text-main">¿Salir de la partida?</p>
            <p className="mb-6 text-sm text-text-muted">
              Tu puntaje parcial será registrado.
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowAbandonModal(false)}
                className="rounded-lg bg-surface-raised px-6 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-main"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAbandon}
                className="rounded-lg bg-error px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
