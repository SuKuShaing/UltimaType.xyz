import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { PaginatedResponse, LeaderboardEntryDto } from '@ultimatype-monorepo/shared';

interface UseLeaderboardPreviewParams {
  country: string | null;
}

export function useLeaderboardPreview({ country }: UseLeaderboardPreviewParams) {
  return useQuery({
    queryKey: ['leaderboard-preview', { country }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '10' });
      if (country) params.set('country', country);
      return apiClient<PaginatedResponse<LeaderboardEntryDto>>(`/leaderboard?${params.toString()}`);
    },
    staleTime: 60_000,
  });
}
