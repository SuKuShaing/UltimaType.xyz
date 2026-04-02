import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  PaginatedResponse,
  MatchResultDto,
  MatchPeriod,
} from '@ultimatype-monorepo/shared';

interface UseMatchHistoryParams {
  page: number;
  level: number | null;
  period: MatchPeriod;
}

export function useMatchHistory({ page, level, period }: UseMatchHistoryParams) {
  return useQuery({
    queryKey: ['matches', 'history', { page, level, period }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      return apiClient<PaginatedResponse<MatchResultDto>>(`/matches?${params.toString()}`);
    },
  });
}
