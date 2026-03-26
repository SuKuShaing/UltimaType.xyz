import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, setTokens, clearTokens, getAccessToken } from '../lib/api-client';

interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
}

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

  function handleCallback(params: URLSearchParams) {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      return true;
    }
    return false;
  }

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
