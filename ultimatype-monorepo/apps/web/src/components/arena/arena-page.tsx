import { useRef, useEffect, useCallback } from 'react';
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
import {
  MatchStartPayload,
  MatchEndPayload,
  PlayerFinishPayload,
  PlayerDisconnectedPayload,
  PlayerReconnectedPayload,
  WS_EVENTS,
} from '@ultimatype-monorepo/shared';

interface ArenaPageProps {
  matchData: MatchStartPayload;
  localUserId: string;
  isSpectator?: boolean;
}

export function ArenaPage({
  matchData,
  localUserId,
  isSpectator = false,
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

  const isPlaying = matchStatus === 'playing';

  // Toggle body class for NavBar Focus Fade (single CSS variable controls all fade opacity)
  useEffect(() => {
    if (isPlaying) {
      document.body.classList.add('arena-active');
    } else {
      document.body.classList.remove('arena-active');
    }
    return () => document.body.classList.remove('arena-active');
  }, [isPlaying]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-4 py-8 font-sans text-text-main">
      <FocusWPMCounter matchStatus={matchStatus} />

      {/* Perimeter UI — fades via --focus-fade-opacity during race */}
      <div className={`w-full max-w-3xl ${isPlaying ? 'focus-faded' : ''}`}>
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
        />

        {/* Multiplayer carets for other players */}
        {otherPlayerIdsRef.current.map((playerId) => (
          <MultiplayerCaret
            key={playerId}
            playerId={playerId}
            containerRef={textContainerRef}
          />
        ))}

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
          />
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
    </div>
  );
}
