import { PlayerInfo } from './room.dto';

export interface CaretUpdatePayload {
  position: number;
  timestamp: number;
  totalKeystrokes?: number;
  errorKeystrokes?: number;
}

export interface CaretSyncPayload {
  playerId: string;
  position: number;
  timestamp: number;
}

export interface MatchStartPayload {
  code: string;
  textId: number;
  textContent: string;
  players: PlayerInfo[];
}
