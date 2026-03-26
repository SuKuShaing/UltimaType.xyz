export type AuthProvider = 'GOOGLE' | 'GITHUB';

export interface UserProfile {
  id: string;
  provider: AuthProvider;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}
