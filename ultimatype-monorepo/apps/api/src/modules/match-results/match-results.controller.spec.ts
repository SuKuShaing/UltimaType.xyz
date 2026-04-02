import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchResultsController } from './match-results.controller';

const mockService = {
  findByUser: vi.fn(),
  getStats: vi.fn(),
  findByMatchCode: vi.fn(),
};

describe('MatchResultsController', () => {
  let controller: MatchResultsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MatchResultsController(mockService as any);
  });

  const mockReq = (userId: string) => ({ user: { id: userId } });

  describe('getMyResults', () => {
    it('retorna resultados paginados con formato envelope', async () => {
      const mockData = [
        {
          id: 'r1',
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
      mockService.findByUser.mockResolvedValue({ data: mockData, total: 1 });

      const result = await controller.getMyResults(mockReq('user-1') as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 'r1',
        matchCode: 'ABC123',
        wpm: 85.5,
        precision: 97,
        score: 829.35,
        missingChars: 0,
        level: 3,
        finished: true,
        finishedAt: '2026-04-02T12:00:00.000Z',
        rank: 1,
        createdAt: '2026-04-02T12:00:00.000Z',
      });
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('usa page y limit del query string', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '3', '10');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 3, 10, undefined, undefined);
    });

    it('defaults page=1 limit=20 si no se proveen', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any);

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, undefined);
    });

    it('clampea limit a max 20', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '1', '500');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, undefined);
    });

    it('clampea page minimo a 1', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '0', '20');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, undefined);
    });

    it('maneja valores invalidos de query como defaults', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, 'abc', 'xyz');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, undefined);
    });

    it('calcula totalPages correctamente', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 55 });

      const result = await controller.getMyResults(
        mockReq('user-1') as any,
        '1',
        '20',
      );

      expect(result.meta.totalPages).toBe(3);
    });

    it('convierte finishedAt null a null en el response', async () => {
      const mockData = [
        {
          id: 'r1',
          matchCode: 'ABC123',
          wpm: 0,
          precision: 0,
          score: 0,
          missingChars: 200,
          level: 2,
          finished: false,
          finishedAt: null,
          rank: 3,
          createdAt: new Date('2026-04-02T12:00:00Z'),
        },
      ];
      mockService.findByUser.mockResolvedValue({ data: mockData, total: 1 });

      const result = await controller.getMyResults(mockReq('user-1') as any);

      expect(result.data[0].finishedAt).toBeNull();
    });

    it('filtra solo resultados del usuario autenticado', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-specific-id') as any);

      expect(mockService.findByUser).toHaveBeenCalledWith(
        'user-specific-id',
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('pasa level valido al service', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '1', '20', '3');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, 3, undefined);
    });

    it('ignora level invalido (fuera de 1-5)', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '1', '20', '9');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, undefined);
    });

    it('pasa period valido al service', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '1', '20', undefined, '7d');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, '7d');
    });

    it('ignora period invalido', async () => {
      mockService.findByUser.mockResolvedValue({ data: [], total: 0 });

      await controller.getMyResults(mockReq('user-1') as any, '1', '20', undefined, 'invalid');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', 1, 20, undefined, undefined);
    });
  });

  describe('getMyStats', () => {
    it('retorna stats del service', async () => {
      const mockStats = { avgScore: 87.6, bestScore: 120.3, totalMatches: 15 };
      mockService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getMyStats(mockReq('user-1') as any);

      expect(result).toEqual(mockStats);
      expect(mockService.getStats).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('pasa level valido al service', async () => {
      mockService.getStats.mockResolvedValue({ avgScore: 0, bestScore: 0, totalMatches: 0 });

      await controller.getMyStats(mockReq('user-1') as any, '2');

      expect(mockService.getStats).toHaveBeenCalledWith('user-1', 2, undefined);
    });

    it('pasa period valido al service', async () => {
      mockService.getStats.mockResolvedValue({ avgScore: 0, bestScore: 0, totalMatches: 0 });

      await controller.getMyStats(mockReq('user-1') as any, undefined, '30d');

      expect(mockService.getStats).toHaveBeenCalledWith('user-1', undefined, '30d');
    });

    it('ignora level invalido', async () => {
      mockService.getStats.mockResolvedValue({ avgScore: 0, bestScore: 0, totalMatches: 0 });

      await controller.getMyStats(mockReq('user-1') as any, '6');

      expect(mockService.getStats).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('ignora period invalido', async () => {
      mockService.getStats.mockResolvedValue({ avgScore: 0, bestScore: 0, totalMatches: 0 });

      await controller.getMyStats(mockReq('user-1') as any, undefined, 'semana');

      expect(mockService.getStats).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('acepta todos los periods validos', async () => {
      mockService.getStats.mockResolvedValue({ avgScore: 0, bestScore: 0, totalMatches: 0 });

      for (const period of ['7d', '30d', 'all'] as const) {
        vi.clearAllMocks();
        mockService.getStats.mockResolvedValue({ avgScore: 0, bestScore: 0, totalMatches: 0 });
        await controller.getMyStats(mockReq('user-1') as any, undefined, period);
        expect(mockService.getStats).toHaveBeenCalledWith('user-1', undefined, period);
      }
    });
  });

  describe('getMatchDetail', () => {
    const makeMatchResult = (rank: number, displayName: string) => ({
      wpm: 80 + rank * 5,
      precision: 95 - rank,
      score: 800 - rank * 50,
      missingChars: rank,
      level: 3,
      finished: true,
      finishedAt: new Date('2026-04-02T12:00:00Z'),
      rank,
      createdAt: new Date('2026-04-02T12:00:00Z'),
      user: { displayName, avatarUrl: null, countryCode: 'AR' },
    });

    it('retorna detalle de partida con participantes', async () => {
      mockService.findByMatchCode.mockResolvedValue([
        makeMatchResult(1, 'Player 1'),
        makeMatchResult(2, 'Player 2'),
      ]);

      const result = await controller.getMatchDetail('ABC123');

      expect(result.matchCode).toBe('ABC123');
      expect(result.level).toBe(3);
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].displayName).toBe('Player 1');
      expect(result.participants[0].finishedAt).toBe('2026-04-02T12:00:00.000Z');
      expect(result.participants[1].displayName).toBe('Player 2');
    });

    it('lanza NotFoundException si matchCode no existe', async () => {
      mockService.findByMatchCode.mockResolvedValue([]);

      await expect(controller.getMatchDetail('NOEXIST')).rejects.toThrow('no encontrada');
    });

    it('convierte finishedAt null correctamente', async () => {
      const result = makeMatchResult(1, 'DNF Player');
      result.finished = false;
      result.finishedAt = null;
      mockService.findByMatchCode.mockResolvedValue([result]);

      const detail = await controller.getMatchDetail('ABC123');

      expect(detail.participants[0].finishedAt).toBeNull();
      expect(detail.participants[0].finished).toBe(false);
    });
  });
});
