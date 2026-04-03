import { describe, it, expect, vi } from 'vitest';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  describe('$queryRawUnsafe', () => {
    it('should expose $queryRawUnsafe as a public method', () => {
      expect(typeof PrismaService.prototype.$queryRawUnsafe).toBe('function');
    });

    it('should delegate $queryRawUnsafe to internal client', async () => {
      const mockResult = [{ count: 1 }];
      const mockQueryRawUnsafe = vi.fn().mockResolvedValue(mockResult);

      const service = Object.create(PrismaService.prototype) as PrismaService;
      (service as any).client = { $queryRawUnsafe: mockQueryRawUnsafe };

      const result = await service.$queryRawUnsafe('SELECT COUNT(*) FROM users');

      expect(mockQueryRawUnsafe).toHaveBeenCalledWith('SELECT COUNT(*) FROM users');
      expect(result).toEqual(mockResult);
    });

    it('should forward all positional params to internal client', async () => {
      const mockQueryRawUnsafe = vi.fn().mockResolvedValue([]);

      const service = Object.create(PrismaService.prototype) as PrismaService;
      (service as any).client = { $queryRawUnsafe: mockQueryRawUnsafe };

      await service.$queryRawUnsafe('SELECT * FROM users WHERE id = $1 AND active = $2', 'user-1', true);

      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND active = $2',
        'user-1',
        true,
      );
    });
  });
});
