export interface LeaderboardEntryDto {
  position: number;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  bestScore: number;
  avgPrecision: number;
}

export interface UserLeaderboardPositionDto {
  bestScore: number;
  bestScoreMatchCode: string;
  bestScoreDate: string;
  globalRank: number;
  globalTotal: number;
  globalPercentile: number;
  countryRank: number | null;
  countryTotal: number | null;
  countryPercentile: number | null;
  countryCode: string | null;
}
