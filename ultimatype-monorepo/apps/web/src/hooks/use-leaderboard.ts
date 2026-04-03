import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  PaginatedResponse,
  LeaderboardEntryDto,
  MatchPeriod,
} from '@ultimatype-monorepo/shared';

interface UseLeaderboardParams {
  level: number | null;
  period: MatchPeriod;
  page: number;
}

export function useLeaderboard({ level, period, page }: UseLeaderboardParams) {
  return useQuery({
    queryKey: ['leaderboard', { level, period, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      return apiClient<PaginatedResponse<LeaderboardEntryDto>>(`/leaderboard?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}
