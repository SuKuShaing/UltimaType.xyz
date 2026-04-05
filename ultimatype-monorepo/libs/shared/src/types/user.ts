export type AuthProvider = 'GOOGLE' | 'GITHUB';

export interface UserProfile {
  id: string;
  provider: AuthProvider;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface PublicUserProfileDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  slug: string;
  createdAt: string;
}

export interface CheckSlugResponseDto {
  available: boolean;
}
