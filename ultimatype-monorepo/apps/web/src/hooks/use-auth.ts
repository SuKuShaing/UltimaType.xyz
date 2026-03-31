import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserProfile } from '@ultimatype-monorepo/shared';
import { apiClient, setTokens, clearTokens, getAccessToken } from '../lib/api-client';

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading: isFetchingProfile,
    error,
  } = useQuery<UserProfile>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient<UserProfile>('/auth/me'),
    enabled: !!getAccessToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const isAuthenticated = !!user && !error;

  function loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  function loginWithGithub() {
    window.location.href = '/api/auth/github';
  }

  function logout() {
    clearTokens();
    queryClient.removeQueries({ queryKey: ['auth'] });
    window.location.href = '/';
  }

  const handleCallback = useCallback(async (params: URLSearchParams) => {
    const code = params.get('code');
    if (!code) return false;
    try {
      const tokens = await apiClient<{ accessToken: string; refreshToken: string }>(
        '/auth/code',
        {
          method: 'POST',
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' },
        },
      );
      setTokens(tokens);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      return true;
    } catch {
      return false;
    }
  }, [queryClient]);

  return {
    user,
    isAuthenticated,
    isFetchingProfile,
    loginWithGoogle,
    loginWithGithub,
    logout,
    handleCallback,
  };
}
