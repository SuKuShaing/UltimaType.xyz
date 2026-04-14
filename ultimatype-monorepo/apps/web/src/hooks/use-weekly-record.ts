import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { PaginatedResponse, LeaderboardEntryDto } from '@ultimatype-monorepo/shared';

export function useWeeklyRecord() {
  return useQuery({
    queryKey: ['weekly-record'],
    queryFn: async () => {
      const result = await apiClient<PaginatedResponse<LeaderboardEntryDto>>(
        '/leaderboard?period=7d&limit=1'
      );
      return result.data[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
