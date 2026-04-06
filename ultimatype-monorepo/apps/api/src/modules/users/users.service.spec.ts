import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService, generateSlug } from './users.service';

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
    slug: 'tu-abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usersService = new UsersService(mockPrisma as any);
  });

  describe('generateSlug', () => {
    it('should generate slug with initials from two-word name', () => {
      const slug = generateSlug('Test User');
      expect(slug).toMatch(/^tu-[0-9a-f]{3}$/);
    });

    it('should generate slug with first two letters from single-word name', () => {
      const slug = generateSlug('Maria');
      expect(slug).toMatch(/^ma-[0-9a-f]{3}$/);
    });

    it('should normalize accented characters', () => {
      const slug = generateSlug('Sebastián Sanhueza');
      expect(slug).toMatch(/^ss-[0-9a-f]{3}$/);
    });

    it('should normalize ñ character', () => {
      const slug = generateSlug('Ñoño Muñoz');
      expect(slug).toMatch(/^nm-[0-9a-f]{3}$/);
    });

    it('should handle single letter name', () => {
      const slug = generateSlug('A');
      // Should pad with 'x'
      expect(slug).toMatch(/^ax-[0-9a-f]{3}$/);
    });

    it('should handle three-word name taking first two initials', () => {
      const slug = generateSlug('John Michael Doe');
      expect(slug).toMatch(/^jm-[0-9a-f]{3}$/);
    });
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

  describe('findBySlug', () => {
    it('should find user by slug (lowercase)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findBySlug('TU-ABC');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { slug: 'tu-abc' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('isSlugAvailable', () => {
    it('should return true when slug is available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await usersService.isSlugAvailable('free-slug');

      expect(result).toBe(true);
    });

    it('should return false when slug is taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'some-id' });

      const result = await usersService.isSlugAvailable('taken-slug');

      expect(result).toBe(false);
    });
  });

  describe('generateUniqueSlug', () => {
    it('should return slug on first try when available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const slug = await usersService.generateUniqueSlug('Test User');

      expect(slug).toMatch(/^tu-[0-9a-f]{3}$/);
    });

    it('should retry on collision', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);

      const slug = await usersService.generateUniqueSlug('Test User');

      expect(slug).toMatch(/^tu-[0-9a-f]{3}$/);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('create', () => {
    it('should create a new user with auto-generated slug', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // slug available
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
        data: expect.objectContaining({
          provider: 'GOOGLE',
          providerId: '123456',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          countryCode: null,
          slug: expect.stringMatching(/^tu-[0-9a-f]{3}$/),
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should create a new user with countryCode when detected', async () => {
      const mockUserWithCountry = { ...mockUser, countryCode: 'CL' };
      mockPrisma.user.findUnique.mockResolvedValue(null);
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
        data: expect.objectContaining({
          provider: 'GITHUB',
          providerId: '789',
          email: 'seba@example.com',
          displayName: 'Seba',
          avatarUrl: null,
          countryCode: 'CL',
          slug: expect.stringMatching(/^se-[0-9a-f]{3}$/),
        }),
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

  describe('updateCountryCode', () => {
    it('should update countryCode for existing user', async () => {
      const updatedUser = { ...mockUser, countryCode: 'CL' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await usersService.updateCountryCode(
        'user-uuid-123',
        'CL',
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
        data: { countryCode: 'CL' },
      });
      expect(result.countryCode).toBe('CL');
    });
  });

  describe('updateProfile', () => {
    it('should update slug when available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, slug: 'new-slug' });

      const result = await usersService.updateProfile('user-uuid-123', { slug: 'new-slug' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
        data: { slug: 'new-slug' },
      });
      expect(result.slug).toBe('new-slug');
    });

    it('should throw ConflictException when slug taken by another user', async () => {
      const error = Object.assign(new Error('Unique constraint failed on slug'), { code: 'P2002' });
      mockPrisma.user.update.mockRejectedValueOnce(error);

      await expect(
        usersService.updateProfile('user-uuid-123', { slug: 'taken-slug' }),
      ).rejects.toThrow('El slug ya está en uso');
    });

    it('should allow updating to own slug', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-uuid-123' });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await usersService.updateProfile('user-uuid-123', { slug: 'tu-abc' });

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });
});
