import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchStateService } from './match-state.service';

describe('MatchStateService', () => {
  let service: MatchStateService;
  let redis: {
    hset: ReturnType<typeof vi.fn>;
    hget: ReturnType<typeof vi.fn>;
    hgetall: ReturnType<typeof vi.fn>;
    hdel: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    eval: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    redis = {
      hset: vi.fn().mockResolvedValue('OK'),
      hget: vi.fn().mockResolvedValue(null),
      hgetall: vi.fn().mockResolvedValue({}),
      hdel: vi.fn().mockResolvedValue(1),
      del: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      eval: vi.fn().mockResolvedValue(1),
    };

    service = new MatchStateService(redis as any);
  });

  describe('initMatch', () => {
    it('inicializa metadata del match y todos los jugadores en posicion 0', async () => {
      await service.initMatch('ABC234', ['user-1', 'user-2'], 42, 'Hola mundo');

      // Match metadata
      expect(redis.hset).toHaveBeenCalledWith('match:ABC234', expect.objectContaining({
        textId: '42',
        textContent: 'Hola mundo',
        status: 'playing',
      }));

      // Player states: hset called for each player with position 0
      const playerCalls = redis.hset.mock.calls.filter(
        (c: any[]) => c[0] === 'match:ABC234:players',
      );
      expect(playerCalls).toHaveLength(2);

      const p1 = JSON.parse(playerCalls[0][2]);
      expect(p1).toEqual(expect.objectContaining({ position: 0, errors: 0 }));

      const p2 = JSON.parse(playerCalls[1][2]);
      expect(p2).toEqual(expect.objectContaining({ position: 0, errors: 0 }));

      // TTL set on both keys
      expect(redis.expire).toHaveBeenCalledWith('match:ABC234', 3600);
      expect(redis.expire).toHaveBeenCalledWith('match:ABC234:players', 3600);
    });

    it('lanza error si playerIds esta vacio', async () => {
      await expect(
        service.initMatch('ABC234', [], 42, 'Hola mundo'),
      ).rejects.toThrow('No hay jugadores para inicializar el match: ABC234');
      expect(redis.hset).not.toHaveBeenCalled();
    });
  });

  describe('updatePosition', () => {
    it('acepta avance de +1 (tecla correcta)', async () => {
      redis.eval.mockResolvedValue(1);

      const result = await service.updatePosition('ABC234', 'user-1', 1);

      expect(result).toBe('valid');
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'match:ABC234:players',
        'user-1',
        '1',
      );
    });

    it('acepta retroceso de -1 (backspace)', async () => {
      redis.eval.mockResolvedValue(1);

      const result = await service.updatePosition('ABC234', 'user-1', 0);

      expect(result).toBe('valid');
    });

    it('rechaza salto de posicion (anti-cheat)', async () => {
      redis.eval.mockResolvedValue(0);

      const result = await service.updatePosition('ABC234', 'user-1', 5);

      expect(result).toBe('cheat');
    });

    it('retorna not_found si jugador no esta en el match', async () => {
      redis.eval.mockResolvedValue(-1);

      const result = await service.updatePosition('ABC234', 'unknown', 1);

      expect(result).toBe('not_found');
    });
  });

  describe('getMatchState', () => {
    it('retorna posiciones de todos los jugadores', async () => {
      redis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({ position: 5, errors: 1, startedAt: '2026-03-27T00:00:00Z' }),
        'user-2': JSON.stringify({ position: 3, errors: 0, startedAt: '2026-03-27T00:00:00Z' }),
      });

      const state = await service.getMatchState('ABC234');

      expect(state).toEqual({
        'user-1': { position: 5, errors: 1, startedAt: '2026-03-27T00:00:00Z' },
        'user-2': { position: 3, errors: 0, startedAt: '2026-03-27T00:00:00Z' },
      });
      expect(redis.hgetall).toHaveBeenCalledWith('match:ABC234:players');
    });

    it('retorna objeto vacio si no hay jugadores', async () => {
      redis.hgetall.mockResolvedValue({});

      const state = await service.getMatchState('ABC234');

      expect(state).toEqual({});
    });

    it('retorna objeto vacio si la clave no existe en Redis (hgetall devuelve null)', async () => {
      redis.hgetall.mockResolvedValue(null);

      const state = await service.getMatchState('ABC234');

      expect(state).toEqual({});
    });
  });

  describe('getPlayerPosition', () => {
    it('retorna la posicion del jugador', async () => {
      redis.hget.mockResolvedValue(
        JSON.stringify({ position: 7, errors: 2, startedAt: '2026-03-27T00:00:00Z' }),
      );

      const position = await service.getPlayerPosition('ABC234', 'user-1');

      expect(position).toBe(7);
      expect(redis.hget).toHaveBeenCalledWith('match:ABC234:players', 'user-1');
    });

    it('retorna -1 si jugador no existe', async () => {
      redis.hget.mockResolvedValue(null);

      const position = await service.getPlayerPosition('ABC234', 'unknown');

      expect(position).toBe(-1);
    });
  });

  describe('markPlayerFinished', () => {
    it('marca al jugador como finished con timestamp y keystrokes via Lua atomico', async () => {
      const finishedAt = '2026-03-28T00:01:00Z';
      redis.eval.mockResolvedValue(JSON.stringify({ finishedAt, position: 10 }));

      const result = await service.markPlayerFinished('ABC234', 'user-1', 50, 5);

      expect(result).not.toBeNull();
      expect(result!.position).toBe(10);
      expect(result!.finishedAt).toBe(finishedAt);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'match:ABC234:players',
        'user-1',
        '50',
        '5',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO timestamp
      );
    });

    it('retorna datos existentes si ya estaba finished (deduplicacion atomica)', async () => {
      const finishedAt = '2026-03-28T00:01:00Z';
      redis.eval.mockResolvedValue(JSON.stringify({ finishedAt, position: 10 }));

      const result = await service.markPlayerFinished('ABC234', 'user-1', 50, 5);

      expect(result).toEqual({ finishedAt, position: 10 });
    });

    it('retorna null si jugador no existe (Lua retorna nil)', async () => {
      redis.eval.mockResolvedValue(null);

      const result = await service.markPlayerFinished('ABC234', 'unknown', 0, 0);

      expect(result).toBeNull();
    });
  });

  describe('isPlayerFinished', () => {
    it('retorna true si jugador tiene finishedAt', async () => {
      redis.hget.mockResolvedValue(
        JSON.stringify({ position: 10, errors: 0, startedAt: '2026-03-28T00:00:00Z', finishedAt: '2026-03-28T00:01:00Z' }),
      );

      expect(await service.isPlayerFinished('ABC234', 'user-1')).toBe(true);
    });

    it('retorna false si jugador no tiene finishedAt', async () => {
      redis.hget.mockResolvedValue(
        JSON.stringify({ position: 5, errors: 0, startedAt: '2026-03-28T00:00:00Z' }),
      );

      expect(await service.isPlayerFinished('ABC234', 'user-1')).toBe(false);
    });

    it('retorna false si jugador no existe', async () => {
      redis.hget.mockResolvedValue(null);

      expect(await service.isPlayerFinished('ABC234', 'unknown')).toBe(false);
    });
  });

  describe('areAllPlayersFinished', () => {
    it('retorna true si todos tienen finishedAt', async () => {
      redis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({ position: 10, errors: 0, startedAt: '2026-03-28T00:00:00Z', finishedAt: '2026-03-28T00:01:00Z' }),
        'user-2': JSON.stringify({ position: 10, errors: 1, startedAt: '2026-03-28T00:00:00Z', finishedAt: '2026-03-28T00:01:05Z' }),
      });

      expect(await service.areAllPlayersFinished('ABC234')).toBe(true);
    });

    it('retorna false si alguno no tiene finishedAt', async () => {
      redis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({ position: 10, errors: 0, startedAt: '2026-03-28T00:00:00Z', finishedAt: '2026-03-28T00:01:00Z' }),
        'user-2': JSON.stringify({ position: 5, errors: 0, startedAt: '2026-03-28T00:00:00Z' }),
      });

      expect(await service.areAllPlayersFinished('ABC234')).toBe(false);
    });

    it('retorna false si no hay jugadores', async () => {
      redis.hgetall.mockResolvedValue({});

      expect(await service.areAllPlayersFinished('ABC234')).toBe(false);
    });
  });

  describe('calculateResults', () => {
    it('calcula WPM, precision y score con trunc2, ordenados por score desc', async () => {
      const startedAt = '2026-03-28T00:00:00.000Z';
      const finished1 = '2026-03-28T00:01:00.000Z'; // 1 minuto
      const finished2 = '2026-03-28T00:01:30.000Z'; // 1.5 minutos
      const textContent = 'A'.repeat(60);            // textLength=60, ambos terminaron → missingChars=0

      redis.hgetall
        .mockResolvedValueOnce({ startedAt, textContent }) // match data
        .mockResolvedValueOnce({                           // players
          'user-1': JSON.stringify({
            position: 50, errors: 0, startedAt,
            finishedAt: finished1, totalKeystrokes: 50, errorKeystrokes: 5,
          }),
          'user-2': JSON.stringify({
            position: 50, errors: 0, startedAt,
            finishedAt: finished2, totalKeystrokes: 55, errorKeystrokes: 0,
          }),
        });

      const results = await service.calculateResults('ABC234', {
        'user-1': { displayName: 'Alice', colorIndex: 0 },
        'user-2': { displayName: 'Bob', colorIndex: 1 },
      });

      expect(results).toHaveLength(2);
      // user-1: wpm=trunc2(50/5/1)=10, precision=trunc2(45/50)=0.9→90%, score=trunc2(10*10*0.9)=90
      // user-2: wpm=trunc2(50/5/1.5)=trunc2(6.666)=6.66, precision=100%, score=trunc2(6.66*10*1.0)=66.6
      expect(results[0].playerId).toBe('user-1');
      expect(results[0].rank).toBe(1);
      expect(results[0].wpm).toBe(10);
      expect(results[0].precision).toBe(90);
      expect(results[0].score).toBe(90);
      expect(results[1].playerId).toBe('user-2');
      expect(results[1].rank).toBe(2);
      expect(results[1].wpm).toBe(6.66);
      expect(results[1].score).toBe(66.59);
      expect(results[1].finished).toBe(true);
    });

    it('aplica penalización por caracteres faltantes en DNF', async () => {
      const startedAt = '2026-03-28T00:00:00.000Z';
      const finishedAt = '2026-03-28T00:01:00.000Z'; // 1 minuto
      const textContent = 'A'.repeat(100);            // textLength=100

      redis.hgetall
        .mockResolvedValueOnce({ startedAt, textContent })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            position: 50, errors: 0, startedAt,
            finishedAt, totalKeystrokes: 50, errorKeystrokes: 0,
          }),
          'user-2': JSON.stringify({
            position: 30, errors: 0, startedAt,
            // Sin finishedAt — DNF, missingChars = 100 - 30 = 70
            totalKeystrokes: 30, errorKeystrokes: 0,
          }),
        });

      const results = await service.calculateResults('ABC234', {
        'user-1': { displayName: 'Alice', colorIndex: 0 },
        'user-2': { displayName: 'Bob', colorIndex: 1 },
      });

      // user-1: terminó, missingChars=0 → score = trunc2(10*10*1.0) = 100
      expect(results[0].playerId).toBe('user-1');
      expect(results[0].finished).toBe(true);
      expect(results[0].score).toBe(100);
      // user-2: DNF, missingChars=70 → score tiene descuento de 70*2=140
      expect(results[1].playerId).toBe('user-2');
      expect(results[1].finished).toBe(false);
      expect(results[1].finishedAt).toBeNull();
      expect(results[1].score).toBeLessThan(results[0].score);
    });

    it('desempate por finishedAt cuando scores son iguales', async () => {
      const startedAt = '2026-03-28T00:00:00.000Z';
      const finished1 = '2026-03-28T00:01:00.000Z'; // terminó antes
      const finished2 = '2026-03-28T00:01:30.000Z'; // terminó después
      const textContent = 'A'.repeat(60);

      redis.hgetall
        .mockResolvedValueOnce({ startedAt, textContent })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            position: 50, errors: 0, startedAt,
            finishedAt: finished1, totalKeystrokes: 50, errorKeystrokes: 5,
          }),
          'user-2': JSON.stringify({
            position: 50, errors: 0, startedAt,
            finishedAt: finished2, totalKeystrokes: 50, errorKeystrokes: 5,
          }),
        });

      const results = await service.calculateResults('ABC234', {
        'user-1': { displayName: 'Alice', colorIndex: 0 },
        'user-2': { displayName: 'Bob', colorIndex: 1 },
      });

      // Mismo score, user-1 terminó antes → rank 1
      expect(results[0].playerId).toBe('user-1');
      expect(results[1].playerId).toBe('user-2');
    });
  });

  describe('getTextLength', () => {
    it('retorna la longitud del texto del match', async () => {
      redis.hget.mockResolvedValue('Hola mundo');

      const length = await service.getTextLength('ABC234');

      expect(length).toBe(10);
      expect(redis.hget).toHaveBeenCalledWith('match:ABC234', 'textContent');
    });

    it('retorna 0 si no hay textContent', async () => {
      redis.hget.mockResolvedValue(null);

      const length = await service.getTextLength('ABC234');

      expect(length).toBe(0);
    });
  });

  describe('cleanupMatch', () => {
    it('elimina las keys del match', async () => {
      await service.cleanupMatch('ABC234');

      expect(redis.del).toHaveBeenCalledWith('match:ABC234', 'match:ABC234:players');
    });
  });

  describe('getMatchStartedAt', () => {
    it('retorna el timestamp de inicio del match', async () => {
      redis.hget.mockResolvedValue('2026-03-28T00:00:00Z');

      const result = await service.getMatchStartedAt('ABC234');

      expect(result).toBe('2026-03-28T00:00:00Z');
      expect(redis.hget).toHaveBeenCalledWith('match:ABC234', 'startedAt');
    });
  });

  describe('getPlayerMatchState', () => {
    it('retorna el estado del jugador parseado desde Redis', async () => {
      const playerState = {
        position: 42,
        errors: 3,
        totalKeystrokes: 50,
        errorKeystrokes: 3,
        finishedAt: null,
      };
      redis.hget.mockResolvedValue(JSON.stringify(playerState));

      const result = await service.getPlayerMatchState('ABC234', 'user-1');

      expect(result).toEqual(playerState);
      expect(redis.hget).toHaveBeenCalledWith('match:ABC234:players', 'user-1');
    });

    it('retorna null si el jugador no existe en el hash', async () => {
      redis.hget.mockResolvedValue(null);

      const result = await service.getPlayerMatchState('ABC234', 'user-99');

      expect(result).toBeNull();
    });

    it('retorna null si el JSON esta corrupto', async () => {
      redis.hget.mockResolvedValue('not-valid-json{');

      const result = await service.getPlayerMatchState('ABC234', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getAllPlayerPositions', () => {
    it('retorna posiciones y estado finished de todos los jugadores', async () => {
      redis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({ position: 10, errors: 0, finishedAt: null }),
        'user-2': JSON.stringify({ position: 50, errors: 2, finishedAt: '2026-03-28T00:01:00Z' }),
      });

      const result = await service.getAllPlayerPositions('ABC234');

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { playerId: 'user-1', position: 10, finished: false },
          { playerId: 'user-2', position: 50, finished: true },
        ]),
      );
    });

    it('retorna array vacio si no hay jugadores', async () => {
      redis.hgetall.mockResolvedValue({});

      const result = await service.getAllPlayerPositions('ABC234');

      expect(result).toEqual([]);
    });
  });

  describe('getMatchMetadata', () => {
    it('retorna metadata completa del match', async () => {
      redis.hgetall.mockResolvedValue({
        textContent: 'Hola mundo',
        textId: '42',
        startedAt: '2026-03-28T00:00:00Z',
        status: 'playing',
      });

      const result = await service.getMatchMetadata('ABC234');

      expect(result).toEqual({
        textContent: 'Hola mundo',
        textId: '42',
        startedAt: '2026-03-28T00:00:00Z',
        status: 'playing',
      });
      expect(redis.hgetall).toHaveBeenCalledWith('match:ABC234');
    });

    it('retorna null si no hay textContent en el hash', async () => {
      redis.hgetall.mockResolvedValue({ status: 'playing' });

      const result = await service.getMatchMetadata('ABC234');

      expect(result).toBeNull();
    });

    it('retorna null si el hash esta vacio', async () => {
      redis.hgetall.mockResolvedValue({});

      const result = await service.getMatchMetadata('ABC234');

      expect(result).toBeNull();
    });
  });
});
