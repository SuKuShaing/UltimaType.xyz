import { RoomState } from './room.dto';

export interface LobbyRejoinPayload {
  roomCode: string;
}

export interface RejoinMatchState {
  textContent: string;
  textId: string;
  startedAt: string; // ISO 8601
  localPosition: number;
  localErrors: number;
  localTotalKeystrokes: number;
  localErrorKeystrokes: number;
  localFinished: boolean;
  localFinishedAt: string | null;
  players: RejoinPlayerState[];
}

export interface RejoinPlayerState {
  playerId: string;
  displayName: string;
  colorIndex: number;
  position: number;
  finished: boolean;
  disconnected: boolean;
}

export interface RejoinStatePayload {
  roomCode: string;
  roomState: RoomState;
  matchState: RejoinMatchState | null;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  roomCode: string;
}

export interface PlayerReconnectedPayload {
  playerId: string;
  roomCode: string;
}
