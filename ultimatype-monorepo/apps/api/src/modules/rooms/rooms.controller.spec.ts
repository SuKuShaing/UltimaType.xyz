import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { UsersService } from '../users/users.service';
import { MatchStateService } from '../matches/match-state.service';

describe('RoomsController', () => {
  let controller: RoomsController;
  let roomsService: {
    createRoom: ReturnType<typeof vi.fn>;
    getRoomState: ReturnType<typeof vi.fn>;
    getActiveRoomCodes: ReturnType<typeof vi.fn>;
  };
  let usersService: {
    findById: ReturnType<typeof vi.fn>;
  };
  let matchStateService: {
    getMatchMetadata: ReturnType<typeof vi.fn>;
    getMatchState: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    email: 'test@example.com',
    countryCode: 'CL',
  };

  beforeEach(() => {
    roomsService = {
      createRoom: vi.fn(),
      getRoomState: vi.fn(),
      getActiveRoomCodes: vi.fn().mockResolvedValue([]),
    };
    usersService = {
      findById: vi.fn(),
    };
    matchStateService = {
      getMatchMetadata: vi.fn().mockResolvedValue(null),
      getMatchState: vi.fn().mockResolvedValue(null),
    };
    controller = new RoomsController(
      roomsService as unknown as RoomsService,
      usersService as unknown as UsersService,
      matchStateService as unknown as MatchStateService,
    );
  });

  describe('POST /rooms', () => {
    it('crea un room y retorna code y link', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      roomsService.createRoom.mockResolvedValue({
        code: 'ABC123',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [],
        maxPlayers: 20,
      });

      const req = { user: { userId: 'user-1', displayName: 'Test User' } };
      const result = await controller.createRoom(req);

      expect(result).toEqual({ code: 'ABC123', link: '/room/ABC123' });
      expect(roomsService.createRoom).toHaveBeenCalledWith('user-1', {
        id: 'user-1',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        countryCode: 'CL',
      });
    });

    it('usa displayName del JWT si no se encuentra el usuario', async () => {
      usersService.findById.mockResolvedValue(null);
      roomsService.createRoom.mockResolvedValue({
        code: 'ABC123',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [],
        maxPlayers: 20,
      });

      const req = { user: { userId: 'user-1', displayName: 'JWT Name' } };
      await controller.createRoom(req);

      expect(roomsService.createRoom).toHaveBeenCalledWith('user-1', {
        id: 'user-1',
        displayName: 'JWT Name',
        avatarUrl: null,
        countryCode: null,
      });
    });
  });

  describe('GET /rooms/active', () => {
    it('retorna { rooms: [] } cuando no hay rooms activos', async () => {
      roomsService.getActiveRoomCodes.mockResolvedValue([]);

      const result = await controller.getActiveRooms();
      expect(result).toEqual({ rooms: [] });
    });

    it('retorna rooms en estado waiting y playing', async () => {
      roomsService.getActiveRoomCodes.mockResolvedValue(['WAIT01', 'PLAY01']);
      roomsService.getRoomState.mockImplementation(async (code: string) => {
        if (code === 'WAIT01') {
          return {
            code: 'WAIT01',
            status: 'waiting',
            level: 1,
            players: [
              { id: 'u1', displayName: 'Alice', colorIndex: 0, avatarUrl: null, disconnected: false },
            ],
          };
        }
        if (code === 'PLAY01') {
          return {
            code: 'PLAY01',
            status: 'playing',
            level: 3,
            players: [
              { id: 'u2', displayName: 'Bob', colorIndex: 1, avatarUrl: null, disconnected: false },
            ],
          };
        }
        return null;
      });
      matchStateService.getMatchMetadata.mockResolvedValue({
        startedAt: '2026-04-07T00:00:00Z',
        textContent: 'hello world',
        textId: '1',
      });
      matchStateService.getMatchState.mockResolvedValue({
        u2: { position: 5, finished: false },
      });

      const result = await controller.getActiveRooms();
      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0]).toEqual({
        code: 'WAIT01',
        status: 'waiting',
        level: 1,
        playerCount: 1,
        players: [{ displayName: 'Alice', colorIndex: 0, avatarUrl: null }],
      });
      expect(result.rooms[1]).toEqual({
        code: 'PLAY01',
        status: 'playing',
        level: 3,
        playerCount: 1,
        players: [{ displayName: 'Bob', colorIndex: 1, avatarUrl: null, position: 5 }],
        startedAt: '2026-04-07T00:00:00Z',
        textLength: 11,
      });
    });

    it('no incluye rooms con status finished', async () => {
      roomsService.getActiveRoomCodes.mockResolvedValue(['FIN01', 'WAIT02']);
      roomsService.getRoomState.mockImplementation(async (code: string) => {
        if (code === 'FIN01') {
          return { code: 'FIN01', status: 'finished', level: 1, players: [] };
        }
        if (code === 'WAIT02') {
          return {
            code: 'WAIT02',
            status: 'waiting',
            level: 2,
            players: [
              { id: 'u3', displayName: 'Carol', colorIndex: 0, avatarUrl: null, disconnected: false },
            ],
          };
        }
        return null;
      });

      const result = await controller.getActiveRooms();
      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].code).toBe('WAIT02');
    });

    it('skipea rooms cuyo getMatchMetadata retorna null', async () => {
      roomsService.getActiveRoomCodes.mockResolvedValue(['PLAY02']);
      roomsService.getRoomState.mockResolvedValue({
        code: 'PLAY02',
        status: 'playing',
        level: 1,
        players: [
          { id: 'u4', displayName: 'Dan', colorIndex: 0, avatarUrl: null, disconnected: false },
        ],
      });
      matchStateService.getMatchMetadata.mockResolvedValue(null);

      const result = await controller.getActiveRooms();
      expect(result.rooms).toHaveLength(0);
    });

    it('skipea room si getRoomState lanza error y continúa con los demás', async () => {
      roomsService.getActiveRoomCodes.mockResolvedValue(['ERR01', 'WAIT03']);
      roomsService.getRoomState.mockImplementation(async (code: string) => {
        if (code === 'ERR01') throw new Error('Redis timeout');
        return {
          code: 'WAIT03',
          status: 'waiting',
          level: 1,
          players: [
            { id: 'u5', displayName: 'Eve', colorIndex: 0, avatarUrl: null, disconnected: false },
          ],
        };
      });

      const result = await controller.getActiveRooms();
      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].code).toBe('WAIT03');
    });
  });

  describe('GET /rooms/:code', () => {
    it('retorna el estado del room', async () => {
      const roomState = {
        code: 'ABC123',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [{ id: 'user-1', displayName: 'Test', avatarUrl: null }],
        maxPlayers: 20,
      };
      roomsService.getRoomState.mockResolvedValue(roomState);

      const result = await controller.getRoomInfo('ABC123');
      expect(result).toEqual({
        code: 'ABC123',
        playerCount: 1,
        status: 'waiting',
        level: 1,
      });
    });

    it('lanza NotFoundException si el room no existe', async () => {
      roomsService.getRoomState.mockResolvedValue(null);

      await expect(controller.getRoomInfo('NOROOM')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
