import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardController } from './leaderboard.controller';

function createMockService() {
  return {
    getLeaderboard: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getUserPosition: vi.fn().mockResolvedValue(null),
  };
}

describe('LeaderboardController', () => {
  let controller: LeaderboardController;
  let service: ReturnType<typeof createMockService>;

  beforeEach(() => {
    service = createMockService();
    controller = new LeaderboardController(service as any);
  });

  describe('getLeaderboard', () => {
    it('should return paginated leaderboard with defaults', async () => {
      service.getLeaderboard.mockResolvedValue({
        data: [
          { position: 1, displayName: 'Alice', avatarUrl: null, countryCode: 'AR', bestScore: 1200, avgPrecision: 98.5 },
        ],
        total: 1,
      });

      const result = await controller.getLeaderboard();

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 100, totalPages: 1 });
    });

    it('should parse valid level param', async () => {
      await controller.getLeaderboard('3');

      expect(service.getLeaderboard).toHaveBeenCalledWith(3, undefined, undefined, 1, 100);
    });

    it('should ignore invalid level param', async () => {
      await controller.getLeaderboard('9');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should parse valid period param', async () => {
      await controller.getLeaderboard(undefined, '7d');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, '7d', undefined, 1, 100);
    });

    it('should ignore invalid period param', async () => {
      await controller.getLeaderboard(undefined, 'invalid');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should pass valid 2-letter uppercase country param', async () => {
      await controller.getLeaderboard(undefined, undefined, 'AR');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, 'AR', 1, 100);
    });

    it('should ignore country param with lowercase letters', async () => {
      await controller.getLeaderboard(undefined, undefined, 'ar');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should ignore country param longer than 2 chars', async () => {
      await controller.getLeaderboard(undefined, undefined, 'ARG');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should ignore country param with arbitrary string', async () => {
      await controller.getLeaderboard(undefined, undefined, '<script>alert(1)</script>');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should parse page and limit params', async () => {
      await controller.getLeaderboard(undefined, undefined, undefined, '2', '50');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 2, 50);
    });

    it('should clamp page to minimum 1', async () => {
      await controller.getLeaderboard(undefined, undefined, undefined, '-5');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should clamp page to maximum 10 (top-1000 leaderboard cap)', async () => {
      await controller.getLeaderboard(undefined, undefined, undefined, '999999');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 10, 100);
    });

    it('should clamp limit to maximum 100', async () => {
      await controller.getLeaderboard(undefined, undefined, undefined, undefined, '500');

      expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100);
    });

    it('should handle all valid periods', async () => {
      for (const period of ['7d', '30d', '1y', 'all']) {
        await controller.getLeaderboard(undefined, period);
        expect(service.getLeaderboard).toHaveBeenCalledWith(undefined, period, undefined, 1, 100);
      }
    });

    it('should calculate totalPages correctly', async () => {
      service.getLeaderboard.mockResolvedValue({ data: [], total: 250 });

      const result = await controller.getLeaderboard(undefined, undefined, undefined, '1', '100');

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('getUserPosition', () => {
    const req = { user: { userId: 'user-1' } };

    it('should return user position with defaults', async () => {
      const position = {
        bestScore: 800,
        bestScoreMatchCode: 'ABC123',
        bestScoreDate: '2026-04-01T12:00:00.000Z',
        globalRank: 5,
        globalTotal: 100,
        globalPercentile: 96,
        countryRank: null,
        countryTotal: null,
        countryPercentile: null,
        countryCode: null,
      };
      service.getUserPosition.mockResolvedValue(position);

      const result = await controller.getUserPosition(req);

      expect(service.getUserPosition).toHaveBeenCalledWith('user-1', undefined, undefined);
      expect(result).toEqual(position);
    });

    it('should pass level and period params', async () => {
      await controller.getUserPosition(req, '3', '7d');

      expect(service.getUserPosition).toHaveBeenCalledWith('user-1', 3, '7d');
    });

    it('should return null when user has no matches', async () => {
      service.getUserPosition.mockResolvedValue(null);

      const result = await controller.getUserPosition(req);

      expect(result).toBeNull();
    });

    it('should ignore invalid level param', async () => {
      await controller.getUserPosition(req, '0');

      expect(service.getUserPosition).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('should ignore invalid period param', async () => {
      await controller.getUserPosition(req, undefined, 'weekly');

      expect(service.getUserPosition).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('should read userId from req.user.userId (not req.user.id)', async () => {
      const reqWithUserId = { user: { userId: 'specific-user-id' } };
      await controller.getUserPosition(reqWithUserId);
      expect(service.getUserPosition).toHaveBeenCalledWith('specific-user-id', undefined, undefined);
    });

    it('should NOT pass undefined when req.user only has id field (wrong field)', async () => {
      // This test documents the contract: the controller reads userId, not id.
      // If someone uses { id } instead of { userId }, the service receives undefined.
      const reqWithWrongField = { user: { id: 'wrong-field' } } as any;
      await controller.getUserPosition(reqWithWrongField);
      expect(service.getUserPosition).not.toHaveBeenCalledWith('wrong-field', undefined, undefined);
    });
  });
});
