// Eventos Client → Server
export const WS_EVENTS = {
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_READY: 'lobby:ready',
  LOBBY_SELECT_LEVEL: 'lobby:select-level',
  LOBBY_START: 'lobby:start',
  LOBBY_SET_TIME_LIMIT: 'lobby:set-time-limit',
  LOBBY_SET_MAX_PLAYERS: 'lobby:set-max-players',
  // Spectator: Client → Server
  LOBBY_SPECTATE: 'lobby:spectate',
  LOBBY_SWITCH_TO_SPECTATOR: 'lobby:switch-to-spectator',
  LOBBY_SWITCH_TO_PLAYER: 'lobby:switch-to-player',
  // Server → Client
  LOBBY_STATE: 'lobby:state',
  LOBBY_AUTO_SPECTATE: 'lobby:auto-spectate',
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
