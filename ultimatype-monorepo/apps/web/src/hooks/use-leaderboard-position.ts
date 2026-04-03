import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { UserLeaderboardPositionDto, MatchPeriod } from '@ultimatype-monorepo/shared';
import { useAuth } from './use-auth';

interface UseLeaderboardPositionParams {
  level: number | null;
  period: MatchPeriod;
}

export function useLeaderboardPosition({ level, period }: UseLeaderboardPositionParams) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['leaderboard', 'position', { level, period }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      const query = params.toString();
      return apiClient<UserLeaderboardPositionDto | null>(`/leaderboard/position${query ? `?${query}` : ''}`);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
