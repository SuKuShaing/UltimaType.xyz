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
}

interface ArenaActions {
  initArena: (
    textContent: string,
    players: Array<{ id: string; displayName: string; colorIndex: number }>,
  ) => void;
  updatePlayerPosition: (playerId: string, position: number) => void;
  setLocalPosition: (position: number) => void;
  setMatchStatus: (status: ArenaState['matchStatus']) => void;
  reset: () => void;
}

const initialState: ArenaState = {
  players: {},
  localPosition: 0,
  textContent: '',
  matchStatus: 'countdown',
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
    set({ textContent, players: playersMap, localPosition: 0, matchStatus: 'playing' });
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

  reset: () => set(initialState),
}));

// React hook for components that need reactive reads
export function useArenaStore<T>(selector: (state: ArenaState & ArenaActions) => T): T {
  return useStore(arenaStore, selector);
}
