import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';

const mockUsersService = {
  updateCountryCode: vi.fn(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new UsersController(mockUsersService as any);
  });

  describe('PATCH /users/me', () => {
    it('should update country code and return updated user', async () => {
      mockUsersService.updateCountryCode.mockResolvedValue(mockUser);
      const req = { user: { userId: 'user-uuid-123' } };

      const result = await controller.updateProfile(req, { countryCode: 'CL' });

      expect(mockUsersService.updateCountryCode).toHaveBeenCalledWith(
        'user-uuid-123',
        'CL',
      );
      expect(result).toEqual(mockUser);
    });

    it('should accept lowercase country codes and normalize them', async () => {
      const updatedUser = { ...mockUser, countryCode: 'AR' };
      mockUsersService.updateCountryCode.mockResolvedValue(updatedUser);
      const req = { user: { userId: 'user-uuid-123' } };

      const result = await controller.updateProfile(req, { countryCode: 'ar' });

      expect(mockUsersService.updateCountryCode).toHaveBeenCalledWith(
        'user-uuid-123',
        'AR',
      );
      expect(result.countryCode).toBe('AR');
    });

    it('should throw BadRequestException for invalid country code', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: 'XX' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.updateCountryCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty country code', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for 3-letter code', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: 'CHL' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when countryCode is missing (undefined)', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: undefined as any }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.updateCountryCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when countryCode is a number', async () => {
      const req = { user: { userId: 'user-uuid-123' } };

      await expect(
        controller.updateProfile(req, { countryCode: 123 as any }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.updateCountryCode).not.toHaveBeenCalled();
    });
  });
});
