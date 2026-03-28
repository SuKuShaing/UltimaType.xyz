import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameGateway } from './game.gateway';
import { RoomsService } from '../modules/rooms/rooms.service';
import { UsersService } from '../modules/users/users.service';
import { TextsService } from '../modules/texts/texts.service';
import { MatchStateService } from '../modules/matches/match-state.service';
import { ConfigService } from '@nestjs/config';
import { WS_EVENTS, DISCONNECT_GRACE_PERIOD_MS } from '@ultimatype-monorepo/shared';

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
    markPlayerDisconnected: ReturnType<typeof vi.fn>;
    markPlayerConnected: ReturnType<typeof vi.fn>;
    isPlayerInRoom: ReturnType<typeof vi.fn>;
  };
  let usersService: {
    findById: ReturnType<typeof vi.fn>;
  };
  let textsService: {
    getRandomByLevel: ReturnType<typeof vi.fn>;
  };
  let matchStateService: {
    initMatch: ReturnType<typeof vi.fn>;
    updatePosition: ReturnType<typeof vi.fn>;
    getMatchState: ReturnType<typeof vi.fn>;
    getPlayerPosition: ReturnType<typeof vi.fn>;
    getTextLength: ReturnType<typeof vi.fn>;
    isPlayerFinished: ReturnType<typeof vi.fn>;
    markPlayerFinished: ReturnType<typeof vi.fn>;
    areAllPlayersFinished: ReturnType<typeof vi.fn>;
    calculateResults: ReturnType<typeof vi.fn>;
    cleanupMatch: ReturnType<typeof vi.fn>;
    getMatchStartedAt: ReturnType<typeof vi.fn>;
    getPlayerMatchState: ReturnType<typeof vi.fn>;
    getAllPlayerPositions: ReturnType<typeof vi.fn>;
    getMatchMetadata: ReturnType<typeof vi.fn>;
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
        disconnected: false,
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
      markPlayerDisconnected: vi.fn().mockResolvedValue(undefined),
      markPlayerConnected: vi.fn().mockResolvedValue(undefined),
      isPlayerInRoom: vi.fn().mockResolvedValue(true),
    };
    usersService = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        displayName: 'Host',
        avatarUrl: null,
      }),
    };
    textsService = {
      getRandomByLevel: vi.fn().mockResolvedValue({ id: 42, content: 'Hola mundo test' }),
    };
    matchStateService = {
      initMatch: vi.fn().mockResolvedValue(undefined),
      updatePosition: vi.fn().mockResolvedValue('valid'),
      getMatchState: vi.fn().mockResolvedValue({}),
      getPlayerPosition: vi.fn().mockResolvedValue(0),
      getTextLength: vi.fn().mockResolvedValue(100),
      isPlayerFinished: vi.fn().mockResolvedValue(false),
      markPlayerFinished: vi.fn().mockResolvedValue(null),
      areAllPlayersFinished: vi.fn().mockResolvedValue(false),
      calculateResults: vi.fn().mockResolvedValue([]),
      cleanupMatch: vi.fn().mockResolvedValue(undefined),
      getMatchStartedAt: vi.fn().mockResolvedValue('2026-03-28T00:00:00Z'),
      getPlayerMatchState: vi.fn().mockResolvedValue(null),
      getAllPlayerPositions: vi.fn().mockResolvedValue([]),
      getMatchMetadata: vi.fn().mockResolvedValue(null),
    };
    configService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
      get: vi.fn().mockReturnValue('http://localhost:4200'),
    };

    gateway = new GameGateway(
      roomsService as unknown as RoomsService,
      usersService as unknown as UsersService,
      textsService as unknown as TextsService,
      matchStateService as unknown as MatchStateService,
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
    it('emite match:start con textId, textContent y players si condiciones se cumplen', async () => {
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
      expect(matchStateService.initMatch).toHaveBeenCalledWith(
        'ABC234',
        ['user-1'],
        42,
        'Hola mundo test',
      );
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
      expect(mockServer.emit).toHaveBeenCalledWith(WS_EVENTS.MATCH_START, {
        code: 'ABC234',
        textId: 42,
        textContent: 'Hola mundo test',
        players: roomState.players,
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

    it('rechaza y revierte status si updatedState es null tras setRoomStatus', async () => {
      roomsService.getRoomState
        .mockResolvedValueOnce(roomState)   // primera llamada: validación de host/canStart
        .mockResolvedValueOnce(null);        // segunda llamada: post-setRoomStatus

      await gateway.handleStart(mockSocket as any, { code: 'ABC234' });

      expect(roomsService.setRoomStatus).toHaveBeenCalledWith('ABC234', 'waiting');
      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'No se pudo obtener el estado de la sala',
      });
      expect(matchStateService.initMatch).not.toHaveBeenCalled();
    });
  });

  describe('caret:update', () => {
    beforeEach(async () => {
      // Join room first so connection is tracked
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
      // Set room status to playing
      roomsService.getRoomState.mockResolvedValue({
        ...roomState,
        status: 'playing',
      });
    });

    it('valida posicion y broadcast caret:sync a la sala', async () => {
      const volatileTo = vi.fn().mockReturnValue({ emit: vi.fn() });
      (mockSocket as any).volatile = { to: volatileTo };

      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 1,
        timestamp: Date.now(),
      });

      expect(matchStateService.updatePosition).toHaveBeenCalledWith(
        'ABC234',
        'user-1',
        1,
      );
      expect(volatileTo).toHaveBeenCalledWith('ABC234');
    });

    it('rechaza payload invalido (position no es number)', async () => {
      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 'abc' as any,
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Payload de caret inválido',
      });
      expect(matchStateService.updatePosition).not.toHaveBeenCalled();
    });

    it('rechaza payload invalido (position es float)', async () => {
      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 1.5 as any,
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Payload de caret inválido',
      });
      expect(matchStateService.updatePosition).not.toHaveBeenCalled();
    });

    it('rechaza si jugador no esta en sala (sin conexion)', async () => {
      const unregisteredSocket = {
        id: 'socket-unknown',
        data: { user: { sub: 'user-99', displayName: 'Ghost' } },
        emit: vi.fn(),
        volatile: { to: vi.fn().mockReturnValue({ emit: vi.fn() }) },
      };

      await gateway.handleCaretUpdate(unregisteredSocket as any, {
        position: 1,
        timestamp: Date.now(),
      });

      expect(unregisteredSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.LOBBY_ERROR,
        { message: 'No estás en una sala' },
      );
    });

    it('rechaza si sala no esta en playing', async () => {
      roomsService.getRoomState.mockResolvedValue({
        ...roomState,
        status: 'waiting',
      });

      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 1,
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'La partida no está en curso',
      });
    });

    it('descarta silenciosamente posicion invalida (anti-cheat)', async () => {
      matchStateService.updatePosition.mockResolvedValue('cheat');
      const volatileTo = vi.fn().mockReturnValue({ emit: vi.fn() });
      (mockSocket as any).volatile = { to: volatileTo };

      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 99,
        timestamp: Date.now(),
      });

      expect(volatileTo).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('emite LOBBY_ERROR si jugador no esta en el match (not_found)', async () => {
      matchStateService.updatePosition.mockResolvedValue('not_found');

      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 1,
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Jugador no encontrado en la partida',
      });
    });
  });

  describe('player:finish', () => {
    beforeEach(async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
      roomsService.getRoomState.mockResolvedValue({
        ...roomState,
        status: 'playing',
      });
    });

    it('llama handlePlayerFinishInternal con keystrokes del payload', async () => {
      matchStateService.isPlayerFinished.mockResolvedValue(false);
      matchStateService.markPlayerFinished.mockResolvedValue({
        finishedAt: '2026-03-28T00:01:00Z',
        position: 100,
      });
      matchStateService.getMatchState.mockResolvedValue({
        'user-1': { position: 100, errors: 0, startedAt: '2026-03-28T00:00:00Z', totalKeystrokes: 50, errorKeystrokes: 5 },
      });
      matchStateService.areAllPlayersFinished.mockResolvedValue(false);

      await gateway.handlePlayerFinish(mockSocket as any, {
        totalKeystrokes: 50,
        errorKeystrokes: 5,
      });

      expect(matchStateService.markPlayerFinished).toHaveBeenCalledWith(
        'ABC234', 'user-1', 50, 5,
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.PLAYER_FINISH,
        expect.objectContaining({ playerId: 'user-1', position: 100 }),
      );
    });

    it('no hace nada si no hay conexion registrada', async () => {
      const unknownSocket = { id: 'unknown', data: { user: { sub: 'x' } }, emit: vi.fn() };
      await gateway.handlePlayerFinish(unknownSocket as any, { totalKeystrokes: 10, errorKeystrokes: 0 });
      expect(matchStateService.markPlayerFinished).not.toHaveBeenCalled();
    });
  });

  describe('match:rematch', () => {
    beforeEach(async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
    });

    it('resetea sala y broadcast LOBBY_STATE', async () => {
      roomsService.getRoomState
        .mockResolvedValueOnce({ ...roomState, status: 'finished' })
        .mockResolvedValueOnce({ ...roomState, status: 'waiting' });

      await gateway.handleRematch(mockSocket as any);

      expect(matchStateService.cleanupMatch).toHaveBeenCalledWith('ABC234');
      expect(roomsService.setRoomStatus).toHaveBeenCalledWith('ABC234', 'waiting');
      expect(mockServer.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_STATE, expect.any(Object));
    });

    it('emite error si sala no está en finished', async () => {
      roomsService.getRoomState.mockResolvedValue({ ...roomState, status: 'playing' });

      await gateway.handleRematch(mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'La partida no ha terminado',
      });
      expect(matchStateService.cleanupMatch).not.toHaveBeenCalled();
    });

    it('emite error si no hay conexion registrada', async () => {
      const unknownSocket = { id: 'unknown', data: {}, emit: vi.fn() };
      await gateway.handleRematch(unknownSocket as any);
      expect((unknownSocket as any).emit).toHaveBeenCalledWith(
        WS_EVENTS.LOBBY_ERROR,
        { message: 'No estás en una sala' },
      );
    });
  });

  describe('caret:update — detección de finish', () => {
    beforeEach(async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
      roomsService.getRoomState.mockResolvedValue({ ...roomState, status: 'playing' });
      (mockSocket as any).volatile = { to: vi.fn().mockReturnValue({ emit: vi.fn() }) };
    });

    it('dispara finish cuando position >= textLength y jugador no estaba finished', async () => {
      matchStateService.getTextLength.mockResolvedValue(5);
      matchStateService.isPlayerFinished.mockResolvedValue(false);
      matchStateService.markPlayerFinished.mockResolvedValue({
        finishedAt: '2026-03-28T00:01:00Z',
        position: 5,
      });
      matchStateService.getMatchState.mockResolvedValue({
        'user-1': { position: 5, errors: 0, startedAt: '2026-03-28T00:00:00Z' },
      });
      matchStateService.areAllPlayersFinished.mockResolvedValue(false);

      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 5,
        timestamp: Date.now(),
      });

      expect(matchStateService.markPlayerFinished).toHaveBeenCalledWith(
        'ABC234', 'user-1', 0, 0,
      );
    });

    it('no dispara finish si jugador ya estaba finished', async () => {
      matchStateService.getTextLength.mockResolvedValue(5);
      matchStateService.isPlayerFinished.mockResolvedValue(true);

      await gateway.handleCaretUpdate(mockSocket as any, {
        position: 5,
        timestamp: Date.now(),
      });

      expect(matchStateService.markPlayerFinished).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('marca jugador como desconectado y emite PLAYER_DISCONNECTED en room waiting', async () => {
      // First join
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });

      await gateway.handleDisconnect(mockSocket as any);

      expect(roomsService.markPlayerDisconnected).toHaveBeenCalledWith('ABC234', 'user-1');
      expect(roomsService.leaveRoom).not.toHaveBeenCalled();
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
      expect(mockServer.emit).toHaveBeenCalledWith(WS_EVENTS.PLAYER_DISCONNECTED, {
        playerId: 'user-1',
        roomCode: 'ABC234',
      });
    });

    it('deja inmediatamente en room finished', async () => {
      roomsService.getRoomState.mockResolvedValue({ ...roomState, status: 'finished' });
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
      roomsService.getRoomState.mockResolvedValue({ ...roomState, status: 'finished' });

      await gateway.handleDisconnect(mockSocket as any);

      expect(roomsService.leaveRoom).toHaveBeenCalledWith('ABC234', 'user-1');
      expect(roomsService.markPlayerDisconnected).not.toHaveBeenCalled();
    });

    it('no hace nada si no habia conexion registrada', async () => {
      await gateway.handleDisconnect(mockSocket as any);
      expect(roomsService.leaveRoom).not.toHaveBeenCalled();
      expect(roomsService.markPlayerDisconnected).not.toHaveBeenCalled();
    });

    it('no lanza excepcion si getRoomState falla', async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
      roomsService.getRoomState.mockRejectedValue(new Error('Redis error'));

      await expect(
        gateway.handleDisconnect(mockSocket as any),
      ).resolves.toBeUndefined();
    });

    it('llama leaveRoom y broadcast LOBBY_STATE cuando el grace period expira', async () => {
      vi.useFakeTimers();
      try {
        const playingRoomState = {
          ...roomState,
          status: 'playing' as const,
          players: [{ ...roomState.players[0], disconnected: true }],
        };
        roomsService.getRoomState
          .mockResolvedValueOnce(playingRoomState)  // inside handleDisconnect
          .mockResolvedValue(playingRoomState);      // inside grace timer callback

        await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
        roomsService.getRoomState.mockResolvedValue(playingRoomState);
        await gateway.handleDisconnect(mockSocket as any);

        // leaveRoom must NOT have been called yet
        expect(roomsService.leaveRoom).not.toHaveBeenCalled();

        // Advance clock past the grace period
        await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_PERIOD_MS);

        expect(roomsService.leaveRoom).toHaveBeenCalledWith('ABC234', 'user-1');
        expect(mockServer.to).toHaveBeenCalledWith('ABC234');
        expect(mockServer.emit).toHaveBeenCalledWith(
          WS_EVENTS.LOBBY_STATE,
          expect.any(Object),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('no llama leaveRoom si el jugador reconecto antes de que expire el grace period', async () => {
      vi.useFakeTimers();
      try {
        const playingRoomState = {
          ...roomState,
          status: 'playing' as const,
          players: [{ ...roomState.players[0], disconnected: false }],
        };
        roomsService.getRoomState.mockResolvedValue(playingRoomState);

        await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
        await gateway.handleDisconnect(mockSocket as any);

        // Advance past grace period — but player.disconnected is false (reconnected)
        await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_PERIOD_MS);

        expect(roomsService.leaveRoom).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('handleRejoin', () => {
    it('restaura player y emite REJOIN_STATE en room waiting', async () => {
      await gateway.handleJoin(mockSocket as any, { code: 'ABC234' });
      // Simulate disconnect and new socket
      await gateway.handleDisconnect(mockSocket as any);

      const newSocket = {
        id: 'socket-2',
        data: { user: { sub: 'user-1', displayName: 'Host' } },
        join: vi.fn(),
        leave: vi.fn(),
        emit: vi.fn(),
      };

      await gateway.handleRejoin(newSocket as any, { roomCode: 'ABC234' });

      expect(roomsService.markPlayerConnected).toHaveBeenCalledWith('ABC234', 'user-1');
      expect(newSocket.join).toHaveBeenCalledWith('ABC234');
      expect(mockServer.to).toHaveBeenCalledWith('ABC234');
      expect(mockServer.emit).toHaveBeenCalledWith(WS_EVENTS.PLAYER_RECONNECTED, {
        playerId: 'user-1',
        roomCode: 'ABC234',
      });
      expect(newSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.REJOIN_STATE,
        expect.objectContaining({
          roomCode: 'ABC234',
          roomState: expect.any(Object),
          matchState: null,
        }),
      );
    });

    it('emite error si jugador no esta en la sala', async () => {
      roomsService.isPlayerInRoom.mockResolvedValue(false);

      await gateway.handleRejoin(mockSocket as any, { roomCode: 'ABC234' });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Ya no estás en esta sala',
      });
    });

    it('emite error si codigo de sala es invalido', async () => {
      await gateway.handleRejoin(mockSocket as any, { roomCode: 'invalid' });

      expect(mockSocket.emit).toHaveBeenCalledWith(WS_EVENTS.LOBBY_ERROR, {
        message: 'Código de sala inválido',
      });
    });
  });
});
