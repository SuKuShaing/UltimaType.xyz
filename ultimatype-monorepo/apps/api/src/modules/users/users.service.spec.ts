import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service';

// Manual mock to avoid Prisma import chain issues
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe('UsersService', () => {
  let usersService: UsersService;

  const mockUser = {
    id: 'user-uuid-123',
    provider: 'GOOGLE',
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
    usersService = new UsersService(mockPrisma as any);
  });

  describe('findByProvider', () => {
    it('should find user by provider and providerId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findByProvider('GOOGLE', '123456');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerId: {
            provider: 'GOOGLE',
            providerId: '123456',
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByProvider(
        'GITHUB',
        'nonexistent',
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findById('user-uuid-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a new user without countryCode', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const input = {
        provider: 'GOOGLE' as const,
        providerId: '123456',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const result = await usersService.create(input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          provider: 'GOOGLE',
          providerId: '123456',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          countryCode: null,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should create a new user with countryCode when detected', async () => {
      const mockUserWithCountry = { ...mockUser, countryCode: 'CL' };
      mockPrisma.user.create.mockResolvedValue(mockUserWithCountry);

      const input = {
        provider: 'GITHUB' as const,
        providerId: '789',
        email: 'seba@example.com',
        displayName: 'Seba',
        avatarUrl: null,
        countryCode: 'CL',
      };

      const result = await usersService.create(input);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          provider: 'GITHUB',
          providerId: '789',
          email: 'seba@example.com',
          displayName: 'Seba',
          avatarUrl: null,
          countryCode: 'CL',
        },
      });
      expect(result).toEqual(mockUserWithCountry);
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await usersService.updateLastLogin('user-uuid-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });
});
