import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { MatchDetailDto } from '@ultimatype-monorepo/shared';

export function useMatchDetail(matchCode: string) {
  return useQuery({
    queryKey: ['matches', 'detail', matchCode],
    queryFn: () => apiClient<MatchDetailDto>(`/matches/${matchCode}`),
  });
}
