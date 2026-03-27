import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { RoomState, WS_EVENTS, MatchStartPayload } from '@ultimatype-monorepo/shared';

interface UseLobbyReturn {
  roomState: RoomState | null;
  error: string | null;
  isConnected: boolean;
  matchStarted: boolean;
  matchData: MatchStartPayload | null;
  toggleReady: (ready: boolean) => void;
  selectLevel: (level: number) => void;
  startMatch: () => void;
  leaveRoom: () => void;
}

export function useLobby(code: string): UseLobbyReturn {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchData, setMatchData] = useState<MatchStartPayload | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      s.emit(WS_EVENTS.LOBBY_JOIN, { code });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on(WS_EVENTS.LOBBY_STATE, (state: RoomState) => {
      setRoomState(state);
      setError(null);
    });

    s.on(WS_EVENTS.LOBBY_ERROR, (data: { message: string }) => {
      setError(data.message);
    });

    s.on(WS_EVENTS.MATCH_START, (data: MatchStartPayload) => {
      setMatchData(data);
      setMatchStarted(true);
    });

    // If already connected, join immediately
    if (s.connected) {
      setIsConnected(true);
      s.emit(WS_EVENTS.LOBBY_JOIN, { code });
    }

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off(WS_EVENTS.LOBBY_STATE);
      s.off(WS_EVENTS.LOBBY_ERROR);
      s.off(WS_EVENTS.MATCH_START);
      disconnectSocket();
    };
  }, [code]);

  const toggleReady = useCallback(
    (ready: boolean) => {
      socket?.emit(WS_EVENTS.LOBBY_READY, { code, ready });
    },
    [socket, code],
  );

  const selectLevel = useCallback(
    (level: number) => {
      socket?.emit(WS_EVENTS.LOBBY_SELECT_LEVEL, { code, level });
    },
    [socket, code],
  );

  const startMatch = useCallback(() => {
    socket?.emit(WS_EVENTS.LOBBY_START, { code });
  }, [socket, code]);

  const leaveRoom = useCallback(() => {
    socket?.emit(WS_EVENTS.LOBBY_LEAVE, { code });
  }, [socket, code]);

  return {
    roomState,
    error,
    isConnected,
    matchStarted,
    matchData,
    toggleReady,
    selectLevel,
    startMatch,
    leaveRoom,
  };
}
