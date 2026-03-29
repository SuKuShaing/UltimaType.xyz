export interface PlayerFinishPayload {
  playerId: string;
  displayName: string;
  colorIndex: number;
  position: number;
  wpm: number;
  precision: number;
  finishedAt: string;
}

export interface PlayerResult {
  playerId: string;
  displayName: string;
  colorIndex: number;
  rank: number;
  wpm: number;
  precision: number;
  score: number;
  missingChars: number;
  finished: boolean;
  finishedAt: string | null;
}

export interface MatchEndPayload {
  roomCode: string;
  results: PlayerResult[];
  reason: 'all_finished' | 'timeout';
}

export interface PlayerFinishClientPayload {
  totalKeystrokes: number;
  errorKeystrokes: number;
}
