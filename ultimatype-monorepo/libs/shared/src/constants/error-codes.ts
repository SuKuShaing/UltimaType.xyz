// Room error codes — single source of truth for programmatic comparisons.
// Values are the human-readable Spanish strings emitted by Redis Lua scripts.
// When i18n is added: change Lua scripts to return these keys as codes and map
// them to localised strings in the frontend.
export const ROOM_ERROR_CODES = {
  ROOM_NOT_FOUND: 'Sala no encontrada',
  ROOM_FULL: 'Sala llena',
  MATCH_STARTED: 'La partida ya ha comenzado',
  SPECTATORS_FULL: 'Sala llena de espectadores',
  ALREADY_PLAYER: 'Ya eres jugador en esta sala',
  ROLE_SWITCH_MATCH_ACTIVE: 'No puedes cambiar de rol durante una partida',
  NOT_A_PLAYER: 'No eres jugador en esta sala',
  NOT_A_SPECTATOR: 'No eres espectador en esta sala',
} as const;

export type RoomErrorCode = (typeof ROOM_ERROR_CODES)[keyof typeof ROOM_ERROR_CODES];
