export interface LeaderboardEntryDto {
  userId: string;
  position: number;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  slug: string;
  bestScore: number;
  bestScoreLevel: number;
  bestScorePrecision: number;
  bestScoreMatchCode: string;
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

export interface HypotheticalRankDto {
  globalRank: number;
  globalTotal: number;
  countryRank: number | null;
  countryTotal: number | null;
  countryCode: string | null;
}
