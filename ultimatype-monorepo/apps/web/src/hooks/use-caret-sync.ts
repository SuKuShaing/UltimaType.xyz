import { useCallback, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { WS_EVENTS, CaretSyncPayload } from '@ultimatype-monorepo/shared';
import { arenaStore } from './use-arena-store';

const THROTTLE_MS = 50; // 20Hz — protección de carga de servidor con múltiples usuarios

export function useCaretSync(socket: Socket | null) {
  const lastEmitTimeRef = useRef(0);
  const pendingEmitRef = useRef<{ position: number; timer: ReturnType<typeof setTimeout> } | null>(null);

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

  // Cleanup trailing timer on unmount
  useEffect(() => {
    return () => {
      if (pendingEmitRef.current) {
        clearTimeout(pendingEmitRef.current.timer);
        pendingEmitRef.current = null;
      }
    };
  }, []);

  const emitCaretUpdate = useCallback((position: number) => {
    if (!socket) return;
    const now = Date.now();
    const elapsed = now - lastEmitTimeRef.current;

    if (elapsed >= THROTTLE_MS) {
      // Emit immediately (leading edge)
      if (pendingEmitRef.current) {
        clearTimeout(pendingEmitRef.current.timer);
        pendingEmitRef.current = null;
      }
      const { totalKeystrokes, errorKeystrokes } = arenaStore.getState();
      socket.emit(WS_EVENTS.CARET_UPDATE, { position, timestamp: now, totalKeystrokes, errorKeystrokes });
      lastEmitTimeRef.current = now;
    } else {
      // Schedule trailing emit so the last position is always sent
      if (pendingEmitRef.current) {
        clearTimeout(pendingEmitRef.current.timer);
      }
      const remaining = THROTTLE_MS - elapsed;
      const timer = setTimeout(() => {
        pendingEmitRef.current = null;
        const emitTime = Date.now();
        const { totalKeystrokes, errorKeystrokes } = arenaStore.getState();
        socket.emit(WS_EVENTS.CARET_UPDATE, { position, timestamp: emitTime, totalKeystrokes, errorKeystrokes });
        lastEmitTimeRef.current = emitTime;
      }, remaining);
      pendingEmitRef.current = { position, timer };
    }
  }, [socket]);

  return { emitCaretUpdate };
}
