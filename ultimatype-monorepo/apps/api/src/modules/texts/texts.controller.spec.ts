import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextsController } from './texts.controller';
import { TextsService } from './texts.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DIFFICULTY_LEVELS } from '@ultimatype-monorepo/shared';

describe('TextsController', () => {
  let controller: TextsController;
  let textsService: {
    getRandomByLevel: ReturnType<typeof vi.fn>;
    getLevels: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    textsService = {
      getRandomByLevel: vi.fn(),
      getLevels: vi.fn().mockReturnValue(DIFFICULTY_LEVELS),
    };
    controller = new TextsController(textsService as unknown as TextsService);
  });

  describe('GET /texts/random', () => {
    it('retorna texto aleatorio con level valido', async () => {
      const mockText = {
        id: 'abc-123',
        level: 2,
        language: 'es',
        content: 'Hola Mundo',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      textsService.getRandomByLevel.mockResolvedValue(mockText);

      const result = await controller.getRandomText('2');

      expect(result).toEqual({
        id: 'abc-123',
        level: 2,
        language: 'es',
        content: 'Hola Mundo',
      });
      expect(textsService.getRandomByLevel).toHaveBeenCalledWith(2);
    });

    it('lanza BadRequestException si level no es proporcionado', async () => {
      await expect(controller.getRandomText('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si level es undefined', async () => {
      await expect(
        controller.getRandomText(undefined as unknown as string),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si level es 0', async () => {
      await expect(controller.getRandomText('0')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si level es 6', async () => {
      await expect(controller.getRandomText('6')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si level es texto no numerico', async () => {
      await expect(controller.getRandomText('abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si level es decimal', async () => {
      await expect(controller.getRandomText('2.5')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException si no hay textos para el nivel', async () => {
      textsService.getRandomByLevel.mockResolvedValue(null);

      await expect(controller.getRandomText('3')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('acepta niveles validos 1 a 5', async () => {
      const mockText = {
        id: '1',
        level: 1,
        language: 'es',
        content: 'test',
      };
      textsService.getRandomByLevel.mockResolvedValue(mockText);

      for (const level of ['1', '2', '3', '4', '5']) {
        const result = await controller.getRandomText(level);
        expect(result).toBeDefined();
      }

      expect(textsService.getRandomByLevel).toHaveBeenCalledTimes(5);
    });
  });

  describe('GET /texts/levels', () => {
    it('retorna la lista de niveles de dificultad', () => {
      const result = controller.getLevels();

      expect(result).toEqual(DIFFICULTY_LEVELS);
      expect(result).toHaveLength(5);
      expect(textsService.getLevels).toHaveBeenCalled();
    });
  });
});
