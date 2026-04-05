import { useQuery } from '@tanstack/react-query';
import { UserLeaderboardPositionDto } from '@ultimatype-monorepo/shared';

export function useUserPosition(userId: string) {
  return useQuery<UserLeaderboardPositionDto | null>({
    queryKey: ['users', userId, 'position'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/position`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });
}
