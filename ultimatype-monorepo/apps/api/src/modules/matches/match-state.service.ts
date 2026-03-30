import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { PlayerResult } from '@ultimatype-monorepo/shared';

const MATCH_TTL = 3600; // 1 hour

interface PlayerMatchState {
  position: number;
  errors: number;
  startedAt: string;
  finishedAt?: string;
  totalKeystrokes?: number;
  errorKeystrokes?: number;
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

// Lua: atomic mark-player-finished
// KEYS[1] = match:{code}:players, ARGV[1] = userId, ARGV[2] = totalKeystrokes,
// ARGV[3] = errorKeystrokes, ARGV[4] = finishedAt ISO timestamp
// Returns JSON {finishedAt, position} or nil if player not found
const MARK_PLAYER_FINISHED_LUA = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return nil end
local state = cjson.decode(raw)
if state.finishedAt then
  local ks = tonumber(ARGV[2])
  if (state.totalKeystrokes or 0) == 0 and ks > 0 then
    state.totalKeystrokes = ks
    state.errorKeystrokes = tonumber(ARGV[3])
    redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(state))
  end
else
  state.finishedAt = ARGV[4]
  state.totalKeystrokes = tonumber(ARGV[2])
  state.errorKeystrokes = tonumber(ARGV[3])
  redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(state))
end
return cjson.encode({finishedAt = state.finishedAt, position = state.position})
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

  async isPlayerFinished(
    roomCode: string,
    userId: string,
  ): Promise<boolean> {
    const playersKey = `match:${roomCode}:players`;
    const raw = await this.redis.hget(playersKey, userId);
    if (!raw) return false;
    try {
      const state: PlayerMatchState = JSON.parse(raw);
      return !!state.finishedAt;
    } catch {
      return false;
    }
  }

  async markPlayerFinished(
    roomCode: string,
    userId: string,
    totalKeystrokes: number,
    errorKeystrokes: number,
  ): Promise<{ finishedAt: string; position: number } | null> {
    const playersKey = `match:${roomCode}:players`;
    const finishedAt = new Date().toISOString();
    try {
      const result = await this.redis.eval(
        MARK_PLAYER_FINISHED_LUA,
        1,
        playersKey,
        userId,
        String(totalKeystrokes),
        String(errorKeystrokes),
        finishedAt,
      ) as string | null;
      if (!result) return null;
      return JSON.parse(result) as { finishedAt: string; position: number };
    } catch {
      this.logger.error(`Error al marcar finish para ${userId} en ${roomCode}`);
      return null;
    }
  }

  async areAllPlayersFinished(roomCode: string): Promise<boolean> {
    const states = await this.getMatchState(roomCode);
    const players = Object.values(states);
    if (players.length === 0) return false;
    return players.every((p) => !!p.finishedAt);
  }

  async getTextLength(roomCode: string): Promise<number> {
    const matchKey = `match:${roomCode}`;
    const textContent = await this.redis.hget(matchKey, 'textContent');
    return textContent ? textContent.length : 0;
  }

  async calculateResults(
    roomCode: string,
    playerInfoMap: Record<string, { displayName: string; colorIndex: number; countryCode: string | null }>,
  ): Promise<PlayerResult[]> {
    const matchKey = `match:${roomCode}`;
    const matchData = await this.redis.hgetall(matchKey);
    const matchStartedAt = matchData.startedAt;
    const textLength = matchData.textContent?.length ?? 0;
    const now = new Date().toISOString();

    const trunc2 = (n: number) => Math.trunc(n * 100) / 100;

    const states = await this.getMatchState(roomCode);
    const results: PlayerResult[] = [];

    for (const [userId, state] of Object.entries(states)) {
      const startTime = matchStartedAt ?? state.startedAt;
      if (!startTime) {
        this.logger.warn(`Skipping player ${userId} in ${roomCode}: missing startTime`);
        continue;
      }

      const info = playerInfoMap[userId] ?? {
        displayName: 'Unknown',
        colorIndex: 0,
        countryCode: null,
      };
      const finished = !!state.finishedAt;
      const endTime = state.finishedAt ?? now;
      const elapsedMs = Math.max(
        new Date(endTime).getTime() - new Date(startTime).getTime(),
        0,
      );
      const elapsedMinutes = elapsedMs / 60_000;

      const wpmRaw =
        elapsedMinutes > 0 ? (state.position / 5) / elapsedMinutes : 0;
      const wpm = trunc2(wpmRaw);

      const totalKs = state.totalKeystrokes ?? 0;
      const errorKs = Math.min(state.errorKeystrokes ?? 0, totalKs);
      const precisionDecimal =
        totalKs > 0 ? trunc2((totalKs - errorKs) / totalKs) : 1.0;
      const precision = Math.round(precisionDecimal * 100);

      const missingChars = finished ? 0 : Math.max(textLength - state.position, 0);
      const score = Math.max(trunc2(wpm * 10 * precisionDecimal - missingChars * 2), 0);

      results.push({
        playerId: userId,
        displayName: info.displayName,
        colorIndex: info.colorIndex,
        countryCode: info.countryCode,
        rank: 0,
        wpm,
        precision,
        score,
        missingChars,
        finished,
        finishedAt: state.finishedAt ?? null,
      });
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Desempate: terminó antes gana (DNF siempre después de los que terminaron)
      if (a.finishedAt && b.finishedAt)
        return new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime();
      if (a.finishedAt) return -1;
      if (b.finishedAt) return 1;
      return 0;
    });
    results.forEach((r, i) => (r.rank = i + 1));

    return results;
  }

  async getMatchStartedAt(roomCode: string): Promise<string | null> {
    const matchKey = `match:${roomCode}`;
    return this.redis.hget(matchKey, 'startedAt');
  }

  async getPlayerMatchState(
    roomCode: string,
    userId: string,
  ): Promise<PlayerMatchState | null> {
    const playersKey = `match:${roomCode}:players`;
    const raw = await this.redis.hget(playersKey, userId);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.error(`Estado corrupto para ${userId} en ${roomCode}`);
      return null;
    }
  }

  async getAllPlayerPositions(
    roomCode: string,
  ): Promise<Array<{ playerId: string; position: number; finished: boolean }>> {
    const states = await this.getMatchState(roomCode);
    return Object.entries(states).map(([playerId, state]) => ({
      playerId,
      position: state.position,
      finished: !!state.finishedAt,
    }));
  }

  async getMatchMetadata(
    roomCode: string,
  ): Promise<{ textContent: string; textId: string; startedAt: string; status: string } | null> {
    const matchKey = `match:${roomCode}`;
    const data = await this.redis.hgetall(matchKey);
    if (!data.textContent) return null;
    return {
      textContent: data.textContent,
      textId: data.textId,
      startedAt: data.startedAt,
      status: data.status,
    };
  }

  async cleanupMatch(roomCode: string): Promise<void> {
    const matchKey = `match:${roomCode}`;
    const playersKey = `match:${roomCode}:players`;
    await this.redis.del(matchKey, playersKey);
  }
}
