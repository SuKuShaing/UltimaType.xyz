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
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { RoomsService } from '../modules/rooms/rooms.service';
import { UsersService } from '../modules/users/users.service';
import { TextsService } from '../modules/texts/texts.service';
import { MatchStateService } from '../modules/matches/match-state.service';
import {
  WS_EVENTS,
  isValidLevel,
  isValidTimeLimit,
  MATCH_TIMEOUT_MS,
  DISCONNECT_GRACE_PERIOD_MS,
  MAX_SPECTATORS,
  ROOM_ERROR_CODES,
  PlayerFinishClientPayload,
  RejoinStatePayload,
  RejoinMatchState,
  RejoinPlayerState,
  LobbyRejoinPayload,
} from '@ultimatype-monorepo/shared';

const ROOM_CODE_REGEX = /^[A-Z2-9]{6}$/;
const MAX_WS_CONNECTIONS_PER_USER = 3;
const CARET_THROTTLE_MIN_INTERVAL_MS = 40; // 25 events/sec = 40ms interval

@SkipThrottle()
@WebSocketGateway()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);
  private connections = new Map<
    string,
    { userId: string; roomCode: string; role: 'player' | 'spectator' }
  >();
  private matchTimeouts = new Map<string, NodeJS.Timeout>();
  private graceTimers = new Map<string, NodeJS.Timeout>();
  private lastCaretTimestamp = new Map<string, number>();

  constructor(
    private roomsService: RoomsService,
    private usersService: UsersService,
    private textsService: TextsService,
    private matchStateService: MatchStateService,
    private configService: ConfigService,
  ) {}

  onModuleDestroy() {
    const activeConnections = this.connections.size;
    if (activeConnections > 0) {
      this.logger.warn(`Shutting down with ${activeConnections} active connections`);
    }

    for (const [roomCode, timeout] of this.matchTimeouts.entries()) {
      clearTimeout(timeout);
    }
    this.matchTimeouts.clear();

    for (const [key, timer] of this.graceTimers.entries()) {
      clearTimeout(timer);
    }
    this.graceTimers.clear();

    this.lastCaretTimestamp.clear();
  }

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

    const userId = client.data.user?.sub;
    if (userId) {
      const activeConnections = this.countUserConnections(userId);
      if (activeConnections >= MAX_WS_CONNECTIONS_PER_USER) {
        this.logger.warn(`User ${userId} exceeded max WS connections (${MAX_WS_CONNECTIONS_PER_USER})`);
        client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Demasiadas conexiones simultáneas' });
        client.disconnect(true);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.lastCaretTimestamp.delete(client.id);
    const conn = this.connections.get(client.id);
    if (!conn) return;
    this.connections.delete(client.id);

    const { userId, roomCode, role } = conn;

    try {
      // Spectators: 30s grace period (same as players) to survive network blips.
      // Only start the timer if this is the last socket for this user in this room.
      if (role === 'spectator') {
        const remainingInRoom = this.countUserConnectionsInRoom(userId, roomCode);
        if (remainingInRoom > 0) return; // another tab still connected

        const timerKey = `spectator:${roomCode}:${userId}`;
        this.clearGraceTimer(timerKey);

        const timer = setTimeout(async () => {
          this.graceTimers.delete(timerKey);
          try {
            const state = await this.roomsService.leaveSpectator(roomCode, userId);
            if (state) {
              this.server.to(roomCode).emit(WS_EVENTS.LOBBY_STATE, state);
            }
          } catch (err) {
            this.logger.error(`Error in spectator grace expiry for ${userId} in ${roomCode}`, err);
          }
        }, DISCONNECT_GRACE_PERIOD_MS);

        this.graceTimers.set(timerKey, timer);
        return;
      }

      const roomState = await this.roomsService.getRoomState(roomCode);
      if (!roomState) return;

      // Grace period for playing/waiting rooms — give player time to reconnect
      if (roomState.status === 'playing' || roomState.status === 'waiting') {
        await this.roomsService.markPlayerDisconnected(roomCode, userId);

        if (roomState.status === 'waiting') {
          // Lobby: broadcast LOBBY_STATE with player marked as disconnected so
          // other players see an immediate visual disconnect indicator
          const updatedState = await this.roomsService.getRoomState(roomCode);
          if (updatedState) {
            this.server.to(roomCode).emit(WS_EVENTS.LOBBY_STATE, updatedState);
          }
        } else {
          // Arena: use PLAYER_DISCONNECTED event for in-match UI
          this.server.to(roomCode).emit(WS_EVENTS.PLAYER_DISCONNECTED, {
            playerId: userId,
            roomCode,
          });
        }

        const timerKey = `${roomCode}:${userId}`;
        // Clear any existing grace timer for this player (e.g. multiple disconnects)
        this.clearGraceTimer(timerKey);

        const timer = setTimeout(async () => {
          this.graceTimers.delete(timerKey);
          try {
            const currentState = await this.roomsService.getRoomState(roomCode);
            // If the player reconnected during the grace period, their disconnected flag
            // was cleared by handleRejoin. Abort to avoid removing a live player.
            const player = currentState?.players.find((p) => p.id === userId);
            if (!player || !player.disconnected) return;

            const wasPlaying = currentState.status === 'playing';

            const updatedState = await this.roomsService.leaveRoom(roomCode, userId);
            if (updatedState) {
              this.server.to(roomCode).emit(WS_EVENTS.LOBBY_STATE, updatedState);
              if (wasPlaying) {
                await this.checkMatchEndAfterDisconnect(roomCode);
              }
            } else {
              // Room empty — finalize
              this.clearMatchTimeout(roomCode);
              this.clearAllGraceTimersForRoom(roomCode);
              await this.matchStateService.cleanupMatch(roomCode);
            }
          } catch (err) {
            this.logger.error(`Error in grace period expiry for ${userId} in ${roomCode}`, err);
          }
        }, DISCONNECT_GRACE_PERIOD_MS);

        this.graceTimers.set(timerKey, timer);
      } else {
        // Room finished — leave immediately
        const state = await this.roomsService.leaveRoom(roomCode, userId);
        if (state) {
          this.server.to(roomCode).emit(WS_EVENTS.LOBBY_STATE, state);
        } else {
          // Room empty — finalize
          this.clearMatchTimeout(roomCode);
          await this.matchStateService.cleanupMatch(roomCode);
        }
      }
    } catch (err) {
      this.logger.error(
        `Error cleaning up disconnect for ${userId} in room ${roomCode}`,
        err,
      );
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
      const userInfo = {
        id: userId,
        displayName: user?.displayName ?? client.data.user.displayName,
        avatarUrl: user?.avatarUrl ?? null,
        countryCode: user?.countryCode ?? null,
      };

      let autoSpectate = false;
      let state;
      try {
        state = await this.roomsService.joinRoom(data.code, userId, userInfo);
      } catch (joinErr: any) {
        if (joinErr.message === ROOM_ERROR_CODES.ROOM_FULL) {
          // Player slots full — try auto-spectate
          try {
            state = await this.roomsService.joinAsSpectator(data.code, userId, userInfo);
            autoSpectate = true;
          } catch (spectatorErr: any) {
            if (spectatorErr.message === ROOM_ERROR_CODES.SPECTATORS_FULL) {
              // Both slots full — send rich error with actual counts
              const roomStateForError = await this.roomsService.getRoomState(data.code);
              return client.emit(WS_EVENTS.LOBBY_ERROR, {
                code: ROOM_ERROR_CODES.SPECTATORS_FULL,
                playerCount: roomStateForError?.players.length ?? 0,
                maxPlayers: roomStateForError?.maxPlayers ?? 0,
                spectatorCount: roomStateForError?.spectators.length ?? 0,
                maxSpectators: MAX_SPECTATORS,
              });
            }
            throw spectatorErr;
          }
        } else {
          throw joinErr;
        }
      }

      // Reset disconnected flag if player was marked as disconnected (rejoin after disconnect)
      if (!autoSpectate) {
        await this.roomsService.markPlayerConnected(data.code, userId);
        this.clearGraceTimer(`${data.code}:${userId}`);
        state = await this.roomsService.getRoomState(data.code) as typeof state;
      }

      client.join(data.code);
      this.connections.set(client.id, {
        userId,
        roomCode: data.code,
        role: autoSpectate ? 'spectator' : 'player',
      });

      this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);

      if (autoSpectate) {
        client.emit(WS_EVENTS.LOBBY_AUTO_SPECTATE, { message: 'Sala llena - te uniste como espectador' });
      }
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_SPECTATE)
  async handleSpectateJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const userId = client.data.user.sub;
      const user = await this.usersService.findById(userId);

      const state = await this.roomsService.joinAsSpectator(data.code, userId, {
        id: userId,
        displayName: user?.displayName ?? client.data.user.displayName,
        avatarUrl: user?.avatarUrl ?? null,
        countryCode: user?.countryCode ?? null,
      });

      client.join(data.code);
      this.connections.set(client.id, {
        userId,
        roomCode: data.code,
        role: 'spectator',
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
      } else {
        // Room empty — finalize
        await this.matchStateService.cleanupMatch(data.code);
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
      if (this.isSpectator(client.id)) return;
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
      if (this.isSpectator(client.id)) return;
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

  @SubscribeMessage(WS_EVENTS.LOBBY_SET_MAX_PLAYERS)
  async handleSetMaxPlayers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; maxPlayers: number },
  ) {
    try {
      if (this.isSpectator(client.id)) return;
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }
      if (!Number.isInteger(data.maxPlayers) || data.maxPlayers < 2 || data.maxPlayers > 20) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Máximo de jugadores inválido (2-20)' });
      }

      const userId = client.data.user.sub;
      await this.roomsService.setMaxPlayers(data.code, userId, data.maxPlayers);
      const state = await this.roomsService.getRoomState(data.code);
      if (state) {
        this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
      }
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_SET_TIME_LIMIT)
  async handleSetTimeLimit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; timeLimit: number },
  ) {
    try {
      if (this.isSpectator(client.id)) return;
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }
      if (!isValidTimeLimit(data.timeLimit)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Límite de tiempo inválido' });
      }

      const userId = client.data.user.sub;
      await this.roomsService.setTimeLimit(data.code, userId, data.timeLimit);
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
      if (this.isSpectator(client.id)) return;
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
          'Todos los jugadores deben estar listos para iniciar',
        );
      }

      // Select a random text based on room difficulty level
      const text = await this.textsService.getRandomByLevel(state.level);
      if (!text) {
        throw new Error('No hay textos disponibles para este nivel de dificultad');
      }

      await this.roomsService.setRoomStatus(data.code, 'playing');

      // Re-fetch state after setting ready to get updated players list
      const updatedState = await this.roomsService.getRoomState(data.code);
      if (!updatedState || updatedState.players.length === 0) {
        await this.roomsService.setRoomStatus(data.code, 'waiting');
        return client.emit(WS_EVENTS.LOBBY_ERROR, {
          message: 'No se pudo obtener el estado de la sala',
        });
      }

      const playerIds = updatedState.players.map((p) => p.id);

      // Initialize match state in Redis
      await this.matchStateService.initMatch(
        data.code,
        playerIds,
        text.id,
        text.content,
      );

      this.server.to(data.code).emit(WS_EVENTS.MATCH_START, {
        code: data.code,
        textId: text.id,
        textContent: text.content,
        players: updatedState.players,
      });

      // Start match timeout — use room's timeLimit or default
      const roomTimeLimit = await this.roomsService.getTimeLimit(data.code);
      const effectiveTimeout = roomTimeLimit > 0 ? roomTimeLimit : MATCH_TIMEOUT_MS;
      this.startMatchTimeout(data.code, effectiveTimeout);
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.CARET_UPDATE)
  async handleCaretUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { position: number; timestamp: number },
  ) {
    try {
      if (this.isSpectator(client.id)) return;
      if (!Number.isInteger(data?.position) || !Number.isInteger(data?.timestamp) || data.timestamp <= 0) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Payload de caret inválido' });
      }

      // Server-side caret throttle: drop if > 25 events/sec per socket
      const now = Date.now();
      const lastTs = this.lastCaretTimestamp.get(client.id) ?? 0;
      if (now - lastTs < CARET_THROTTLE_MIN_INTERVAL_MS) {
        return; // Silent drop
      }
      this.lastCaretTimestamp.set(client.id, now);

      const conn = this.connections.get(client.id);
      if (!conn) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'No estás en una sala' });
      }

      const roomState = await this.roomsService.getRoomState(conn.roomCode);
      if (!roomState || roomState.status !== 'playing') {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'La partida no está en curso' });
      }

      const result = await this.matchStateService.updatePosition(
        conn.roomCode,
        conn.userId,
        data.position,
      );

      if (result === 'cheat') {
        return; // Silent drop — no feedback to avoid revealing detection threshold
      }

      if (result === 'not_found') {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Jugador no encontrado en la partida' });
      }

      // Broadcast to all in room except sender (volatile for performance)
      client.volatile.to(conn.roomCode).emit(WS_EVENTS.CARET_SYNC, {
        playerId: conn.userId,
        position: data.position,
        timestamp: data.timestamp,
      });
    } catch (err: any) {
      this.logger.error(`Error in caret update: ${err.message}`);
    }
  }

  @SubscribeMessage(WS_EVENTS.PLAYER_FINISH)
  async handlePlayerFinish(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PlayerFinishClientPayload,
  ) {
    try {
      if (this.isSpectator(client.id)) return;
      const conn = this.connections.get(client.id);
      if (!conn) return;

      const totalKeystrokes = data?.totalKeystrokes ?? 0;
      const errorKeystrokes = data?.errorKeystrokes ?? 0;

      await this.handlePlayerFinishInternal(
        conn.roomCode,
        conn.userId,
        totalKeystrokes,
        errorKeystrokes,
      );
    } catch (err: any) {
      this.logger.error(`Error in player finish: ${err.message}`);
    }
  }

  @SubscribeMessage(WS_EVENTS.MATCH_REMATCH)
  async handleRematch(@ConnectedSocket() client: Socket) {
    try {
      const conn = this.connections.get(client.id);
      if (!conn) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, {
          message: 'No estás en una sala',
        });
      }

      const roomState = await this.roomsService.getRoomState(conn.roomCode);
      if (!roomState || roomState.status !== 'finished') {
        return client.emit(WS_EVENTS.LOBBY_ERROR, {
          message: 'La partida no ha terminado',
        });
      }

      // Cleanup match state
      await this.matchStateService.cleanupMatch(conn.roomCode);
      this.clearMatchTimeout(conn.roomCode);
      this.clearAllGraceTimersForRoom(conn.roomCode);

      // Reset room to waiting
      await this.roomsService.setRoomStatus(conn.roomCode, 'waiting');
      await this.resetAllPlayersReady(conn.roomCode, roomState.players.map((p) => p.id));

      const newState = await this.roomsService.getRoomState(conn.roomCode);
      if (newState) {
        this.server.to(conn.roomCode).emit(WS_EVENTS.LOBBY_STATE, newState);
      }
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_REJOIN)
  async handleRejoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LobbyRejoinPayload,
  ) {
    try {
      if (!data?.roomCode || typeof data.roomCode !== 'string' || !ROOM_CODE_REGEX.test(data.roomCode)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const userId = client.data.user.sub;
      const roomCode = data.roomCode;

      // Check if user is a spectator
      const isSpectator = await this.roomsService.isSpectatorInRoom(roomCode, userId);

      if (isSpectator) {
        // Cancel spectator grace timer if one was running
        const spectatorTimerKey = `spectator:${roomCode}:${userId}`;
        this.clearGraceTimer(spectatorTimerKey);

        const roomState = await this.roomsService.getRoomState(roomCode);
        if (!roomState) {
          return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Sala no encontrada' });
        }

        this.connections.set(client.id, { userId, roomCode, role: 'spectator' });
        client.join(roomCode);

        // Build matchState for spectator rejoin (same as player rejoin, without local position)
        const spectatorMatchState = await this.buildSpectatorMatchState(roomCode, roomState);

        const rejoinPayload: RejoinStatePayload = {
          roomCode,
          roomState,
          matchState: spectatorMatchState,
        };
        client.emit(WS_EVENTS.REJOIN_STATE, rejoinPayload);
        return;
      }

      // Cancel grace period timer immediately — before any async operations — to
      // close the TOCTOU window between isPlayerInRoom check and timer expiry
      const timerKey = `${roomCode}:${userId}`;
      this.clearGraceTimer(timerKey);

      // Verify player is still in room (within grace period)
      const inRoom = await this.roomsService.isPlayerInRoom(roomCode, userId);
      if (!inRoom) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Ya no estás en esta sala' });
      }

      const roomState = await this.roomsService.getRoomState(roomCode);
      if (!roomState) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Sala no encontrada' });
      }

      // Mark player as connected
      await this.roomsService.markPlayerConnected(roomCode, userId);

      // Register new socket connection
      this.connections.set(client.id, { userId, roomCode, role: 'player' });
      client.join(roomCode);

      // Build rejoin state payload before broadcasting, so state is consistent
      // when other clients receive PLAYER_RECONNECTED
      let matchState: RejoinMatchState | null = null;

      if (roomState.status === 'playing') {
        const matchMeta = await this.matchStateService.getMatchMetadata(roomCode);
        const playerMatchState = await this.matchStateService.getPlayerMatchState(roomCode, userId);
        const allPositions = await this.matchStateService.getAllPlayerPositions(roomCode);

        if (matchMeta && playerMatchState) {
          // Build players array with disconnected status from room state
          const players: RejoinPlayerState[] = allPositions.map((pp) => {
            const roomPlayer = roomState.players.find((rp) => rp.id === pp.playerId);
            return {
              playerId: pp.playerId,
              displayName: roomPlayer?.displayName ?? 'Unknown',
              colorIndex: roomPlayer?.colorIndex ?? 0,
              position: pp.position,
              finished: pp.finished,
              disconnected: pp.playerId === userId ? false : (roomPlayer?.disconnected ?? false),
            };
          });

          matchState = {
            textContent: matchMeta.textContent,
            textId: matchMeta.textId,
            startedAt: matchMeta.startedAt,
            localPosition: playerMatchState.position,
            localErrors: playerMatchState.errors,
            localTotalKeystrokes: playerMatchState.totalKeystrokes ?? 0,
            localErrorKeystrokes: playerMatchState.errorKeystrokes ?? 0,
            localFinished: !!playerMatchState.finishedAt,
            localFinishedAt: playerMatchState.finishedAt ?? null,
            players,
          };
        }
      }

      // Refresh room state to include reconnected status
      const updatedRoomState = await this.roomsService.getRoomState(roomCode);

      const rejoinPayload: RejoinStatePayload = {
        roomCode,
        roomState: updatedRoomState ?? roomState,
        matchState,
      };

      // Broadcast reconnection to room, then send full state to reconnecting socket
      this.server.to(roomCode).emit(WS_EVENTS.PLAYER_RECONNECTED, {
        playerId: userId,
        roomCode,
      });
      client.emit(WS_EVENTS.REJOIN_STATE, rejoinPayload);
    } catch (err: any) {
      this.logger.error(`Error in rejoin: ${err.message}`);
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_SWITCH_TO_SPECTATOR)
  async handleSwitchToSpectator(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const conn = this.connections.get(client.id);
      if (!conn || conn.role !== 'player') return;

      const userId = client.data.user.sub;
      const user = await this.usersService.findById(userId);

      const state = await this.roomsService.switchToSpectator(data.code, userId, {
        id: userId,
        displayName: user?.displayName ?? client.data.user.displayName,
        avatarUrl: user?.avatarUrl ?? null,
        countryCode: user?.countryCode ?? null,
      });

      this.connections.set(client.id, { userId, roomCode: data.code, role: 'spectator' });
      this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_SWITCH_TO_PLAYER)
  async handleSwitchToPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }

      const conn = this.connections.get(client.id);
      if (!conn || conn.role !== 'spectator') return;

      const userId = client.data.user.sub;
      const user = await this.usersService.findById(userId);

      const state = await this.roomsService.switchToPlayer(data.code, userId, {
        id: userId,
        displayName: user?.displayName ?? client.data.user.displayName,
        avatarUrl: user?.avatarUrl ?? null,
        countryCode: user?.countryCode ?? null,
      });

      this.connections.set(client.id, { userId, roomCode: data.code, role: 'player' });
      this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, state);
    } catch (err: any) {
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.PLAYER_ABANDON)
  async handlePlayerAbandon(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { totalKeystrokes: number; errorKeystrokes: number },
  ): Promise<void> {
    try {
      if (this.isSpectator(client.id)) return;
      const conn = this.connections.get(client.id);
      if (!conn) return;

      const roomState = await this.roomsService.getRoomState(conn.roomCode);
      if (!roomState || roomState.status !== 'playing') return; // silently ignore

      const alreadyFinished = await this.matchStateService.isPlayerFinished(conn.roomCode, conn.userId);
      if (alreadyFinished) return;

      await this.handlePlayerFinishInternal(
        conn.roomCode,
        conn.userId,
        data?.totalKeystrokes ?? 0,
        data?.errorKeystrokes ?? 0,
      );
    } catch (err: any) {
      this.logger.error(`Error in player abandon: ${err.message}`);
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_KICK_PLAYER)
  async handleKickPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; targetUserId: string },
  ): Promise<void> {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }
      if (!data?.targetUserId || typeof data.targetUserId !== 'string') {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Usuario objetivo inválido' });
      }

      const conn = this.connections.get(client.id);
      if (!conn || conn.role !== 'player') return;
      if (conn.roomCode !== data.code) return;

      const roomState = await this.roomsService.getRoomState(data.code);
      if (!roomState || roomState.status !== 'waiting') return;

      // Verify caller is the host
      if (roomState.hostId !== conn.userId) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Solo el host puede expulsar jugadores' });
      }

      // Prevent host from kicking themselves
      if (data.targetUserId === conn.userId) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'No puedes expulsarte a ti mismo' });
      }

      // Notify and remove ALL sockets of the target user in this room (handles multi-tab)
      const targetSocketIds = this.findAllSocketIdsByUserId(data.targetUserId, data.code);
      for (const sid of targetSocketIds) {
        this.server.to(sid).emit(WS_EVENTS.LOBBY_KICKED, { message: 'El host te sacó de la partida' });
        this.server.in(sid).socketsLeave(data.code);
        this.connections.delete(sid);
      }

      const updatedState = await this.roomsService.leaveRoom(data.code, data.targetUserId);
      if (updatedState) {
        this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, updatedState);
      }
    } catch (err: any) {
      this.logger.error(`Error in kick player: ${err.message}`);
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(WS_EVENTS.LOBBY_MOVE_TO_SPECTATOR)
  async handleMoveToSpectator(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; targetUserId: string },
  ): Promise<void> {
    try {
      if (!data?.code || typeof data.code !== 'string' || !ROOM_CODE_REGEX.test(data.code)) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Código de sala inválido' });
      }
      if (!data?.targetUserId || typeof data.targetUserId !== 'string') {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Usuario objetivo inválido' });
      }

      const conn = this.connections.get(client.id);
      if (!conn || conn.role !== 'player') return;
      if (conn.roomCode !== data.code) return;

      const roomState = await this.roomsService.getRoomState(data.code);
      if (!roomState || roomState.status !== 'waiting') return;

      // Verify caller is the host
      if (roomState.hostId !== conn.userId) {
        return client.emit(WS_EVENTS.LOBBY_ERROR, { message: 'Solo el host puede mover jugadores' });
      }

      // Get target user info for spectator slot
      const targetUser = await this.usersService.findById(data.targetUserId);
      const targetPlayer = roomState.players.find((p) => p.id === data.targetUserId);
      if (!targetPlayer) return;

      const updatedState = await this.roomsService.switchToSpectator(data.code, data.targetUserId, {
        id: data.targetUserId,
        displayName: targetUser?.displayName ?? targetPlayer.displayName,
        avatarUrl: targetUser?.avatarUrl ?? null,
        countryCode: targetUser?.countryCode ?? null,
      });

      // Update target's role in connections
      const targetSocketId = this.findSocketIdByUserId(data.targetUserId, data.code);
      if (targetSocketId) {
        this.connections.set(targetSocketId, {
          userId: data.targetUserId,
          roomCode: data.code,
          role: 'spectator',
        });
        this.server.to(targetSocketId).emit(WS_EVENTS.LOBBY_MOVED_TO_SPECTATOR, {
          message: 'El host te cambió a espectador',
        });
      }

      this.server.to(data.code).emit(WS_EVENTS.LOBBY_STATE, updatedState);
    } catch (err: any) {
      this.logger.error(`Error in move to spectator: ${err.message}`);
      client.emit(WS_EVENTS.LOBBY_ERROR, { message: err.message });
    }
  }

  private async handlePlayerFinishInternal(
    roomCode: string,
    userId: string,
    totalKeystrokes: number,
    errorKeystrokes: number,
  ): Promise<void> {
    const alreadyFinished = await this.matchStateService.isPlayerFinished(
      roomCode,
      userId,
    );
    // Skip solo si ya terminó Y no tenemos keystrokes reales para actualizar
    if (alreadyFinished && totalKeystrokes === 0) return;

    const finishResult = await this.matchStateService.markPlayerFinished(
      roomCode,
      userId,
      totalKeystrokes,
      errorKeystrokes,
    );
    if (!finishResult) return;

    // Get player info for broadcast
    const roomState = await this.roomsService.getRoomState(roomCode);
    const playerInfo = roomState?.players.find((p) => p.id === userId);

    const matchData = await this.matchStateService.getMatchState(roomCode);
    const playerState = matchData[userId];
    const startedAt = await this.matchStateService.getMatchStartedAt(roomCode);

    const elapsedMs = Math.max(
      startedAt
        ? new Date(finishResult.finishedAt).getTime() -
          new Date(startedAt).getTime()
        : 0,
      0,
    );
    const elapsedMinutes = elapsedMs / 60_000;
    const trunc2 = (n: number) => Math.trunc(n * 100) / 100;
    const wpm =
      elapsedMinutes > 0
        ? trunc2((finishResult.position / 5) / elapsedMinutes)
        : 0;

    const tks = playerState?.totalKeystrokes ?? totalKeystrokes;
    const eks = Math.min(playerState?.errorKeystrokes ?? errorKeystrokes, tks);
    const precisionDecimal = tks > 0 ? trunc2((tks - eks) / tks) : 1.0;
    const precision = Math.round(precisionDecimal * 100);

    // Broadcast PLAYER_FINISH (reliable, not volatile)
    this.server.to(roomCode).emit(WS_EVENTS.PLAYER_FINISH, {
      playerId: userId,
      displayName: playerInfo?.displayName ?? 'Unknown',
      colorIndex: playerInfo?.colorIndex ?? 0,
      position: finishResult.position,
      wpm,
      precision,
      finishedAt: finishResult.finishedAt,
    });

    // Solo verificar fin del match si el jugador no estaba ya marcado
    if (!alreadyFinished) {
      const allFinished =
        await this.matchStateService.areAllPlayersFinished(roomCode);
      if (allFinished) {
        await this.endMatch(roomCode, 'all_finished');
      }
    }
  }

  private async endMatch(
    roomCode: string,
    reason: 'all_finished' | 'timeout',
  ): Promise<void> {
    // Atomic status transition: only the first caller wins the race
    const acquired = await this.roomsService.setRoomStatusAtomically(
      roomCode,
      'finished',
    );
    if (!acquired) return;

    this.clearMatchTimeout(roomCode);
    this.clearAllGraceTimersForRoom(roomCode);

    // Fetch player info after acquiring the "lock"
    const roomState = await this.roomsService.getRoomState(roomCode);
    const playerInfoMap: Record<
      string,
      { displayName: string; colorIndex: number; countryCode: string | null }
    > = {};
    if (roomState) {
      for (const p of roomState.players) {
        playerInfoMap[p.id] = {
          displayName: p.displayName,
          colorIndex: p.colorIndex,
          countryCode: p.countryCode,
        };
      }
    }

    const results = await this.matchStateService.calculateResults(
      roomCode,
      playerInfoMap,
    );

    await this.matchStateService.cleanupMatch(roomCode);

    this.server.to(roomCode).emit(WS_EVENTS.MATCH_END, {
      roomCode,
      results,
      reason,
    });
  }

  private startMatchTimeout(roomCode: string, timeoutMs: number = MATCH_TIMEOUT_MS): void {
    this.clearMatchTimeout(roomCode);
    const timeout = setTimeout(() => {
      this.matchTimeouts.delete(roomCode);
      this.endMatch(roomCode, 'timeout').catch((err) => {
        this.logger.error(
          `Error ending match by timeout for ${roomCode}: ${err.message}`,
        );
      });
    }, timeoutMs);
    this.matchTimeouts.set(roomCode, timeout);
  }

  private clearMatchTimeout(roomCode: string): void {
    const timeout = this.matchTimeouts.get(roomCode);
    if (timeout) {
      clearTimeout(timeout);
      this.matchTimeouts.delete(roomCode);
    }
  }

  private clearGraceTimer(timerKey: string): void {
    const timer = this.graceTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(timerKey);
    }
  }

  private clearAllGraceTimersForRoom(roomCode: string): void {
    for (const [key, timer] of this.graceTimers.entries()) {
      // Player keys: `${roomCode}:${userId}`
      // Spectator keys: `spectator:${roomCode}:${userId}`
      if (key.startsWith(`${roomCode}:`) || key.startsWith(`spectator:${roomCode}:`)) {
        clearTimeout(timer);
        this.graceTimers.delete(key);
      }
    }
  }

  private async checkMatchEndAfterDisconnect(roomCode: string): Promise<void> {
    const roomState = await this.roomsService.getRoomState(roomCode);
    if (!roomState || roomState.status !== 'playing') return;

    // Check if all remaining (non-disconnected) players have finished
    const matchStates = await this.matchStateService.getMatchState(roomCode);
    const activePlayers = roomState.players.filter((p) => !p.disconnected);

    if (activePlayers.length === 0) {
      // All players disconnected — end match
      await this.endMatch(roomCode, 'timeout');
      return;
    }

    const allActiveFinished = activePlayers.every((p) => {
      const ms = matchStates[p.id];
      return ms && !!ms.finishedAt;
    });

    if (allActiveFinished) {
      await this.endMatch(roomCode, 'all_finished');
    }
  }

  private isSpectator(socketId: string): boolean {
    const conn = this.connections.get(socketId);
    return conn?.role === 'spectator';
  }

  private findSocketIdByUserId(userId: string, roomCode: string): string | undefined {
    for (const [socketId, conn] of this.connections.entries()) {
      if (conn.userId === userId && conn.roomCode === roomCode) {
        return socketId;
      }
    }
    return undefined;
  }

  private findAllSocketIdsByUserId(userId: string, roomCode: string): string[] {
    const socketIds: string[] = [];
    for (const [socketId, conn] of this.connections.entries()) {
      if (conn.userId === userId && conn.roomCode === roomCode) {
        socketIds.push(socketId);
      }
    }
    return socketIds;
  }

  private countUserConnections(userId: string): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) count++;
    }
    return count;
  }

  private countUserConnectionsInRoom(userId: string, roomCode: string): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.userId === userId && conn.roomCode === roomCode) count++;
    }
    return count;
  }

  // Builds match state for a spectator rejoin — all player positions, no local input state.
  private async buildSpectatorMatchState(
    roomCode: string,
    roomState: import('@ultimatype-monorepo/shared').RoomState,
  ): Promise<RejoinMatchState | null> {
    if (roomState.status !== 'playing') return null;

    const matchMeta = await this.matchStateService.getMatchMetadata(roomCode);
    const allPositions = await this.matchStateService.getAllPlayerPositions(roomCode);

    if (!matchMeta) return null;

    const players: RejoinPlayerState[] = allPositions.map((pp) => {
      const roomPlayer = roomState.players.find((rp) => rp.id === pp.playerId);
      return {
        playerId: pp.playerId,
        displayName: roomPlayer?.displayName ?? 'Unknown',
        colorIndex: roomPlayer?.colorIndex ?? 0,
        position: pp.position,
        finished: pp.finished,
        disconnected: roomPlayer?.disconnected ?? false,
      };
    });

    return {
      textContent: matchMeta.textContent,
      textId: matchMeta.textId,
      startedAt: matchMeta.startedAt,
      localPosition: 0,
      localErrors: 0,
      localTotalKeystrokes: 0,
      localErrorKeystrokes: 0,
      localFinished: false,
      localFinishedAt: null,
      players,
    };
  }

  private async resetAllPlayersReady(
    roomCode: string,
    playerIds: string[],
  ): Promise<void> {
    for (const playerId of playerIds) {
      await this.roomsService.setReady(roomCode, playerId, false);
    }
  }
}
