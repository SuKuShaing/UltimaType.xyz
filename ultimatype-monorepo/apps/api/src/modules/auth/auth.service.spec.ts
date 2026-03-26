import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, OAuthUserInput } from './auth.service';

// Manual mocks to avoid NestJS DI import chain issues with Prisma
const mockUsersService = {
  findByProvider: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateLastLogin: vi.fn(),
};

const mockJwtService = {
  signAsync: vi.fn().mockResolvedValue('mock-token'),
};

const mockConfigService = {
  get: vi.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRATION: '24h',
      JWT_REFRESH_EXPIRATION: '7d',
    };
    return config[key] ?? defaultValue;
  }),
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

    it('should return existing user and update lastLoginAt', async () => {
      mockUsersService.findByProvider.mockResolvedValue(mockUser);
      mockUsersService.updateLastLogin.mockResolvedValue(mockUser);

      const result = await authService.validateOAuthUser(oauthInput);

      expect(mockUsersService.findByProvider).toHaveBeenCalledWith(
        'GOOGLE',
        '123456',
      );
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual(mockUser);
    });

    it('should create new user if not found', async () => {
      mockUsersService.findByProvider.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await authService.validateOAuthUser(oauthInput);

      expect(mockUsersService.create).toHaveBeenCalledWith(oauthInput);
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
