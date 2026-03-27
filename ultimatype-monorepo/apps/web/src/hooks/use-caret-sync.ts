import { useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { WS_EVENTS, CaretSyncPayload } from '@ultimatype-monorepo/shared';
import { arenaStore } from './use-arena-store';

const THROTTLE_MS = 50; // 20Hz

export function useCaretSync(socket: Socket | null) {
  const lastEmitTimeRef = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const handleCaretSync = (data: CaretSyncPayload) => {
      arenaStore.getState().updatePlayerPosition(data.playerId, data.position);
    };

    socket.on(WS_EVENTS.CARET_SYNC, handleCaretSync);

    return () => {
      socket.off(WS_EVENTS.CARET_SYNC, handleCaretSync);
    };
  }, [socket]);

  const emitCaretUpdate = useCallback((position: number) => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastEmitTimeRef.current >= THROTTLE_MS) {
      socket.emit(WS_EVENTS.CARET_UPDATE, { position, timestamp: now });
      lastEmitTimeRef.current = now;
    }
  }, [socket]);

  return { emitCaretUpdate };
}
