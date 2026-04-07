import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let mockRedis: {
    hset: ReturnType<typeof vi.fn>;
    hget: ReturnType<typeof vi.fn>;
    hgetall: ReturnType<typeof vi.fn>;
    hexists: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    eval: ReturnType<typeof vi.fn>;
    sadd: ReturnType<typeof vi.fn>;
    srem: ReturnType<typeof vi.fn>;
    smembers: ReturnType<typeof vi.fn>;
  };

  const hostInfo = {
    id: 'user-1',
    displayName: 'Host User',
    avatarUrl: 'https://example.com/avatar.png',
  };

  beforeEach(() => {
    mockRedis = {
      hset: vi.fn().mockResolvedValue('OK'),
      hget: vi.fn().mockResolvedValue(null),
      hgetall: vi.fn().mockResolvedValue({}),
      hexists: vi.fn().mockResolvedValue(0),
      del: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
      eval: vi.fn().mockResolvedValue('OK'),
      sadd: vi.fn().mockResolvedValue(1),
      srem: vi.fn().mockResolvedValue(1),
      smembers: vi.fn().mockResolvedValue([]),
    };
    service = new RoomsService(mockRedis as any);
  });

  describe('createRoom', () => {
    it('crea un room con codigo de 6 caracteres', async () => {
      const result = await service.createRoom('user-1', hostInfo);

      expect(result.code).toHaveLength(6);
      expect(result.hostId).toBe('user-1');
      expect(result.level).toBe(1);
      expect(result.status).toBe('waiting');
      expect(result.players).toHaveLength(1);
      expect(result.players[0].id).toBe('user-1');
      expect(result.players[0].colorIndex).toBe(0);
      expect(result.maxPlayers).toBe(20);
    });

    it('almacena room y player en Redis con TTL', async () => {
      await service.createRoom('user-1', hostInfo);

      expect(mockRedis.hset).toHaveBeenCalledTimes(2);
      // refreshTTL expires roomKey, playersKey, and spectatorsKey
      expect(mockRedis.expire).toHaveBeenCalledTimes(3);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^room:[A-Z0-9]{6}$/),
        86400,
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^room:[A-Z0-9]{6}:players$/),
        86400,
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^room:[A-Z0-9]{6}:spectators$/),
        86400,
      );
    });

    it('host empieza con isReady false', async () => {
      const result = await service.createRoom('user-1', hostInfo);
      expect(result.players[0].isReady).toBe(false);
    });

    it('player tiene joinedAt como ISO timestamp', async () => {
      const result = await service.createRoom('user-1', hostInfo);
      expect(result.players[0].joinedAt).toBeDefined();
      expect(typeof result.players[0].joinedAt).toBe('string');
    });

    it('verifica colision de codigo con redis.exists', async () => {
      await service.createRoom('user-1', hostInfo);

      expect(mockRedis.exists).toHaveBeenCalled();
    });

    it('lanza error si no puede generar codigo unico', async () => {
      mockRedis.exists.mockResolvedValue(1); // all codes collide

      await expect(
        service.createRoom('user-1', hostInfo),
      ).rejects.toThrow('No se pudo generar un código único');
    });
  });

  describe('joinRoom', () => {
    const joinerInfo = {
      id: 'user-2',
      displayName: 'Joiner',
      avatarUrl: null,
    };

    it('agrega un jugador al room', async () => {
      // eval returns 'OK' for successful join
      mockRedis.eval.mockResolvedValue('OK');
      // getRoomState calls hgetall for room data, players, and spectators
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-1',
          level: '1',
          status: 'waiting',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          }),
          'user-2': JSON.stringify({
            id: 'user-2',
            displayName: 'Joiner',
            avatarUrl: null,
            colorIndex: 1,
            isReady: false,
            joinedAt: '2026-03-27T00:01:00.000Z',
          }),
        })
        .mockResolvedValueOnce({}); // spectators

      const result = await service.joinRoom('ABC123', 'user-2', joinerInfo);

      expect(result.players).toHaveLength(2);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('rechaza si la partida no existe', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Esta partida ya terminó'));

      await expect(
        service.joinRoom('NOROOM', 'user-2', joinerInfo),
      ).rejects.toThrow('Esta partida ya terminó');
    });

    it('rechaza si la partida ya comenzo', async () => {
      mockRedis.eval.mockRejectedValue(
        new Error('La partida ya ha comenzado'),
      );

      await expect(
        service.joinRoom('ABC123', 'user-2', joinerInfo),
      ).rejects.toThrow('La partida ya ha comenzado');
    });

    it('rechaza si la partida esta llena', async () => {
      mockRedis.eval.mockRejectedValue(
        new Error('Partida llena'),
      );

      await expect(
        service.joinRoom('ABC123', 'user-2', joinerInfo),
      ).rejects.toThrow('Partida llena');
    });

    it('retorna estado existente si el usuario ya esta en la partida', async () => {
      mockRedis.eval.mockResolvedValue('ALREADY_IN_ROOM');
      // getRoomState calls (room, players, spectators)
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-1',
          status: 'waiting',
          level: '1',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({}); // spectators

      const result = await service.joinRoom('ABC123', 'user-1', hostInfo);
      expect(result.code).toBe('ABC123');
    });
  });

  describe('leaveRoom', () => {
    it('remueve player y retorna estado actualizado', async () => {
      // isSpectatorInRoom check
      mockRedis.hexists.mockResolvedValueOnce(0);
      mockRedis.eval.mockResolvedValue('OK');
      // getRoomState calls (room, players, spectators)
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-1',
          level: '1',
          status: 'waiting',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({}); // spectators

      const result = await service.leaveRoom('ABC123', 'user-2');
      expect(result).not.toBeNull();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('elimina el room si no quedan jugadores', async () => {
      // isSpectatorInRoom check
      mockRedis.hexists.mockResolvedValueOnce(0);
      mockRedis.eval.mockResolvedValue('EMPTY');

      const result = await service.leaveRoom('ABC123', 'user-1');

      expect(result).toBeNull();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('promueve nuevo host via Lua script si el host sale', async () => {
      // isSpectatorInRoom check
      mockRedis.hexists.mockResolvedValueOnce(0);
      mockRedis.eval.mockResolvedValue('OK');
      // getRoomState calls (room, players, spectators)
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-2',
          level: '1',
          status: 'waiting',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-2': JSON.stringify({
            id: 'user-2',
            displayName: 'Player 2',
            avatarUrl: null,
            colorIndex: 1,
            isReady: true,
            joinedAt: '2026-03-27T00:01:00.000Z',
          }),
        })
        .mockResolvedValueOnce({}); // spectators

      const result = await service.leaveRoom('ABC123', 'user-1');

      expect(result).not.toBeNull();
      expect(result!.hostId).toBe('user-2');
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        2,
        'room:ABC123',
        'room:ABC123:players',
        'user-1',
        '86400',
      );
    });
  });

  describe('getRoomState', () => {
    it('retorna null si el room no existe', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      const result = await service.getRoomState('NOROOM');
      expect(result).toBeNull();
    });

    it('retorna estado completo del room', async () => {
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-1',
          level: '3',
          status: 'waiting',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({}); // spectators

      const result = await service.getRoomState('ABC123');

      expect(result).toEqual({
        code: 'ABC123',
        hostId: 'user-1',
        level: 3,
        status: 'waiting',
        players: [
          {
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          },
        ],
        spectators: [],
        maxPlayers: 20,
        timeLimit: 0,
      });
    });
  });

  describe('setLevel', () => {
    it('permite al host cambiar el nivel', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'ABC123',
        hostId: 'user-1',
        level: '1',
        status: 'waiting',
        maxPlayers: '20',
      });

      await service.setLevel('ABC123', 'user-1', 3);

      expect(mockRedis.hset).toHaveBeenCalledWith('room:ABC123', 'level', '3');
    });

    it('llama refreshTTL despues de cambiar el nivel', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'ABC123',
        hostId: 'user-1',
        level: '1',
        status: 'waiting',
        maxPlayers: '20',
      });

      await service.setLevel('ABC123', 'user-1', 3);

      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123', 86400);
      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123:players', 86400);
      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123:spectators', 86400);
    });

    it('rechaza si no es el host', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'ABC123',
        hostId: 'user-1',
        level: '1',
        status: 'waiting',
        maxPlayers: '20',
      });

      await expect(
        service.setLevel('ABC123', 'user-2', 3),
      ).rejects.toThrow('Solo el host puede cambiar el nivel');
    });

    it('rechaza nivel fuera de rango', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'ABC123',
        hostId: 'user-1',
        level: '1',
        status: 'waiting',
        maxPlayers: '20',
      });

      await expect(
        service.setLevel('ABC123', 'user-1', 6),
      ).rejects.toThrow('Nivel inválido');
    });
  });

  describe('setReady', () => {
    it('cambia el estado de listo del jugador', async () => {
      mockRedis.hget.mockResolvedValue(
        JSON.stringify({
          id: 'user-1',
          displayName: 'Host',
          avatarUrl: null,
          colorIndex: 0,
          isReady: false,
          joinedAt: '2026-03-27T00:00:00.000Z',
        }),
      );

      await service.setReady('ABC123', 'user-1', true);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'room:ABC123:players',
        'user-1',
        expect.stringContaining('"isReady":true'),
      );
    });

    it('llama refreshTTL despues de cambiar estado listo', async () => {
      mockRedis.hget.mockResolvedValue(
        JSON.stringify({
          id: 'user-1',
          displayName: 'Host',
          avatarUrl: null,
          colorIndex: 0,
          isReady: false,
          joinedAt: '2026-03-27T00:00:00.000Z',
        }),
      );

      await service.setReady('ABC123', 'user-1', true);

      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123', 86400);
      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123:players', 86400);
      expect(mockRedis.expire).toHaveBeenCalledWith('room:ABC123:spectators', 86400);
    });

    it('rechaza si el jugador no esta en la partida', async () => {
      mockRedis.hget.mockResolvedValue(null);

      await expect(
        service.setReady('ABC123', 'user-99', true),
      ).rejects.toThrow('Jugador no encontrado');
    });
  });

  describe('markPlayerDisconnected', () => {
    it('setea disconnected: true en el player hash', async () => {
      mockRedis.hget.mockResolvedValue(
        JSON.stringify({
          id: 'user-1',
          displayName: 'Host',
          avatarUrl: null,
          colorIndex: 0,
          isReady: false,
          joinedAt: '2026-03-27T00:00:00.000Z',
          disconnected: false,
        }),
      );

      await service.markPlayerDisconnected('ABC123', 'user-1');

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'room:ABC123:players',
        'user-1',
        expect.stringContaining('"disconnected":true'),
      );
    });

    it('no hace nada si el player no existe en el hash', async () => {
      mockRedis.hget.mockResolvedValue(null);

      await service.markPlayerDisconnected('ABC123', 'user-99');

      expect(mockRedis.hset).not.toHaveBeenCalled();
    });
  });

  describe('markPlayerConnected', () => {
    it('setea disconnected: false en el player hash', async () => {
      mockRedis.hget.mockResolvedValue(
        JSON.stringify({
          id: 'user-1',
          displayName: 'Host',
          avatarUrl: null,
          colorIndex: 0,
          isReady: false,
          joinedAt: '2026-03-27T00:00:00.000Z',
          disconnected: true,
        }),
      );

      await service.markPlayerConnected('ABC123', 'user-1');

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'room:ABC123:players',
        'user-1',
        expect.stringContaining('"disconnected":false'),
      );
    });

    it('no hace nada si el player no existe en el hash', async () => {
      mockRedis.hget.mockResolvedValue(null);

      await service.markPlayerConnected('ABC123', 'user-99');

      expect(mockRedis.hset).not.toHaveBeenCalled();
    });
  });

  describe('isPlayerInRoom', () => {
    it('retorna true si el player existe en el hash', async () => {
      mockRedis.hexists.mockResolvedValue(1);

      const result = await service.isPlayerInRoom('ABC123', 'user-1');

      expect(result).toBe(true);
      expect(mockRedis.hexists).toHaveBeenCalledWith(
        'room:ABC123:players',
        'user-1',
      );
    });

    it('retorna false si el player no existe en el hash', async () => {
      mockRedis.hexists.mockResolvedValue(0);

      const result = await service.isPlayerInRoom('ABC123', 'user-99');

      expect(result).toBe(false);
    });
  });

  describe('setRoomStatusAtomically', () => {
    it('retorna true si el Lua script retorna ok', async () => {
      mockRedis.eval.mockResolvedValue('ok');

      const result = await service.setRoomStatusAtomically('ABC123', 'finished');

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'room:ABC123',
        'finished',
      );
    });

    it('retorna false si el Lua script retorna nil (status no era playing)', async () => {
      mockRedis.eval.mockResolvedValue(null);

      const result = await service.setRoomStatusAtomically('ABC123', 'finished');

      expect(result).toBe(false);
    });
  });

  describe('joinAsSpectator', () => {
    const spectatorInfo = {
      id: 'spec-1',
      displayName: 'Spectator',
      avatarUrl: null,
      countryCode: null,
    };

    it('agrega un espectador al room', async () => {
      mockRedis.eval.mockResolvedValue('OK');
      // getRoomState calls (room, players, spectators)
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-1',
          level: '1',
          status: 'waiting',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({
          'spec-1': JSON.stringify({
            id: 'spec-1',
            displayName: 'Spectator',
            avatarUrl: null,
            joinedAt: '2026-03-27T00:02:00.000Z',
          }),
        });

      const result = await service.joinAsSpectator('ABC123', 'spec-1', spectatorInfo);

      expect(result.spectators).toHaveLength(1);
      expect(result.spectators[0].id).toBe('spec-1');
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('rechaza si la partida no existe', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Esta partida ya terminó'));

      await expect(
        service.joinAsSpectator('NOROOM', 'spec-1', spectatorInfo),
      ).rejects.toThrow('Esta partida ya terminó');
    });

    it('rechaza si ya es jugador', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Ya eres jugador en esta partida'));

      await expect(
        service.joinAsSpectator('ABC123', 'user-1', spectatorInfo),
      ).rejects.toThrow('Ya eres jugador en esta partida');
    });

    it('rechaza si esta lleno de espectadores', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Partida llena de espectadores'));

      await expect(
        service.joinAsSpectator('ABC123', 'spec-1', spectatorInfo),
      ).rejects.toThrow('Partida llena de espectadores');
    });
  });

  describe('leaveSpectator', () => {
    it('remueve espectador y retorna estado actualizado', async () => {
      mockRedis.eval.mockResolvedValue('OK');
      // getRoomState calls (room, players, spectators)
      mockRedis.hgetall
        .mockResolvedValueOnce({
          code: 'ABC123',
          hostId: 'user-1',
          level: '1',
          status: 'waiting',
          maxPlayers: '20',
        })
        .mockResolvedValueOnce({
          'user-1': JSON.stringify({
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            joinedAt: '2026-03-27T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({}); // spectators empty after leave

      const result = await service.leaveSpectator('ABC123', 'spec-1');
      expect(result).not.toBeNull();
      expect(result!.spectators).toHaveLength(0);
    });
  });

  describe('isSpectatorInRoom', () => {
    it('retorna true si el espectador existe en el hash', async () => {
      mockRedis.hexists.mockResolvedValue(1);

      const result = await service.isSpectatorInRoom('ABC123', 'spec-1');

      expect(result).toBe(true);
      expect(mockRedis.hexists).toHaveBeenCalledWith(
        'room:ABC123:spectators',
        'spec-1',
      );
    });

    it('retorna false si el espectador no existe', async () => {
      mockRedis.hexists.mockResolvedValue(0);

      const result = await service.isSpectatorInRoom('ABC123', 'spec-99');

      expect(result).toBe(false);
    });
  });

  describe('canStart', () => {
    it('retorna true si hay 2+ jugadores y todos listos', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({
          id: 'user-1',
          displayName: 'P1',
          avatarUrl: null,
          colorIndex: 0,
          isReady: true,
          joinedAt: '2026-03-27T00:00:00.000Z',
        }),
        'user-2': JSON.stringify({
          id: 'user-2',
          displayName: 'P2',
          avatarUrl: null,
          colorIndex: 1,
          isReady: true,
          joinedAt: '2026-03-27T00:01:00.000Z',
        }),
      });

      const result = await service.canStart('ABC123');
      expect(result).toBe(true);
    });

    it('retorna true si hay 1 jugador listo (solo play)', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({
          id: 'user-1',
          displayName: 'P1',
          avatarUrl: null,
          colorIndex: 0,
          isReady: true,
          joinedAt: '2026-03-27T00:00:00.000Z',
        }),
      });

      const result = await service.canStart('ABC123');
      expect(result).toBe(true);
    });

    it('retorna false si no hay jugadores', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.canStart('ABC123');
      expect(result).toBe(false);
    });

    it('retorna false si no todos estan listos', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'user-1': JSON.stringify({
          id: 'user-1',
          displayName: 'P1',
          avatarUrl: null,
          colorIndex: 0,
          isReady: true,
          joinedAt: '2026-03-27T00:00:00.000Z',
        }),
        'user-2': JSON.stringify({
          id: 'user-2',
          displayName: 'P2',
          avatarUrl: null,
          colorIndex: 1,
          isReady: false,
          joinedAt: '2026-03-27T00:01:00.000Z',
        }),
      });

      const result = await service.canStart('ABC123');
      expect(result).toBe(false);
    });
  });
});
