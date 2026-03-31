import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { PlayerResult, RejoinMatchState } from '@ultimatype-monorepo/shared';

interface PlayerState {
  position: number;
  displayName: string;
  colorIndex: number;
  disconnected: boolean;
}

interface ArenaState {
  players: Record<string, PlayerState>;
  localPosition: number;
  textContent: string;
  matchStatus: 'countdown' | 'playing' | 'finished';
  matchStartTime: number | null;
  totalKeystrokes: number;
  errorKeystrokes: number;
  localFinished: boolean;
  localFinishStats: { wpm: number; precision: number; score: number } | null;
  matchResults: PlayerResult[] | null;
  matchEndReason: 'all_finished' | 'timeout' | null;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  reconnectAttempt: number;
  viewingAsSpectator: boolean;
}

interface ArenaActions {
  initArena: (
    textContent: string,
    players: Array<{ id: string; displayName: string; colorIndex: number }>,
  ) => void;
  updatePlayerPosition: (playerId: string, position: number) => void;
  setLocalPosition: (position: number) => void;
  setMatchStatus: (status: ArenaState['matchStatus']) => void;
  setMatchStarted: () => void;
  incrementKeystrokes: (correct: boolean) => void;
  resetRaceMetrics: () => void;
  setLocalFinished: () => void;
  setLocalFinishStats: (wpm: number, precision: number, score: number) => void;
  setMatchFinished: (
    results: PlayerResult[],
    reason: 'all_finished' | 'timeout',
  ) => void;
  setConnectionStatus: (status: ArenaState['connectionStatus'], attempt?: number) => void;
  markPlayerDisconnected: (playerId: string) => void;
  markPlayerReconnected: (playerId: string) => void;
  switchToSpectatorView: () => void;
  restoreFromRejoin: (matchState: RejoinMatchState) => void;
  reset: () => void;
}

const initialState: ArenaState = {
  players: {},
  localPosition: 0,
  textContent: '',
  matchStatus: 'countdown',
  matchStartTime: null,
  totalKeystrokes: 0,
  errorKeystrokes: 0,
  localFinished: false,
  localFinishStats: null,
  matchResults: null,
  matchEndReason: null,
  connectionStatus: 'connected',
  reconnectAttempt: 0,
  viewingAsSpectator: false,
};

export const arenaStore = createStore<ArenaState & ArenaActions>()((set) => ({
  ...initialState,

  initArena: (textContent, players) => {
    const playersMap: Record<string, PlayerState> = {};
    for (const p of players) {
      if (!playersMap[p.id]) {
        playersMap[p.id] = {
          position: 0,
          displayName: p.displayName,
          colorIndex: p.colorIndex,
          disconnected: false,
        };
      }
    }
    set({
      textContent,
      players: playersMap,
      localPosition: 0,
      matchStatus: 'countdown',
      matchStartTime: null,
      totalKeystrokes: 0,
      errorKeystrokes: 0,
      localFinished: false,
      localFinishStats: null,
      matchResults: null,
      matchEndReason: null,
      connectionStatus: 'connected',
      reconnectAttempt: 0,
      viewingAsSpectator: false,
    });
  },

  updatePlayerPosition: (playerId, position) =>
    set((state) => {
      if (!state.players[playerId]) return state;
      return {
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], position },
        },
      };
    }),

  setLocalPosition: (position) => set({ localPosition: position }),

  setMatchStatus: (status) => set({ matchStatus: status }),

  setMatchStarted: () =>
    set((state) =>
      state.matchStatus === 'countdown'
        ? { matchStatus: 'playing', matchStartTime: Date.now() }
        : {},
    ),

  incrementKeystrokes: (correct) =>
    set((state) => ({
      totalKeystrokes: state.totalKeystrokes + 1,
      errorKeystrokes: correct ? state.errorKeystrokes : state.errorKeystrokes + 1,
    })),

  resetRaceMetrics: () =>
    set({
      matchStartTime: null,
      totalKeystrokes: 0,
      errorKeystrokes: 0,
      localFinished: false,
      localFinishStats: null,
      matchResults: null,
      matchEndReason: null,
    }),

  setLocalFinished: () => set({ localFinished: true }),

  setLocalFinishStats: (wpm, precision, score) =>
    set({ localFinishStats: { wpm, precision, score } }),

  setMatchFinished: (results, reason) =>
    set({
      matchStatus: 'finished',
      matchResults: results,
      matchEndReason: reason,
    }),

  setConnectionStatus: (status, attempt) =>
    set((state) => ({
      connectionStatus: status,
      reconnectAttempt: attempt ?? state.reconnectAttempt,
    })),

  markPlayerDisconnected: (playerId) =>
    set((state) => {
      if (!state.players[playerId]) return state;
      return {
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], disconnected: true },
        },
      };
    }),

  markPlayerReconnected: (playerId) =>
    set((state) => {
      if (!state.players[playerId]) return state;
      return {
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], disconnected: false },
        },
      };
    }),

  switchToSpectatorView: () => set({ viewingAsSpectator: true }),

  restoreFromRejoin: (matchState) =>
    set(() => {
      const playersMap: Record<string, PlayerState> = {};
      for (const p of matchState.players) {
        playersMap[p.playerId] = {
          position: p.position,
          displayName: p.displayName,
          colorIndex: p.colorIndex,
          disconnected: p.disconnected,
        };
      }
      return {
        textContent: matchState.textContent,
        players: playersMap,
        localPosition: matchState.localPosition,
        matchStatus: 'playing',
        matchStartTime: new Date(matchState.startedAt).getTime(),
        totalKeystrokes: matchState.localTotalKeystrokes,
        errorKeystrokes: matchState.localErrorKeystrokes,
        localFinished: matchState.localFinished,
        localFinishStats: null,
        matchResults: null,
        matchEndReason: null,
        connectionStatus: 'connected',
        reconnectAttempt: 0,
      };
    }),

  reset: () => set(initialState),
}));

// React hook for components that need reactive reads
export function useArenaStore<T>(selector: (state: ArenaState & ArenaActions) => T): T {
  return useStore(arenaStore, selector);
}
