import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';

const mockUsersService = {
  updateCountryCode: vi.fn(),
  updateProfile: vi.fn(),
  isSlugAvailable: vi.fn(),
  findBySlug: vi.fn(),
  findById: vi.fn(),
};

const mockMatchResultsService = {
  findByUser: vi.fn(),
  getStats: vi.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  const mockUser = {
    id: 'user-uuid-123',
    provider: 'GOOGLE',
    providerId: '123456',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    countryCode: 'CL',
    slug: 'tu-abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new UsersController(
      mockUsersService as any,
      mockMatchResultsService as any,
    );
  });

  describe('GET /users/check-slug/:slug', () => {
    it('should return available: true for free slug', async () => {
      mockUsersService.isSlugAvailable.mockResolvedValue(true);

      const result = await controller.checkSlug('free-slug');

      expect(result).toEqual({ available: true });
      expect(mockUsersService.isSlugAvailable).toHaveBeenCalledWith('free-slug');
    });

    it('should return available: false for taken slug', async () => {
      mockUsersService.isSlugAvailable.mockResolvedValue(false);

      const result = await controller.checkSlug('taken-slug');

      expect(result).toEqual({ available: false });
    });

    it('should normalize slug to lowercase', async () => {
      mockUsersService.isSlugAvailable.mockResolvedValue(true);

      await controller.checkSlug('My-Slug');

      expect(mockUsersService.isSlugAvailable).toHaveBeenCalledWith('my-slug');
    });
  });

  describe('GET /users/by-slug/:slug', () => {
    it('should return public profile for valid slug', async () => {
      mockUsersService.findBySlug.mockResolvedValue(mockUser);

      const result = await controller.getBySlug('tu-abc');

      expect(result).toEqual({
        id: 'user-uuid-123',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        countryCode: 'CL',
        slug: 'tu-abc',
        createdAt: expect.any(String),
      });
      // Should NOT include email, provider, providerId
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('provider');
      expect(result).not.toHaveProperty('providerId');
    });

    it('should throw 404 for non-existent slug', async () => {
      mockUsersService.findBySlug.mockResolvedValue(null);

      await expect(controller.getBySlug('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update country code and return updated user', async () => {
      mockUsersService.updateProfile.mockResolvedValue(mockUser);
      const req = { user: { userId: 'user-uuid-123' } };

      const result = await controller.updateProfile(req, { countryCode: 'CL' });

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-uuid-123',
        { countryCode: 'CL' },
      );
      expect(result).toEqual(mockUser);
    });

    it('should accept lowercase country codes and normalize them', async () => {
      const updatedUser = { ...mockUser, countryCode: 'AR' };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);
      const req = { user: { userId: 'user-uuid-123' } };

      const result = await controller.updateProfile(req, { countryCode: 'ar' });

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-uuid-123',
        { countryCode: 'AR' },
      );
      expect(result.countryCode).toBe('AR');
    });

    it('should throw BadRequestException for invalid country code', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: 'XX' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.updateProfile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty country code', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update slug', async () => {
      mockUsersService.updateProfile.mockResolvedValue({ ...mockUser, slug: 'new-slug' });
      const req = { user: { userId: 'user-uuid-123' } };

      const result = await controller.updateProfile(req, { slug: 'new-slug' });

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-uuid-123',
        { slug: 'new-slug' },
      );
      expect(result.slug).toBe('new-slug');
    });

    it('should throw BadRequestException when no fields provided', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /users/:id/matches', () => {
    it('should return paginated matches for valid user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockMatchResultsService.findByUser.mockResolvedValue({
        data: [{
          id: 'mr-1',
          matchCode: 'ABC123',
          wpm: 80,
          precision: 95,
          score: 190,
          missingChars: 2,
          level: 3,
          finished: true,
          finishedAt: new Date('2026-04-01'),
          rank: 1,
          createdAt: new Date('2026-04-01'),
        }],
        total: 1,
      });

      const result = await controller.getUserMatches('user-uuid-123');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should throw 404 for non-existent user', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        controller.getUserMatches('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /users/:id/stats', () => {
    it('should return stats for valid user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockMatchResultsService.getStats.mockResolvedValue({
        avgScore: 150.5,
        avgPrecision: 92.3,
        bestScore: 210,
        totalMatches: 15,
      });

      const result = await controller.getUserStats('user-uuid-123');

      expect(result.bestScore).toBe(210);
      expect(result.totalMatches).toBe(15);
    });

    it('should throw 404 for non-existent user', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        controller.getUserStats('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
