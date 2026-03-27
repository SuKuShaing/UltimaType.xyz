import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { RoomsService } from '../modules/rooms/rooms.service';
import { UsersService } from '../modules/users/users.service';
import { TextsService } from '../modules/texts/texts.service';
import { WS_EVENTS, isValidLevel } from '@ultimatype-monorepo/shared';

const ROOM_CODE_REGEX = /^[A-Z2-9]{6}$/;

@WebSocketGateway()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);
  private connections = new Map<
    string,
    { userId: string; roomCode: string }
  >();

  constructor(
    private roomsService: RoomsService,
    private usersService: UsersService,
    private textsService: TextsService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    // Configure CORS dynamically using ConfigService
    const origin = this.configService.get('FRONTEND_URL', 'http://localhost:4200');
    server.opts.cors = { origin, credentials: true };

    // JWT authentication middleware
    server.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      try {
        const payload = verify(
          token,
          this.configService.getOrThrow<string>('JWT_SECRET'),
          { algorithms: ['HS256'] },
        ) as { sub: string; email: string; displayName: string };
        socket.data.user = payload;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const conn = this.connections.get(client.id);
    if (conn) {
      this.connections.delete(client.id);
      try {
        const state = await this.roomsService.leaveRoom(
          conn.roomCode,
          conn.userId,
        );
        if (state) {
          this.server.to(conn.roomCode).emit(WS_EVENTS.LOBBY_STATE, state);
        }
      } catch (err) {
        this.logger.error(
          `Error cleaning up disconnect for ${conn.userId} in room ${conn.roomCode}`,
          err,
        );
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_JOIN)
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const userId = client.data.user.sub;
      const user = await this.usersService.findById(userId);

      const state = await this.roomsService.joinRoom(data.code, userId, {
        id: userId,
        displayName: user?.displayName ?? client.data.user.displayName,
        avatarUrl: user?.avatarUrl ?? null,
      });

      client.join(data.code);
      this.connections.set(client.id, {
        userId,
        roomCode: data.code,
      });

      this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_LEAVE)
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const userId = client.data.user.sub;
      const state = await this.roomsService.leaveRoom(data.code, userId);

      client.leave(data.code);
      this.connections.delete(client.id);

      if (state) {
        this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
      }
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_READY)
  async handleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; ready: boolean },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }
      if (typeof data.ready !== 'boolean') {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Estado ready inválido' });
      }

      const userId = client.data.user.sub;
      await this.roomsService.setReady(data.code, userId, data.ready);
      const state = await this.roomsService.getRoomState(data.code);
      if (state) {
        this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
      }
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_SELECT_LEVEL)
  async handleSelectLevel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; level: number },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }
      if (!isValidLevel(data.level)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Nivel inválido' });
      }

      const userId = client.data.user.sub;
      await this.roomsService.setLevel(data.code, userId, data.level);
      const state = await this.roomsService.getRoomState(data.code);
      if (state) {
        this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
      }
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_START)
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const userId = client.data.user.sub;
      const state = await this.roomsService.getRoomState(data.code);

      if (!state) {
        throw new Error('Sala no encontrada');
      }

      if (state.hostId !== userId) {
        throw new Error('Solo el host puede iniciar la partida');
      }

      // Auto-ready the host (R1: clicking start implies ready)
      await this.roomsService.setReady(data.code, userId, true);

      const canStart = await this.roomsService.canStart(data.code);
      if (!canStart) {
        throw new Error(
          'Se necesitan al menos 2 jugadores y todos deben estar listos',
        );
      }

      // Select a random text based on room difficulty level
      const text = await this.textsService.getRandomByLevel(state.level);
      if (!text) {
        throw new Error('No hay textos disponibles para este nivel de dificultad');
      }

      await this.roomsService.setRoomStatus(data.code, 'playing');

      this.server.to(data.code).emit(WS_EVENTS.MATCH_START, {
        code: data.code,
        textId: text.id,
      });
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }
}
