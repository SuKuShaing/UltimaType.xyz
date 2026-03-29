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
  MATCH_TIMEOUT_MS,
  DISCONNECT_GRACE_PERIOD_MS,
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
    { userId: string; roomCode: string }
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

    const { userId, roomCode } = conn;

    try {
      const roomState = await this.roomsService.getRoomState(roomCode);
      if (!roomState) return;

      // Grace period for playing/waiting rooms — give player time to reconnect
      if (roomState.status === 'playing' || roomState.status === 'waiting') {
        await this.roomsService.markPlayerDisconnected(roomCode, userId);
        this.server.to(roomCode).emit(WS_EVENTS.PLAYER_DISCONNECTED, {
          playerId: userId,
          roomCode,
        });

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

      // Start match timeout
      this.startMatchTimeout(data.code);
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
      this.connections.set(client.id, { userId, roomCode });
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
      { displayName: string; colorIndex: number }
    > = {};
    if (roomState) {
      for (const p of roomState.players) {
        playerInfoMap[p.id] = {
          displayName: p.displayName,
          colorIndex: p.colorIndex,
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

  private startMatchTimeout(roomCode: string): void {
    this.clearMatchTimeout(roomCode);
    const timeout = setTimeout(() => {
      this.matchTimeouts.delete(roomCode);
      this.endMatch(roomCode, 'timeout').catch((err) => {
        this.logger.error(
          `Error ending match by timeout for ${roomCode}: ${err.message}`,
        );
      });
    }, MATCH_TIMEOUT_MS);
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
      if (key.startsWith(`${roomCode}:`)) {
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

  private countUserConnections(userId: string): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) count++;
    }
    return count;
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
