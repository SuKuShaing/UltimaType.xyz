import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameGateway } from './game.gateway';
import { RoomsService } from '../modules/rooms/rooms.service';
import { UsersService } from '../modules/users/users.service';
import { TextsService } from '../modules/texts/texts.service';
import { ConfigService } from '@nestjs/config';
import { WS_EVENTS } from '@ultimatype-monorepo/shared';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let roomsService: {
    joinRoom: ReturnType<typeof vi.fn>;
    leaveRoom: ReturnType<typeof vi.fn>;
    getRoomState: ReturnType<typeof vi.fn>;
    setReady: ReturnType<typeof vi.fn>;
    setLevel: ReturnType<typeof vi.fn>;
    canStart: ReturnType<typeof vi.fn>;
    setRoomStatus: ReturnType<typeof vi.fn>;
  };
  let usersService: {
    findById: ReturnType<typeof vi.fn>;
  };
  let textsService: {
    getRandomByLevel: ReturnType<typeof vi.fn>;
  };
  let configService: {
    getOrThrow: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let mockServer: {
    to: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    use: ReturnType<typeof vi.fn>;
    opts: Record<string, any>;
  };
  let mockSocket: {
    id: string;
    data: { user: { sub: string; displayName: string } };
    join: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };

  const roomState = {
    code: 'ABC234',
    hostId: 'user-1',
    level: 1,
    status: 'waiting' as const,
    players: [
      {
        id: 'user-1',
        displayName: 'Host',
        avatarUrl: null,
        colorIndex: 0,
        isReady: false,
      },
    ],
    maxPlayers: 20,
  };

  beforeEach(() => {
    roomsService = {
      joinRoom: vi.fn().mockResolvedValue(roomState),
      leaveRoom: vi.fn().mockResolvedValue(roomState),
      getRoomState: vi.fn().mockResolvedValue(roomState),
      setReady: vi.fn().mockResolvedValue(undefined),
      setLevel: vi.fn().mockResolvedValue(undefined),
      canStart: vi.fn().mockResolvedValue(true),
      setRoomStatus: vi.fn().mockResolvedValue(undefined),
    };
    usersService = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        displayName: 'Host',
        avatarUrl: null,
      }),
    };
    textsService = {
      getRandomByLevel: vi.fn().mockResolvedValue({ id: 'text-1' }),
    };
    configService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
      get: vi.fn().mockReturnValue('http://localhost:4200'),
    };

    gateway = new GameGateway(
      roomsService as unknown as RoomsService,
      usersService as unknown as UsersService,
      textsService as unknown as TextsService,
      configService as unknown as ConfigService,
    );

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      use: vi.fn(),
      opts: {},
    };
    gateway.server = mockServer as any;

    mockSocket = {
      id: 'socket-1',
      data: { user: { sub: 'user-1', displayName: 'Host' } },
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
    };
  });

  describe('afterInit', () => {
    it('configura CORS y registra middleware de JWT en el server', () => {
      gateway.afterInit(mockServer as any);

      expect(configService.get).toHaveBeenCalledWith(
        'FRONTEND_URL',
        'http://localhost:4200',
      );
      expect(mockServer.opts.cors).toEqual({
        origin: 'http://localhost:4200',
        credentials: true,
      });
      expect(mockServer.use).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('lobby:join', () => {
    it('une al jugador al room y broadcast estado', async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });

      expect(roomsService.joinRoom).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
        expect.objectContaining({ id: 'user-1' }),
      );
      expect(mockSocket.join).toHaveBeenCalledWith('ABC234');
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.LOBBY_STATE,
        roomState,
      );
    });

    it('emite error si joinRoom falla', async () => {
      roomsService.joinRoom.mockRejectedValue(
        new Error('Sala no encontrada'),
      );

      await gateway.handleJoin(mockSocket as any, { code: 'XYZ789' });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Sala no encontrada',
      });
    });

    it('emite error si codigo de sala es invalido', async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'bad' });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Código de sala inválido',
      });
      expect(roomsService.joinRoom).not.toHaveBeenCalled();
    });
  });

  describe('lobby:leave', () => {
    it('remueve al jugador y broadcast estado', async () => {
      // First join to register connection
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });

      await gateway.handleLeave(mockSocket as any, { code: 'ABC234' });

      expect(roomsService.leaveRoom).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
      );
      expect(mockSocket.leave).toHaveBeenCalledWith('ABC234');
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
    });
  });

  describe('lobby:ready', () => {
    it('cambia estado ready y broadcast', async () => {
      await gateway.handleReady(mockSocket as any, {
        code: 'ABC234',
        ready: true,
      });

      expect(roomsService.setReady).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
        true,
      );
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
    });

    it('emite error si ready no es boolean', async () => {
      await gateway.handleReady(mockSocket as any, {
        code: 'ABC234',
        ready: 'yes' as any,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Estado ready inválido',
      });
      expect(roomsService.setReady).not.toHaveBeenCalled();
    });
  });

  describe('lobby:select-level', () => {
    it('cambia nivel y broadcast', async () => {
      await gateway.handleSelectLevel(mockSocket as any, {
        code: 'ABC234',
        level: 3,
      });

      expect(roomsService.setLevel).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
        3,
      );
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
    });

    it('emite error si no es host', async () => {
      roomsService.setLevel.mockRejectedValue(
        new Error('Solo el host puede cambiar el nivel'),
      );

      await gateway.handleSelectLevel(mockSocket as any, {
        code: 'ABC234',
        level: 3,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Solo el host puede cambiar el nivel',
      });
    });

    it('emite error si nivel es invalido', async () => {
      await gateway.handleSelectLevel(mockSocket as any, {
        code: 'ABC234',
        level: 999,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Nivel inválido',
      });
      expect(roomsService.setLevel).not.toHaveBeenCalled();
    });
  });

  describe('lobby:start', () => {
    it('emite match:start con textId si condiciones se cumplen', async () => {
      await gateway.handleStart(mockSocket as any, { code: 'ABC234' });

      expect(roomsService.setReady).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
        true,
      );
      expect(roomsService.canStart).toHaveBeenCalledWith('ABC234');
      expect(textsService.getRandomByLevel).toHaveBeenCalledWith(
        roomState.level,
      );
      expect(roomsService.setRoomStatus).toHaveBeenCalledWith(
        'ABC234',
        'playing',
      );
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
      expect(mockServer.emit).toHaveBeenCalledWith(WS_EVENTS.MATCH_START, {
        code: 'ABC234',
        textId: 'text-1',
      });
    });

    it('rechaza si no es host', async () => {
      roomsService.getRoomState.mockResolvedValue({
        ...roomState,
        hostId: 'other-user',
      });

      await gateway.handleStart(mockSocket as any, { code: 'ABC234' });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Solo el host puede iniciar la partida',
      });
    });

    it('rechaza si no se puede iniciar', async () => {
      roomsService.canStart.mockResolvedValue(false);

      await gateway.handleStart(mockSocket as any, { code: 'ABC234' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.LOBBY_ERROR,
        expect.objectContaining({
          message: expect.stringContaining('2 jugadores'),
        }),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('limpia conexion y broadcast al desconectarse', async () => {
      // First join
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });

      await gateway.handleDisconnect(mockSocket as any);

      expect(roomsService.leaveRoom).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
      );
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
    });

    it('no hace nada si no habia conexion registrada', async () => {
      await gateway.handleDisconnect(mockSocket as any);
      expect(roomsService.leaveRoom).not.toHaveBeenCalled();
    });

    it('no lanza excepcion si leaveRoom falla', async () => {
      // First join
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });

      roomsService.leaveRoom.mockRejectedValue(new Error('Redis error'));

      // Should not throw thanks to try-catch
      await expect(
        gateway.handleDisconnect(mockSocket as any),
      ).resolves.toBeUndefined();
    });
  });
});
