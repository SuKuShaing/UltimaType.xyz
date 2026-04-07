export interface ActiveRoomPlayerDto {
  displayName: string;
  colorIndex: number;
  avatarUrl: string | null;
  position?: number;
}

export interface ActiveRoomDto {
  code: string;
  status: 'waiting' | 'playing';
  level: number;
  playerCount: number;
  players: ActiveRoomPlayerDto[];
  startedAt?: string;
  textLength?: number;
}
