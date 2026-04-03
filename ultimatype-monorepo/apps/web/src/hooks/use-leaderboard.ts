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
  country: string | null;
  page: number;
}

export function useLeaderboard({ level, period, country, page }: UseLeaderboardParams) {
  return useQuery({
    queryKey: ['leaderboard', { level, period, country, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      if (country) params.set('country', country);
      return apiClient<PaginatedResponse<LeaderboardEntryDto>>(`/leaderboard?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}
