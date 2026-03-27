// Eventos Client → Server
export const WS_EVENTS = {
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_READY: 'lobby:ready',
  LOBBY_SELECT_LEVEL: 'lobby:select-level',
  LOBBY_START: 'lobby:start',
  // Server → Client
  LOBBY_STATE: 'lobby:state',
  LOBBY_ERROR: 'lobby:error',
  MATCH_START: 'match:start',
} as const;
