import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { MatchStatsDto, MatchPeriod } from '@ultimatype-monorepo/shared';

interface UseMatchStatsParams {
  level: number | null;
  period: MatchPeriod;
}

export function useMatchStats({ level, period }: UseMatchStatsParams) {
  return useQuery({
    queryKey: ['matches', 'stats', { level, period }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      const query = params.toString();
      return apiClient<MatchStatsDto>(`/matches/stats${query ? `?${query}` : ''}`);
    },
  });
}
