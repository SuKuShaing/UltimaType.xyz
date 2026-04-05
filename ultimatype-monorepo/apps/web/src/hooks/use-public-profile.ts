import { useQuery } from '@tanstack/react-query';
import { PublicUserProfileDto } from '@ultimatype-monorepo/shared';

export function usePublicProfile(slug: string) {
  return useQuery({
    queryKey: ['users', 'public-profile', slug],
    queryFn: async (): Promise<PublicUserProfileDto> => {
      const response = await fetch(`/api/users/by-slug/${slug}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'not_found' : 'error');
      }
      return response.json();
    },
    enabled: !!slug,
  });
}
