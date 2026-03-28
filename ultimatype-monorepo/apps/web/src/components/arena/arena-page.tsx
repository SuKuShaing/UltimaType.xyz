import { useRef, useEffect, useCallback } from 'react';
import { getSocket } from '../../lib/socket';
import { useCaretSync } from '../../hooks/use-caret-sync';
import { arenaStore, useArenaStore } from '../../hooks/use-arena-store';
import { LiveTextCanvas } from './live-text-canvas';
import { MultiplayerCaret } from './multiplayer-caret';
import { CountdownOverlay } from './countdown-overlay';
import { FocusWPMCounter } from './focus-wpm-counter';
import { MatchStartPayload } from '@ultimatype-monorepo/shared';

interface ArenaPageProps {
  matchData: MatchStartPayload;
  localUserId: string;
}

export function ArenaPage({ matchData, localUserId }: ArenaPageProps) {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const otherPlayerIdsRef = useRef<string[]>([]);
  // Capture matchData on first mount — the match payload never changes mid-game
  const matchDataRef = useRef(matchData);
  const socket = getSocket();
  const { emitCaretUpdate } = useCaretSync(socket);
  const textContent = useArenaStore((s) => s.textContent);
  const matchStatus = useArenaStore((s) => s.matchStatus);

  // Initialize arena store on mount; derive other player IDs once (no reactive subscription)
  useEffect(() => {
    const data = matchDataRef.current;
    arenaStore.getState().initArena(data.textContent, data.players);
    otherPlayerIdsRef.current = localUserId
      ? data.players.map((p) => p.id).filter((id) => id !== localUserId)
      : [];

    return () => {
      arenaStore.getState().reset();
    };
  }, [localUserId]);

  const handlePositionChange = useCallback((position: number) => {
    arenaStore.getState().setLocalPosition(position);
    emitCaretUpdate(position);
  }, [emitCaretUpdate]);

  const handleCountdownEnd = useCallback(() => {
    arenaStore.getState().setMatchStarted();
  }, []);

  const isPlaying = matchStatus === 'playing';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-4 py-8 font-sans text-text-main">
      <FocusWPMCounter matchStatus={matchStatus} />

      {/* Perimeter UI — fades to 15% opacity during race */}
      <div
        className="w-full max-w-3xl"
        style={{
          opacity: isPlaying ? 0.15 : 1,
          transition: 'opacity 0.5s ease',
          pointerEvents: isPlaying ? 'none' : 'auto',
        }}
      >
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
          isActive={isPlaying}
        />

        {/* Multiplayer carets for other players */}
        {otherPlayerIdsRef.current.map((playerId) => (
          <MultiplayerCaret
            key={playerId}
            playerId={playerId}
            containerRef={textContainerRef}
          />
        ))}
      </div>
    </div>
  );
}
