import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

const MATCH_TTL = 3600; // 1 hour

interface PlayerMatchState {
  position: number;
  errors: number;
  startedAt: string;
}

// Lua: atomic validate-then-update position (anti-cheat)
// Returns 1 = valid, 0 = invalid jump, -1 = player not found
const UPDATE_POSITION_LUA = `
local current = redis.call('HGET', KEYS[1], ARGV[1])
if not current then return -1 end
local data = cjson.decode(current)
local newPos = tonumber(ARGV[2])
if newPos < 0 then return 0 end
local diff = newPos - data.position
if diff == 1 or diff == -1 then
  data.position = newPos
  redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(data))
  return 1
end
return 0
`;

@Injectable()
export class MatchStateService {
  private readonly logger = new Logger(MatchStateService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async initMatch(
    roomCode: string,
    playerIds: string[],
    textId: number,
    textContent: string,
  ): Promise<void> {
    if (playerIds.length === 0) {
      throw new Error(`No hay jugadores para inicializar el match: ${roomCode}`);
    }

    const matchKey = `match:${roomCode}`;
    const playersKey = `match:${roomCode}:players`;
    const now = new Date().toISOString();

    await this.redis.hset(matchKey, {
      textId: String(textId),
      textContent,
      status: 'playing',
      startedAt: now,
    });

    for (const playerId of playerIds) {
      const state: PlayerMatchState = {
        position: 0,
        errors: 0,
        startedAt: now,
      };
      await this.redis.hset(playersKey, playerId, JSON.stringify(state));
    }

    await Promise.all([
      this.redis.expire(matchKey, MATCH_TTL),
      this.redis.expire(playersKey, MATCH_TTL),
    ]);
  }

  async updatePosition(
    roomCode: string,
    userId: string,
    newPosition: number,
  ): Promise<'valid' | 'cheat' | 'not_found'> {
    const playersKey = `match:${roomCode}:players`;

    const result = await this.redis.eval(
      UPDATE_POSITION_LUA,
      1,
      playersKey,
      userId,
      String(newPosition),
    ) as number;

    if (result === 1) return 'valid';
    if (result === -1) return 'not_found';
    return 'cheat';
  }

  async getMatchState(
    roomCode: string,
  ): Promise<Record<string, PlayerMatchState>> {
    const playersKey = `match:${roomCode}:players`;
    const raw = await this.redis.hgetall(playersKey);
    if (!raw) return {};

    const result: Record<string, PlayerMatchState> = {};

    for (const [userId, json] of Object.entries(raw)) {
      try {
        result[userId] = JSON.parse(json);
      } catch {
        this.logger.error(`Estado corrupto en Redis para jugador ${userId} en sala ${roomCode}`);
      }
    }

    return result;
  }

  async getPlayerPosition(
    roomCode: string,
    userId: string,
  ): Promise<number> {
    const playersKey = `match:${roomCode}:players`;
    const raw = await this.redis.hget(playersKey, userId);

    if (!raw) return -1;

    try {
      const state: PlayerMatchState = JSON.parse(raw);
      return state.position;
    } catch {
      this.logger.error(`Estado corrupto en Redis para jugador ${userId} en sala ${roomCode}`);
      return -1;
    }
  }
}
