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
});
