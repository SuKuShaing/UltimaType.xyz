import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextsService } from './texts.service';
import { DIFFICULTY_LEVELS } from '@ultimatype-monorepo/shared';

describe('TextsService', () => {
  let service: TextsService;
  let prisma: {
    text: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      text: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new TextsService(prisma as any);
  });

  describe('getRandomByLevel', () => {
    it('retorna texto aleatorio del nivel solicitado', async () => {
      const mockText = { id: '1', level: 2, language: 'es', content: 'Hola Mundo' };
      prisma.text.count.mockResolvedValue(1);
      prisma.text.findMany.mockResolvedValue([mockText]);

      const result = await service.getRandomByLevel(2);

      expect(result).toEqual(mockText);
      expect(prisma.text.count).toHaveBeenCalledWith({ where: { level: 2 } });
      expect(prisma.text.findMany).toHaveBeenCalledWith({
        where: { level: 2 },
        skip: expect.any(Number),
        take: 1,
      });
    });

    it('retorna null si no hay textos para el nivel', async () => {
      prisma.text.count.mockResolvedValue(0);

      const result = await service.getRandomByLevel(3);

      expect(result).toBeNull();
      expect(prisma.text.findMany).not.toHaveBeenCalled();
    });

    it('usa skip aleatorio dentro del rango de count', async () => {
      const mockText = { id: '1', level: 1, language: 'es', content: 'test' };
      prisma.text.count.mockResolvedValue(10);
      prisma.text.findMany.mockResolvedValue([mockText]);

      await service.getRandomByLevel(1);

      const call = prisma.text.findMany.mock.calls[0][0];
      expect(call.skip).toBeGreaterThanOrEqual(0);
      expect(call.skip).toBeLessThan(10);
    });

    it('retorna null si findMany retorna array vacio', async () => {
      prisma.text.count.mockResolvedValue(1);
      prisma.text.findMany.mockResolvedValue([]);

      const result = await service.getRandomByLevel(1);

      expect(result).toBeNull();
    });
  });

  describe('getLevels', () => {
    it('retorna los 5 niveles de dificultad', () => {
      const levels = service.getLevels();

      expect(levels).toEqual(DIFFICULTY_LEVELS);
      expect(levels).toHaveLength(5);
    });

    it('cada nivel tiene level, name y description', () => {
      const levels = service.getLevels();

      for (const level of levels) {
        expect(level).toHaveProperty('level');
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('description');
        expect(typeof level.level).toBe('number');
        expect(typeof level.name).toBe('string');
        expect(typeof level.description).toBe('string');
      }
    });
  });
});
