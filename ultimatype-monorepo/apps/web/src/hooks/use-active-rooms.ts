import { useQuery } from '@tanstack/react-query';
import { ActiveRoomDto } from '@ultimatype-monorepo/shared';
import { apiClient } from '../lib/api-client';

export function useActiveRooms() {
  return useQuery({
    queryKey: ['active-rooms'],
    queryFn: () => apiClient<{ rooms: ActiveRoomDto[] }>('/rooms/active'),
    refetchInterval: 4000,
    staleTime: 3000,
  });
}
