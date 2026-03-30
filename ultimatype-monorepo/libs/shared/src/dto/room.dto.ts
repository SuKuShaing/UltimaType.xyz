export interface PlayerInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  colorIndex: number;
  isReady: boolean;
  joinedAt: string;
  disconnected: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  level: number;
  status: 'waiting' | 'playing' | 'finished';
  players: PlayerInfo[];
  maxPlayers: number;
  timeLimit: number;
}

export interface CreateRoomResponse {
  code: string;
  link: string;
}
