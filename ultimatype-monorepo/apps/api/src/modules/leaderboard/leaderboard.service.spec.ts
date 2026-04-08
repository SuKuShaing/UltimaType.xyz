import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardService } from './leaderboard.service';

function createMockPrisma() {
  return {
    $queryRawUnsafe: vi.fn(),
    matchResult: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
}

function createMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(0),
  };
}

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    service = new LeaderboardService(prisma as any, redis as any);
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard entries without filters', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { userId: 'user-alice', displayName: 'Alice', avatarUrl: 'http://a.com/1.jpg', countryCode: 'AR', slug: 'alice', bestScore: 1200, bestScoreLevel: 3, bestScorePrecision: 98.5, bestScoreMatchCode: 'ABC123' },
          { userId: 'user-bob', displayName: 'Bob', avatarUrl: null, countryCode: 'CL', slug: 'bob', bestScore: 1100, bestScoreLevel: 2, bestScorePrecision: 95.0, bestScoreMatchCode: 'DEF456' },
        ])
        .mockResolvedValueOnce([{ total: BigInt(2) }]);

      const result = await service.getLeaderboard();

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        userId: 'user-alice',
        position: 1,
        displayName: 'Alice',
        avatarUrl: 'http://a.com/1.jpg',
        countryCode: 'AR',
        slug: 'alice',
        bestScore: 1200,
        bestScoreLevel: 3,
        bestScorePrecision: 98.5,
        bestScoreMatchCode: 'ABC123',
      });
      expect(result.data[1].position).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should apply level filter', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await service.getLeaderboard(3);

      const dataQuery = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(dataQuery).toContain('mr.level = $1');
    });

    it('should apply period filter', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await service.getLeaderboard(undefined, '7d');

      const dataQuery = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(dataQuery).toContain('mr.created_at >= $1');
    });

    it('should apply country filter', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await service.getLeaderboard(undefined, undefined, 'AR');

      const dataQuery = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(dataQuery).toContain('u.country_code = $1');
    });

    it('should apply all filters combined', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await service.getLeaderboard(2, '30d', 'CL');

      const dataQuery = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(dataQuery).toContain('mr.level = $1');
      expect(dataQuery).toContain('mr.created_at >= $2');
      expect(dataQuery).toContain('u.country_code = $3');
    });

    it('should return cached data on cache hit', async () => {
      const cachedData = { data: [{ position: 1, displayName: 'Cached', avatarUrl: null, countryCode: null, bestScore: 999, bestScorePrecision: 99 }], total: 1 };
      redis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getLeaderboard();

      expect(result).toEqual(cachedData);
      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('should set cache after fetching from database', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await service.getLeaderboard();

      expect(redis.set).toHaveBeenCalledWith(
        'leaderboard:level:ALL:country:ALL:period:all:page:1:limit:100',
        expect.any(String),
        43200,
      );
    });

    it('should handle pagination correctly', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { userId: 'user-page2', displayName: 'Page2User', avatarUrl: null, countryCode: null, bestScore: 500, bestScorePrecision: 80, bestScoreMatchCode: 'P2M001' },
        ])
        .mockResolvedValueOnce([{ total: BigInt(150) }]);

      const result = await service.getLeaderboard(undefined, undefined, undefined, 2, 100);

      expect(result.data[0].position).toBe(101);
      expect(result.total).toBe(150);
    });

    it('should gracefully handle Redis get failure', async () => {
      redis.get.mockRejectedValue(new Error('Redis down'));
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      const result = await service.getLeaderboard();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should gracefully handle Redis set failure', async () => {
      redis.set.mockRejectedValue(new Error('Redis down'));
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { userId: 'user-test', displayName: 'Test', avatarUrl: null, countryCode: null, bestScore: 100, bestScorePrecision: 90, bestScoreMatchCode: 'TST001' },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await service.getLeaderboard();

      expect(result.data).toHaveLength(1);
    });

    it('should use correct cache key with filters', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await service.getLeaderboard(3, '7d', 'AR');

      expect(redis.set).toHaveBeenCalledWith(
        'leaderboard:level:3:country:AR:period:7d:page:1:limit:100',
        expect.any(String),
        43200,
      );
    });
  });

  describe('getUserPosition', () => {
    it('should return null when user has no matches', async () => {
      prisma.matchResult.findFirst.mockResolvedValue(null);

      const result = await service.getUserPosition('user-1');

      expect(result).toBeNull();
    });

    it('should return global position for user without country', async () => {
      prisma.matchResult.findFirst.mockResolvedValue({
        score: 800,
        matchCode: 'ABC123',
        createdAt: new Date('2026-04-01T12:00:00Z'),
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ rank: BigInt(5) }])   // global rank
        .mockResolvedValueOnce([{ total: BigInt(100) }]); // global total
      prisma.user.findUnique.mockResolvedValue({ countryCode: null });

      const result = await service.getUserPosition('user-1');

      expect(result).not.toBeNull();
      expect(result!.bestScore).toBe(800);
      expect(result!.bestScoreMatchCode).toBe('ABC123');
      expect(result!.globalRank).toBe(5);
      expect(result!.globalTotal).toBe(100);
      expect(result!.globalPercentile).toBe(5);
      expect(result!.countryRank).toBeNull();
      expect(result!.countryTotal).toBeNull();
      expect(result!.countryPercentile).toBeNull();
      expect(result!.countryCode).toBeNull();
    });

    it('should return global and country position for user with country', async () => {
      prisma.matchResult.findFirst.mockResolvedValue({
        score: 1000,
        matchCode: 'XYZ789',
        createdAt: new Date('2026-04-02T10:00:00Z'),
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ rank: BigInt(3) }])    // global rank
        .mockResolvedValueOnce([{ total: BigInt(50) }])   // global total
        .mockResolvedValueOnce([{ rank: BigInt(1) }])    // country rank
        .mockResolvedValueOnce([{ total: BigInt(10) }]); // country total
      prisma.user.findUnique.mockResolvedValue({ countryCode: 'AR' });

      const result = await service.getUserPosition('user-2');

      expect(result!.globalRank).toBe(3);
      expect(result!.globalTotal).toBe(50);
      expect(result!.globalPercentile).toBe(6);
      expect(result!.countryRank).toBe(1);
      expect(result!.countryTotal).toBe(10);
      expect(result!.countryPercentile).toBe(10);
      expect(result!.countryCode).toBe('AR');
    });

    it('should apply level filter to position query', async () => {
      prisma.matchResult.findFirst.mockResolvedValue({
        score: 500,
        matchCode: 'LVL3',
        createdAt: new Date('2026-04-01T00:00:00Z'),
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ rank: BigInt(1) }])
        .mockResolvedValueOnce([{ total: BigInt(5) }]);
      prisma.user.findUnique.mockResolvedValue({ countryCode: null });

      await service.getUserPosition('user-1', 3);

      expect(prisma.matchResult.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ level: 3 }),
        }),
      );
      const rankQuery = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(rankQuery).toContain('mr.level = $1');
    });

    it('should apply period filter to position query', async () => {
      prisma.matchResult.findFirst.mockResolvedValue({
        score: 500,
        matchCode: 'P7D',
        createdAt: new Date('2026-04-01T00:00:00Z'),
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ rank: BigInt(1) }])
        .mockResolvedValueOnce([{ total: BigInt(5) }]);
      prisma.user.findUnique.mockResolvedValue({ countryCode: null });

      await service.getUserPosition('user-1', undefined, '7d');

      expect(prisma.matchResult.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should calculate percentile correctly for #1 position', async () => {
      prisma.matchResult.findFirst.mockResolvedValue({
        score: 9999,
        matchCode: 'TOP',
        createdAt: new Date('2026-04-01T00:00:00Z'),
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ rank: BigInt(1) }])
        .mockResolvedValueOnce([{ total: BigInt(200) }]);
      prisma.user.findUnique.mockResolvedValue({ countryCode: null });

      const result = await service.getUserPosition('user-top');

      expect(result!.globalRank).toBe(1);
      expect(result!.globalPercentile).toBe(1);
    });
  });

  describe('invalidateForLevel', () => {
    it('should delete level-specific and ALL keys', async () => {
      redis.keys
        .mockResolvedValueOnce([
          'leaderboard:level:3:country:ALL:period:all:page:1:limit:100',
          'leaderboard:level:3:country:AR:period:7d:page:1:limit:100',
        ])
        .mockResolvedValueOnce([
          'leaderboard:level:ALL:country:ALL:period:all:page:1:limit:100',
        ]);

      await service.invalidateForLevel(3);

      expect(redis.keys).toHaveBeenCalledWith('leaderboard:level:3:*');
      expect(redis.keys).toHaveBeenCalledWith('leaderboard:level:ALL:*');
      expect(redis.del).toHaveBeenCalledWith(
        'leaderboard:level:3:country:ALL:period:all:page:1:limit:100',
        'leaderboard:level:3:country:AR:period:7d:page:1:limit:100',
        'leaderboard:level:ALL:country:ALL:period:all:page:1:limit:100',
      );
    });

    it('should not call del when no keys match', async () => {
      redis.keys.mockResolvedValue([]);

      await service.invalidateForLevel(5);

      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should throw when redis.keys fails', async () => {
      redis.keys.mockRejectedValue(new Error('Redis SCAN failed'));

      await expect(service.invalidateForLevel(2)).rejects.toThrow('Redis SCAN failed');
    });

    it('should throw when redis.del fails', async () => {
      redis.keys
        .mockResolvedValueOnce(['leaderboard:level:1:country:ALL:period:all:page:1:limit:100'])
        .mockResolvedValueOnce([]);
      redis.del.mockRejectedValue(new Error('Redis DEL failed'));

      await expect(service.invalidateForLevel(1)).rejects.toThrow('Redis DEL failed');
    });
  });
});
