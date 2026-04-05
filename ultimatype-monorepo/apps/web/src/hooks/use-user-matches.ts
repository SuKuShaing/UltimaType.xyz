import { useQuery } from '@tanstack/react-query';
import {
  PaginatedResponse,
  MatchResultDto,
  MatchPeriod,
} from '@ultimatype-monorepo/shared';

interface UseUserMatchesParams {
  userId: string;
  page: number;
  level: number | null;
  period: MatchPeriod;
}

export function useUserMatches({ userId, page, level, period }: UseUserMatchesParams) {
  return useQuery({
    queryKey: ['users', userId, 'matches', { page, level, period }],
    queryFn: async (): Promise<PaginatedResponse<MatchResultDto>> => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      const response = await fetch(`/api/users/${userId}/matches?${params.toString()}`);
      if (!response.ok) throw new Error('Error fetching user matches');
      return response.json();
    },
    enabled: !!userId,
  });
}
