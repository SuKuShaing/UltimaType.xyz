import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, OAuthUserInput } from './auth.service';

// Manual mocks to avoid NestJS DI import chain issues with Prisma
const mockUsersService = {
  findByProvider: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateLastLogin: vi.fn(),
  updateCountryCode: vi.fn(),
};

const mockJwtService = {
  signAsync: vi.fn().mockResolvedValue('mock-token'),
};

const configValues: Record<string, string> = {
  JWT_SECRET: 'test-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EXPIRATION: '24h',
  JWT_REFRESH_EXPIRATION: '7d',
};

const mockConfigService = {
  get: vi.fn((key: string, defaultValue?: string) => configValues[key] ?? defaultValue),
  getOrThrow: vi.fn((key: string) => {
    const value = configValues[key];
    if (!value) throw new Error(`Config key "${key}" not found`);
    return value;
  }),
};

const mockGeoService = {
  getCountryCode: vi.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 'user-uuid-123',
    provider: 'GOOGLE' as const,
    providerId: '123456',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    countryCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(
      mockUsersService as any,
      mockJwtService as any,
      mockConfigService as any,
      mockGeoService as any,
    );
  });

  describe('validateOAuthUser', () => {
    const oauthInput: OAuthUserInput = {
      provider: 'GOOGLE',
      providerId: '123456',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('should return existing user and update lastLoginAt without calling geo when country exists', async () => {
      const userWithCountry = { ...mockUser, countryCode: 'CL' };
      mockUsersService.findByProvider.mockResolvedValue(userWithCountry);
      mockUsersService.updateLastLogin.mockResolvedValue(userWithCountry);

      const result = await authService.validateOAuthUser(oauthInput, 'AR');

      expect(mockUsersService.findByProvider).toHaveBeenCalledWith('GOOGLE', '123456');
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(userWithCountry.id);
      expect(mockGeoService.getCountryCode).not.toHaveBeenCalled();
      expect(mockUsersService.updateCountryCode).not.toHaveBeenCalled();
      expect(result).toEqual(userWithCountry);
    });

    it('should retroactively set country for existing user with null countryCode', async () => {
      mockUsersService.findByProvider.mockResolvedValue(mockUser);
      mockGeoService.getCountryCode.mockReturnValue('AR');
      mockUsersService.updateCountryCode.mockResolvedValue({ ...mockUser, countryCode: 'AR' });
      mockUsersService.updateLastLogin.mockResolvedValue({ ...mockUser, countryCode: 'AR' });

      await authService.validateOAuthUser(oauthInput, 'AR');

      expect(mockGeoService.getCountryCode).toHaveBeenCalledWith('AR');
      expect(mockUsersService.updateCountryCode).toHaveBeenCalledWith(mockUser.id, 'AR');
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should not update country for existing user when geo returns null', async () => {
      mockUsersService.findByProvider.mockResolvedValue(mockUser);
      mockGeoService.getCountryCode.mockReturnValue(null);
      mockUsersService.updateLastLogin.mockResolvedValue(mockUser);

      await authService.validateOAuthUser(oauthInput, 'XX');

      expect(mockGeoService.getCountryCode).toHaveBeenCalledWith('XX');
      expect(mockUsersService.updateCountryCode).not.toHaveBeenCalled();
    });

    it('should create new user with detected country from CF-IPCountry', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockGeoService.getCountryCode.mockReturnValue('CL');
      const mockUserWithCountry = { ...mockUser, countryCode: 'CL' };
      mockUsersService.create.mockResolvedValue(mockUserWithCountry);

      const result = await authService.validateOAuthUser(oauthInput, 'CL');

      expect(mockGeoService.getCountryCode).toHaveBeenCalledWith('CL');
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...oauthInput,
        countryCode: 'CL',
      });
      expect(result).toEqual(mockUserWithCountry);
    });

    it('should create new user with null countryCode when no header provided', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockGeoService.getCountryCode.mockReturnValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await authService.validateOAuthUser(oauthInput);

      expect(mockGeoService.getCountryCode).toHaveBeenCalledWith(undefined);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...oauthInput,
        countryCode: null,
      });
      expect(result).toEqual(mockUser);
    });

    it('should create new user with null countryCode when geo returns null (XX)', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockGeoService.getCountryCode.mockReturnValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await authService.validateOAuthUser(oauthInput, 'XX');

      expect(mockGeoService.getCountryCode).toHaveBeenCalledWith('XX');
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...oauthInput,
        countryCode: null,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.generateTokens({
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshTokens', () => {
    it('should generate new tokens for valid user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await authService.refreshTokens('user-uuid-123');

      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-123');
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        authService.refreshTokens('nonexistent-id'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
