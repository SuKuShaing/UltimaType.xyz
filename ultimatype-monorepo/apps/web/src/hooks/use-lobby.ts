import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { arenaStore } from './use-arena-store';
import {
  RoomState,
  WS_EVENTS,
  MatchStartPayload,
  RejoinStatePayload,
} from '@ultimatype-monorepo/shared';

interface UseLobbyReturn {
  roomState: RoomState | null;
  error: string | null;
  isConnected: boolean;
  matchStarted: boolean;
  matchData: MatchStartPayload | null;
  toggleReady: (ready: boolean) => void;
  selectLevel: (level: number) => void;
  setTimeLimit: (timeLimit: number) => void;
  setMaxPlayers: (maxPlayers: number) => void;
  startMatch: () => void;
  leaveRoom: () => void;
  resetMatch: () => void;
}

export function useLobby(code: string): UseLobbyReturn {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchData, setMatchData] = useState<MatchStartPayload | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const matchStartedRef = useRef(false);
  const pendingRejoinRef = useRef<string | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    matchStartedRef.current = matchStarted;
  }, [matchStarted]);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);

    let rejoinHandler: ((payload: RejoinStatePayload) => void) | null = null;

    const handleConnect = () => {
      setIsConnected(true);

      if (pendingRejoinRef.current) {
        // Reconnection — emit LOBBY_REJOIN instead of LOBBY_JOIN
        rejoinHandler = (payload: RejoinStatePayload) => {
          rejoinHandler = null;
          setRoomState(payload.roomState);
          if (payload.matchState) {
            arenaStore.getState().restoreFromRejoin(payload.matchState);
            setMatchData({
              code: payload.roomCode,
              textId: Number(payload.matchState.textId),
              textContent: payload.matchState.textContent,
              players: payload.roomState.players,
            } as MatchStartPayload);
            setMatchStarted(true);
          }
          arenaStore.getState().setConnectionStatus('connected');
          pendingRejoinRef.current = null;
        };
        s.once(WS_EVENTS.REJOIN_STATE, rejoinHandler);
        s.emit(WS_EVENTS.LOBBY_REJOIN, { roomCode: pendingRejoinRef.current });
      } else if (!hasJoinedRef.current) {
        // First connection — emit LOBBY_JOIN
        s.emit(WS_EVENTS.LOBBY_JOIN, { code });
        hasJoinedRef.current = true;
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      pendingRejoinRef.current = code;
      arenaStore.getState().setConnectionStatus('reconnecting', 0);
    };

    const handleReconnectAttempt = (attempt: number) => {
      arenaStore.getState().setConnectionStatus('reconnecting', attempt);
    };
    const handleReconnectFailed = () => {
      arenaStore.getState().setConnectionStatus('disconnected');
      pendingRejoinRef.current = null;
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    s.io.on('reconnect_attempt', handleReconnectAttempt);
    s.io.on('reconnect_failed', handleReconnectFailed);

    s.on(WS_EVENTS.LOBBY_STATE, (state: RoomState) => {
      setRoomState(state);
      setError(null);
      // Reset match state when room returns to waiting (rematch)
      if (state.status === 'waiting' && matchStartedRef.current) {
        setMatchStarted(false);
        setMatchData(null);
      }
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
      if (!hasJoinedRef.current) {
        s.emit(WS_EVENTS.LOBBY_JOIN, { code });
        hasJoinedRef.current = true;
      }
    }

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.io.off('reconnect_attempt', handleReconnectAttempt);
      s.io.off('reconnect_failed', handleReconnectFailed);
      s.off(WS_EVENTS.LOBBY_STATE);
      s.off(WS_EVENTS.LOBBY_ERROR);
      s.off(WS_EVENTS.MATCH_START);
      if (rejoinHandler) s.off(WS_EVENTS.REJOIN_STATE, rejoinHandler);
      hasJoinedRef.current = false;
      pendingRejoinRef.current = null;
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const setTimeLimit = useCallback(
    (timeLimit: number) => {
      socket?.emit(WS_EVENTS.LOBBY_SET_TIME_LIMIT, { code, timeLimit });
    },
    [socket, code],
  );

  const setMaxPlayers = useCallback(
    (maxPlayers: number) => {
      socket?.emit(WS_EVENTS.LOBBY_SET_MAX_PLAYERS, { code, maxPlayers });
    },
    [socket, code],
  );

  const startMatch = useCallback(() => {
    socket?.emit(WS_EVENTS.LOBBY_START, { code });
  }, [socket, code]);

  const leaveRoom = useCallback(() => {
    socket?.emit(WS_EVENTS.LOBBY_LEAVE, { code });
  }, [socket, code]);

  const resetMatch = useCallback(() => {
    setMatchStarted(false);
    setMatchData(null);
  }, []);

  return {
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
    resetMatch,
  };
}
