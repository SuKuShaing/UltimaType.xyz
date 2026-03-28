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
  // Caret sync: Client → Server
  CARET_UPDATE: 'caret:update',
  // Caret sync: Server → Client
  CARET_SYNC: 'caret:sync',
  // Match lifecycle: Client → Server
  PLAYER_FINISH: 'player:finish', // también emitido Server → Client (broadcast de finish individual)
  MATCH_REMATCH: 'match:rematch',
  // Match lifecycle: Server → Client
  MATCH_END: 'match:end',
  // Reconnection: Client → Server
  LOBBY_REJOIN: 'lobby:rejoin',
  // Reconnection: Server → Client (direct response to rejoining socket)
  REJOIN_STATE: 'rejoin:state',
  // Disconnection: Server → Client (broadcast)
  PLAYER_DISCONNECTED: 'player:disconnected',
  PLAYER_RECONNECTED: 'player:reconnected',
} as const;
