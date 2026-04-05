import { useQuery } from '@tanstack/react-query';
import { CheckSlugResponseDto } from '@ultimatype-monorepo/shared';

export function useCheckSlug(slug: string) {
  return useQuery({
    queryKey: ['users', 'check-slug', slug],
    queryFn: async (): Promise<CheckSlugResponseDto> => {
      const response = await fetch(`/api/users/check-slug/${slug}`);
      if (!response.ok) throw new Error('Error checking slug');
      return response.json();
    },
    enabled: /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug),
  });
}
