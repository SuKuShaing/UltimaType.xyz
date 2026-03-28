import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

interface PlayerState {
  position: number;
  displayName: string;
  colorIndex: number;
}

interface ArenaState {
  players: Record<string, PlayerState>;
  localPosition: number;
  textContent: string;
  matchStatus: 'countdown' | 'playing' | 'finished';
  matchStartTime: number | null;
  totalKeystrokes: number;
  errorKeystrokes: number;
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
    set({ matchStartTime: null, totalKeystrokes: 0, errorKeystrokes: 0 }),

  reset: () => set(initialState),
}));

// React hook for components that need reactive reads
export function useArenaStore<T>(selector: (state: ArenaState & ArenaActions) => T): T {
  return useStore(arenaStore, selector);
}
