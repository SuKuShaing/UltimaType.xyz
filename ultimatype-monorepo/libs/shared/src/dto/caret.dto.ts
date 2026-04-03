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
  timeLimit: number;
  /** ISO string — present when the match is already in progress (late-joining spectator) */
  startedAt?: string;
}
