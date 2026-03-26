export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfileResponse {
  id: string;
  provider: 'GOOGLE' | 'GITHUB';
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  createdAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
