import { useQuery } from '@tanstack/react-query';
import { MatchStatsDto, MatchPeriod } from '@ultimatype-monorepo/shared';

interface UseUserStatsParams {
  userId: string;
  level: number | null;
  period: MatchPeriod;
}

export function useUserStats({ userId, level, period }: UseUserStatsParams) {
  return useQuery({
    queryKey: ['users', userId, 'stats', { level, period }],
    queryFn: async (): Promise<MatchStatsDto> => {
      const params = new URLSearchParams();
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      const query = params.toString();
      const response = await fetch(`/api/users/${userId}/stats${query ? `?${query}` : ''}`);
      if (!response.ok) throw new Error('Error fetching user stats');
      return response.json();
    },
    enabled: !!userId,
  });
}
