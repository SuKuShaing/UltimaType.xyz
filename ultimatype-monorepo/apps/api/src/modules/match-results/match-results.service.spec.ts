import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchResultsService } from './match-results.service';
import { PlayerResult } from '@ultimatype-monorepo/shared';

const mockPrisma = {
  user: {
    findMany: vi.fn(),
  },
  matchResult: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    findFirst: vi.fn(),
  },
};

const mockLeaderboardService = {
  invalidateForLevel: vi.fn().mockResolvedValue(undefined),
};

describe('MatchResultsService', () => {
  let service: MatchResultsService;

  const makeResult = (overrides: Partial<PlayerResult> = {}): PlayerResult => ({
    playerId: 'user-uuid-1',
    displayName: 'Player 1',
    colorIndex: 0,
    countryCode: 'AR',
    rank: 1,
    wpm: 85.5,
    precision: 97,
    score: 829.35,
    missingChars: 0,
    finished: true,
    finishedAt: '2026-04-02T12:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.matchResult.findFirst.mockResolvedValue(null);
    service = new MatchResultsService(mockPrisma as any, mockLeaderboardService as any);
  });

  describe('persistResults', () => {
    it('persiste resultados para jugadores registrados', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-uuid-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [makeResult()];
      await service.persistResults('ABC123', 3, results);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-uuid-1'] } },
        select: { id: true },
      });
      expect(mockPrisma.matchResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchCode: 'ABC123',
          userId: 'user-uuid-1',
          wpm: 85.5,
          precision: 97,
          score: 829.35,
          missingChars: 0,
          level: 3,
          finished: true,
          rank: 1,
        }),
      });
    });

    it('filtra guests (sin userId válido en DB)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-uuid-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [
        makeResult({ playerId: 'user-uuid-1' }),
        makeResult({ playerId: 'guest-abc-123', rank: 2 }),
      ];
      await service.persistResults('ABC123', 3, results);

      expect(mockPrisma.matchResult.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.matchResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-uuid-1' }),
      });
    });

    it('no persiste nada si todos son guests', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const results = [makeResult({ playerId: 'guest-1' })];
      await service.persistResults('ABC123', 3, results);

      expect(mockPrisma.matchResult.create).not.toHaveBeenCalled();
    });

    it('no lanza excepcion si un insert falla — persiste los demás', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrisma.matchResult.create
        .mockRejectedValueOnce(new Error('FK violation'))
        .mockResolvedValueOnce({ id: 'r2' });

      const results = [
        makeResult({ playerId: 'user-1', rank: 1 }),
        makeResult({ playerId: 'user-2', rank: 2 }),
      ];
      await expect(
        service.persistResults('ABC123', 3, results),
      ).resolves.toBeUndefined();

      expect(mockPrisma.matchResult.create).toHaveBeenCalledTimes(2);
    });

    it('convierte finishedAt string a Date', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-uuid-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [makeResult({ finishedAt: '2026-04-02T12:30:00.000Z' })];
      await service.persistResults('ABC123', 3, results);

      const data = mockPrisma.matchResult.create.mock.calls[0][0].data;
      expect(data.finishedAt).toBeInstanceOf(Date);
      expect(data.finishedAt.toISOString()).toBe('2026-04-02T12:30:00.000Z');
    });

    it('guarda finishedAt como null para jugadores que no terminaron', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-uuid-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [makeResult({ finished: false, finishedAt: null })];
      await service.persistResults('ABC123', 3, results);

      const data = mockPrisma.matchResult.create.mock.calls[0][0].data;
      expect(data.finishedAt).toBeNull();
      expect(data.finished).toBe(false);
    });

    it('persiste multiples jugadores registrados en una partida', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [
        makeResult({ playerId: 'user-1', rank: 1 }),
        makeResult({ playerId: 'user-2', rank: 2 }),
        makeResult({ playerId: 'user-3', rank: 3 }),
      ];
      await service.persistResults('ABC123', 3, results);

      expect(mockPrisma.matchResult.create).toHaveBeenCalledTimes(3);
    });

    it('persiste resultado de jugador unico (rank=1)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-solo' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [makeResult({ playerId: 'user-solo', rank: 1 })];
      await service.persistResults('XYZ789', 1, results);

      expect(mockPrisma.matchResult.create).toHaveBeenCalledTimes(1);
      const data = mockPrisma.matchResult.create.mock.calls[0][0].data;
      expect(data.rank).toBe(1);
    });

    it('persiste jugador con wpm=0 precision=0 (timeout sin teclear)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-afk' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [
        makeResult({
          playerId: 'user-afk',
          wpm: 0,
          precision: 0,
          score: 0,
          finished: false,
          finishedAt: null,
          missingChars: 250,
        }),
      ];
      await service.persistResults('ABC123', 2, results);

      const data = mockPrisma.matchResult.create.mock.calls[0][0].data;
      expect(data).toEqual(
        expect.objectContaining({
          wpm: 0,
          precision: 0,
          score: 0,
          finished: false,
          missingChars: 250,
        }),
      );
    });

    it('sanitiza valores NaN a defaults seguros con warning', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-uuid-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [
        makeResult({
          wpm: NaN,
          precision: NaN,
          score: NaN,
          missingChars: NaN,
          rank: NaN,
        }),
      ];
      await service.persistResults('ABC123', 3, results);

      const data = mockPrisma.matchResult.create.mock.calls[0][0].data;
      expect(data.wpm).toBe(0);
      expect(data.precision).toBe(0);
      expect(data.score).toBe(0);
      expect(data.missingChars).toBe(0);
      expect(data.rank).toBe(1); // results.length = 1
    });

    it('sanitiza finishedAt invalido a null con warning', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-uuid-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });

      const results = [makeResult({ finishedAt: 'not-a-date' })];
      await service.persistResults('ABC123', 3, results);

      const data = mockPrisma.matchResult.create.mock.calls[0][0].data;
      expect(data.finishedAt).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('retorna resultados paginados con total', async () => {
      const mockData = [
        {
          id: 'result-1',
          matchCode: 'ABC123',
          wpm: 85.5,
          precision: 97,
          score: 829.35,
          missingChars: 0,
          level: 3,
          finished: true,
          finishedAt: new Date('2026-04-02T12:00:00Z'),
          rank: 1,
          createdAt: new Date('2026-04-02T12:00:00Z'),
        },
      ];
      mockPrisma.matchResult.findMany.mockResolvedValue(mockData);
      mockPrisma.matchResult.count.mockResolvedValue(1);

      const result = await service.findByUser('user-uuid-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.matchResult.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        select: {
          id: true,
          matchCode: true,
          wpm: true,
          precision: true,
          score: true,
          missingChars: true,
          level: true,
          finished: true,
          finishedAt: true,
          rank: true,
          createdAt: true,
        },
      });
    });

    it('calcula skip correcto para pagina 3', async () => {
      mockPrisma.matchResult.findMany.mockResolvedValue([]);
      mockPrisma.matchResult.count.mockResolvedValue(0);

      await service.findByUser('user-uuid-1', 3, 10);

      expect(mockPrisma.matchResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('filtra por level cuando se provee', async () => {
      mockPrisma.matchResult.findMany.mockResolvedValue([]);
      mockPrisma.matchResult.count.mockResolvedValue(0);

      await service.findByUser('user-1', 1, 20, 3);

      expect(mockPrisma.matchResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', level: 3 }),
        }),
      );
    });

    it('filtra por period 7d cuando se provee', async () => {
      mockPrisma.matchResult.findMany.mockResolvedValue([]);
      mockPrisma.matchResult.count.mockResolvedValue(0);

      const before = Date.now();
      await service.findByUser('user-1', 1, 20, undefined, '7d');
      const after = Date.now();

      const call = mockPrisma.matchResult.findMany.mock.calls[0][0];
      const dateFrom: Date = call.where.createdAt.gte;
      expect(dateFrom).toBeInstanceOf(Date);
      const msAgo = Date.now() - dateFrom.getTime();
      expect(msAgo).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - (after - before));
      expect(msAgo).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1000);
    });

    it('combina level y period', async () => {
      mockPrisma.matchResult.findMany.mockResolvedValue([]);
      mockPrisma.matchResult.count.mockResolvedValue(0);

      await service.findByUser('user-1', 1, 20, 2, '30d');

      const call = mockPrisma.matchResult.findMany.mock.calls[0][0];
      expect(call.where.level).toBe(2);
      expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    });

    it('sin filtros — where solo tiene userId', async () => {
      mockPrisma.matchResult.findMany.mockResolvedValue([]);
      mockPrisma.matchResult.count.mockResolvedValue(0);

      await service.findByUser('user-1', 1, 20);

      expect(mockPrisma.matchResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('findByMatchCode', () => {
    it('retorna resultados con info del usuario ordenados por rank', async () => {
      const mockData = [
        {
          wpm: 85.5, precision: 97, score: 829, missingChars: 0,
          level: 3, finished: true, finishedAt: new Date(), rank: 1,
          createdAt: new Date(), user: { displayName: 'Player 1', avatarUrl: null, countryCode: 'AR' },
        },
        {
          wpm: 70.2, precision: 92, score: 645, missingChars: 5,
          level: 3, finished: true, finishedAt: new Date(), rank: 2,
          createdAt: new Date(), user: { displayName: 'Player 2', avatarUrl: 'http://img.png', countryCode: 'CL' },
        },
      ];
      mockPrisma.matchResult.findMany.mockResolvedValue(mockData);

      const result = await service.findByMatchCode('ABC123');

      expect(result).toHaveLength(2);
      expect(result[0].user.displayName).toBe('Player 1');
      expect(result[1].user.displayName).toBe('Player 2');
      expect(mockPrisma.matchResult.findMany).toHaveBeenCalledWith({
        where: { matchCode: 'ABC123' },
        orderBy: { rank: 'asc' },
        select: expect.objectContaining({
          wpm: true, score: true, rank: true,
          user: { select: { displayName: true, avatarUrl: true, countryCode: true } },
        }),
      });
    });

    it('retorna array vacío si matchCode no existe', async () => {
      mockPrisma.matchResult.findMany.mockResolvedValue([]);

      const result = await service.findByMatchCode('NOEXIST');

      expect(result).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('retorna 0s cuando no hay partidas', async () => {
      mockPrisma.matchResult.aggregate.mockResolvedValue({
        _avg: { score: null, precision: null },
        _count: { id: 0 },
      });
      mockPrisma.matchResult.findFirst.mockResolvedValue(null);

      const result = await service.getStats('user-1');

      expect(result).toEqual({ avgScore: 0, avgPrecision: 0, bestScore: 0, totalMatches: 0 });
    });

    it('retorna stats correctas con partidas', async () => {
      mockPrisma.matchResult.aggregate.mockResolvedValue({
        _avg: { score: 87.567, precision: 96.4 },
        _count: { id: 15 },
      });
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 120.3 });

      const result = await service.getStats('user-1');

      expect(result.avgScore).toBe(87.6);
      expect(result.avgPrecision).toBe(96.4);
      expect(result.bestScore).toBe(120.3);
      expect(result.totalMatches).toBe(15);
    });

    it('bestScore aplica filtros de period', async () => {
      mockPrisma.matchResult.aggregate.mockResolvedValue({
        _avg: { score: 60, precision: 90 },
        _count: { id: 3 },
      });
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 100 });

      await service.getStats('user-1', undefined, '7d');

      const call = mockPrisma.matchResult.findFirst.mock.calls[0][0];
      expect(call.where.userId).toBe('user-1');
      expect(call.where.createdAt.gte).toBeInstanceOf(Date);
      expect(call.orderBy).toEqual({ score: 'desc' });
    });

    it('avgScore aplica filtro de level', async () => {
      mockPrisma.matchResult.aggregate.mockResolvedValue({
        _avg: { score: 75, precision: 85 },
        _count: { id: 5 },
      });
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 95 });

      await service.getStats('user-1', 3);

      expect(mockPrisma.matchResult.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', level: 3 }),
        }),
      );
    });

    it('redondea avgScore y avgPrecision a 1 decimal', async () => {
      mockPrisma.matchResult.aggregate.mockResolvedValue({
        _avg: { score: 87.555, precision: 94.333 },
        _count: { id: 2 },
      });
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 90 });

      const result = await service.getStats('user-1');

      expect(result.avgScore).toBe(87.6);
      expect(result.avgPrecision).toBe(94.3);
    });
  });

  describe('leaderboard cache invalidation', () => {
    it('invalida cache cuando jugador supera su marca personal', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });
      // Previous best was 800, new score is 900
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 800 });

      await service.persistResults('MATCH1', 3, [
        makeResult({ playerId: 'user-1', score: 900 }),
      ]);

      expect(mockLeaderboardService.invalidateForLevel).toHaveBeenCalledWith(3);
    });

    it('no invalida cache cuando score es menor al previo', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });
      // Previous best was 900, new score is 700
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 900 });

      await service.persistResults('MATCH1', 3, [
        makeResult({ playerId: 'user-1', score: 700 }),
      ]);

      expect(mockLeaderboardService.invalidateForLevel).not.toHaveBeenCalled();
    });

    it('no invalida cache cuando score es igual al previo', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });
      mockPrisma.matchResult.findFirst.mockResolvedValue({ score: 800 });

      await service.persistResults('MATCH1', 3, [
        makeResult({ playerId: 'user-1', score: 800 }),
      ]);

      expect(mockLeaderboardService.invalidateForLevel).not.toHaveBeenCalled();
    });

    it('invalida cache en primera partida del usuario en ese nivel', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-new' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });
      // No previous score — first match at this level
      mockPrisma.matchResult.findFirst.mockResolvedValue(null);

      await service.persistResults('MATCH1', 2, [
        makeResult({ playerId: 'user-new', score: 500 }),
      ]);

      expect(mockLeaderboardService.invalidateForLevel).toHaveBeenCalledWith(2);
    });

    it('no lanza excepcion si query de best score previo falla', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });
      mockPrisma.matchResult.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(
        service.persistResults('MATCH1', 3, [
          makeResult({ playerId: 'user-1', score: 900 }),
        ]),
      ).resolves.toBeUndefined();

      expect(mockLeaderboardService.invalidateForLevel).not.toHaveBeenCalled();
    });

    it('invalida solo 1 vez cuando un jugador de varios supera su marca', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrisma.matchResult.create.mockResolvedValue({ id: 'r1' });
      // user-1: new PB (prev 500, new 900), user-2: no PB (prev 1000, new 700)
      mockPrisma.matchResult.findFirst
        .mockResolvedValueOnce(null)      // user-1 first query (prev best excl match) → null means first match
        .mockResolvedValueOnce({ score: 1000 }); // user-2 prev best

      await service.persistResults('MATCH1', 3, [
        makeResult({ playerId: 'user-1', score: 900, rank: 1 }),
        makeResult({ playerId: 'user-2', score: 700, rank: 2 }),
      ]);

      expect(mockLeaderboardService.invalidateForLevel).toHaveBeenCalledTimes(1);
      expect(mockLeaderboardService.invalidateForLevel).toHaveBeenCalledWith(3);
    });
  });
});
