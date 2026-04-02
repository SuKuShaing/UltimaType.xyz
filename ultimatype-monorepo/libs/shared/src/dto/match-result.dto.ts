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
  countryCode: string | null;
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

export interface MatchResultDto {
  id: string;
  matchCode: string;
  wpm: number;
  precision: number;
  score: number;
  missingChars: number;
  level: number;
  finished: boolean;
  finishedAt: string | null;
  rank: number;
  createdAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export type MatchPeriod = '7d' | '30d' | 'all';

export interface MatchStatsDto {
  avgWpm: number;
  bestWpm: number;
  totalMatches: number;
}
