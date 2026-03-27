import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { UsersService } from '../users/users.service';

describe('RoomsController', () => {
  let controller: RoomsController;
  let roomsService: {
    createRoom: ReturnType<typeof vi.fn>;
    getRoomState: ReturnType<typeof vi.fn>;
  };
  let usersService: {
    findById: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'user-1',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    email: 'test@example.com',
  };

  beforeEach(() => {
    roomsService = {
      createRoom: vi.fn(),
      getRoomState: vi.fn(),
    };
    usersService = {
      findById: vi.fn(),
    };
    controller = new RoomsController(
      roomsService as unknown as RoomsService,
      usersService as unknown as UsersService,
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
      });
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
