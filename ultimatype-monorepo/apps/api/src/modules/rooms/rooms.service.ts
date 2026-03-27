import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { customAlphabet } from 'nanoid';
import { REDIS_CLIENT } from '../../redis/redis.module';
import {
  PlayerInfo,
  RoomState,
  MAX_PLAYERS,
  isValidLevel,
} from '@ultimatype-monorepo/shared';

const generateRoomCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

const ROOM_TTL = 86400; // 24 hours
const MAX_CODE_ATTEMPTS = 5;

interface UserInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

// Lua script: atomic join with capacity check, color assignment, and TTL refresh
const JOIN_ROOM_LUA = `
local roomKey = KEYS[1]
local playersKey = KEYS[2]
local userId = ARGV[1]
local displayName = ARGV[2]
local avatarUrl = ARGV[3]
local maxPlayers = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local joinedAt = ARGV[6]

local roomCode = redis.call('HGET', roomKey, 'code')
if not roomCode then
  return redis.error_reply('Sala no encontrada')
end

local status = redis.call('HGET', roomKey, 'status')
if status ~= 'waiting' then
  return redis.error_reply('La partida ya ha comenzado')
end

local existing = redis.call('HGET', playersKey, userId)
if existing then
  return 'ALREADY_IN_ROOM'
end

local count = redis.call('HLEN', playersKey)
if count >= maxPlayers then
  return redis.error_reply('La sala esta llena (maximo 20 jugadores)')
end

local allPlayers = redis.call('HVALS', playersKey)
local usedColors = {}
for _, pJson in ipairs(allPlayers) do
  local p = cjson.decode(pJson)
  usedColors[p.colorIndex] = true
end
local colorIndex = 0
for i = 0, maxPlayers - 1 do
  if not usedColors[i] then
    colorIndex = i
    break
  end
end

local player = cjson.encode({
  id = userId,
  displayName = displayName,
  avatarUrl = avatarUrl ~= '' and avatarUrl or cjson.null,
  colorIndex = colorIndex,
  isReady = false,
  joinedAt = joinedAt
})

redis.call('HSET', playersKey, userId, player)
redis.call('EXPIRE', roomKey, ttl)
redis.call('EXPIRE', playersKey, ttl)

return 'OK'
`;

// Lua script: atomic leave with host promotion by joinedAt
const LEAVE_ROOM_LUA = `
local roomKey = KEYS[1]
local playersKey = KEYS[2]
local userId = ARGV[1]
local ttl = tonumber(ARGV[2])

redis.call('HDEL', playersKey, userId)

local count = redis.call('HLEN', playersKey)
if count == 0 then
  redis.call('DEL', roomKey, playersKey)
  return 'EMPTY'
end

local hostId = redis.call('HGET', roomKey, 'hostId')
if hostId == userId then
  local allData = redis.call('HGETALL', playersKey)
  local oldestId = nil
  local oldestTime = nil
  for i = 1, #allData, 2 do
    local p = cjson.decode(allData[i + 1])
    if not oldestTime or p.joinedAt < oldestTime then
      oldestId = allData[i]
      oldestTime = p.joinedAt
    end
  end
  if oldestId then
    redis.call('HSET', roomKey, 'hostId', oldestId)
  end
end

redis.call('EXPIRE', roomKey, ttl)
redis.call('EXPIRE', playersKey, ttl)

return 'OK'
`;

@Injectable()
export class RoomsService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async createRoom(
    hostId: string,
    hostInfo: UserInfo,
  ): Promise<RoomState> {
    let code: string;
    let roomKey: string;
    let attempts = 0;

    do {
      code = generateRoomCode();
      roomKey = `room:${code}`;
      attempts++;
    } while (await this.redis.exists(roomKey) && attempts < MAX_CODE_ATTEMPTS);

    if (attempts >= MAX_CODE_ATTEMPTS) {
      throw new Error('No se pudo generar un código único, intenta de nuevo');
    }

    const playersKey = `room:${code}:players`;
    const now = new Date().toISOString();

    await this.redis.hset(roomKey, {
      code,
      hostId,
      level: '1',
      status: 'waiting',
      createdAt: now,
      maxPlayers: String(MAX_PLAYERS),
    });

    const player: PlayerInfo = {
      id: hostInfo.id,
      displayName: hostInfo.displayName,
      avatarUrl: hostInfo.avatarUrl,
      colorIndex: 0,
      isReady: false,
      joinedAt: now,
    };

    await this.redis.hset(playersKey, hostId, JSON.stringify(player));
    await this.refreshTTL(code);

    return {
      code,
      hostId,
      level: 1,
      status: 'waiting',
      players: [player],
      maxPlayers: MAX_PLAYERS,
    };
  }

  async joinRoom(
    code: string,
    userId: string,
    userInfo: UserInfo,
  ): Promise<RoomState> {
    const roomKey = `room:${code}`;
    const playersKey = `room:${code}:players`;
    const now = new Date().toISOString();

    const result = await this.redis.eval(
      JOIN_ROOM_LUA,
      2,
      roomKey,
      playersKey,
      userId,
      userInfo.displayName,
      userInfo.avatarUrl ?? '',
      String(MAX_PLAYERS),
      String(ROOM_TTL),
      now,
    ) as string;

    if (result === 'ALREADY_IN_ROOM') {
      return this.getRoomState(code) as Promise<RoomState>;
    }

    return this.getRoomState(code) as Promise<RoomState>;
  }

  async leaveRoom(
    code: string,
    userId: string,
  ): Promise<RoomState | null> {
    const roomKey = `room:${code}`;
    const playersKey = `room:${code}:players`;

    const result = await this.redis.eval(
      LEAVE_ROOM_LUA,
      2,
      roomKey,
      playersKey,
      userId,
      String(ROOM_TTL),
    ) as string;

    if (result === 'EMPTY') {
      return null;
    }

    return this.getRoomState(code);
  }

  async getRoomState(code: string): Promise<RoomState | null> {
    const roomKey = `room:${code}`;
    const playersKey = `room:${code}:players`;

    const roomData = await this.redis.hgetall(roomKey);
    if (!roomData.code) {
      return null;
    }

    const players = await this.getPlayers(playersKey);

    return {
      code: roomData.code,
      hostId: roomData.hostId,
      level: Number(roomData.level),
      status: roomData.status as RoomState['status'],
      players,
      maxPlayers: Number(roomData.maxPlayers),
    };
  }

  async setLevel(
    code: string,
    userId: string,
    level: number,
  ): Promise<void> {
    const roomKey = `room:${code}`;
    const roomData = await this.redis.hgetall(roomKey);

    if (!roomData.code) {
      throw new Error('Sala no encontrada');
    }

    if (roomData.hostId !== userId) {
      throw new Error('Solo el host puede cambiar el nivel');
    }

    if (!isValidLevel(level)) {
      throw new Error('Nivel inválido (1-5)');
    }

    await this.redis.hset(roomKey, 'level', String(level));
    await this.refreshTTL(code);
  }

  async setReady(
    code: string,
    userId: string,
    ready: boolean,
  ): Promise<void> {
    const playersKey = `room:${code}:players`;

    const playerJson = await this.redis.hget(playersKey, userId);
    if (!playerJson) {
      throw new Error('Jugador no encontrado en la sala');
    }

    const player: PlayerInfo = JSON.parse(playerJson);
    player.isReady = ready;
    await this.redis.hset(playersKey, userId, JSON.stringify(player));
    await this.refreshTTL(code);
  }

  async canStart(code: string): Promise<boolean> {
    const playersKey = `room:${code}:players`;
    const players = await this.getPlayers(playersKey);

    if (players.length < 2) return false;
    return players.every((p) => p.isReady);
  }

  async setRoomStatus(
    code: string,
    status: RoomState['status'],
  ): Promise<void> {
    const roomKey = `room:${code}`;
    await this.redis.hset(roomKey, 'status', status);
  }

  private async refreshTTL(code: string): Promise<void> {
    const roomKey = `room:${code}`;
    const playersKey = `room:${code}:players`;
    await Promise.all([
      this.redis.expire(roomKey, ROOM_TTL),
      this.redis.expire(playersKey, ROOM_TTL),
    ]);
  }

  private async getPlayers(playersKey: string): Promise<PlayerInfo[]> {
    const playersHash = await this.redis.hgetall(playersKey);
    return Object.values(playersHash).map((json) => JSON.parse(json));
  }
}
