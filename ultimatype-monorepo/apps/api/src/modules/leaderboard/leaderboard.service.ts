import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  MatchPeriod,
  LeaderboardEntryDto,
  UserLeaderboardPositionDto,
} from '@ultimatype-monorepo/shared';

const CACHE_TTL = 43200; // 12 hours in seconds

interface RawLeaderboardRow {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  bestScore: number;
  bestScorePrecision: number;
  bestScoreMatchCode: string;
}

interface RawCountRow {
  total: bigint;
}

interface RawRankRow {
  rank: bigint;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getLeaderboard(
    level?: number,
    period?: MatchPeriod,
    country?: string,
    page = 1,
    limit = 100,
  ): Promise<{ data: LeaderboardEntryDto[]; total: number }> {
    const cacheKey = this.buildCacheKey('leaderboard', level, country, period, page, limit);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      this.logger.warn(`Redis get failed for ${cacheKey}: ${(error as Error).message}`);
    }

    const dateFrom = this.periodToDateFrom(period);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (level !== undefined) {
      params.push(level);
      conditions.push(`mr.level = $${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`mr.created_at >= $${params.length}`);
    }
    if (country) {
      params.push(country);
      conditions.push(`u.country_code = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const dataParams = [...params, limit, offset];
    const entries = await this.prisma.$queryRawUnsafe<RawLeaderboardRow[]>(
      `SELECT * FROM (
         SELECT DISTINCT ON (mr.user_id)
           u.id AS "userId",
           u.display_name AS "displayName",
           u.avatar_url AS "avatarUrl",
           u.country_code AS "countryCode",
           mr.score AS "bestScore",
           mr.precision AS "bestScorePrecision",
           mr.match_code AS "bestScoreMatchCode"
         FROM match_results mr
         JOIN users u ON mr.user_id = u.id
         ${whereClause}
         ORDER BY mr.user_id, mr.score DESC
       ) ranked
       ORDER BY "bestScore" DESC, "bestScorePrecision" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...dataParams,
    );

    const countResult = await this.prisma.$queryRawUnsafe<RawCountRow[]>(
      `SELECT COUNT(DISTINCT mr.user_id) AS total
       FROM match_results mr
       JOIN users u ON mr.user_id = u.id
       ${whereClause}`,
      ...params,
    );

    const total = Number(countResult[0]?.total ?? 0);
    const data: LeaderboardEntryDto[] = entries.map((e, i) => ({
      userId: e.userId,
      position: offset + i + 1,
      displayName: e.displayName,
      avatarUrl: e.avatarUrl,
      countryCode: e.countryCode,
      bestScore: Number(e.bestScore),
      bestScorePrecision: Number(e.bestScorePrecision),
      bestScoreMatchCode: e.bestScoreMatchCode,
    }));

    const result = { data, total };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Redis set failed for ${cacheKey}: ${(error as Error).message}`);
    }

    return result;
  }

  async getUserPosition(
    userId: string,
    level?: number,
    period?: MatchPeriod,
  ): Promise<UserLeaderboardPositionDto | null> {
    const dateFrom = this.periodToDateFrom(period);
    const filteredWhere = {
      userId,
      ...(level !== undefined ? { level } : {}),
      ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
    };

    // Best score del usuario con filtros
    const userBest = await this.prisma.matchResult.findFirst({
      where: filteredWhere,
      orderBy: { score: 'desc' },
      select: { score: true, matchCode: true, createdAt: true },
    });

    if (!userBest) return null;

    // Build where clause for rank queries
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (level !== undefined) {
      params.push(level);
      conditions.push(`mr.level = $${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`mr.created_at >= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Global rank: count users with higher best score + 1
    const globalRankResult = await this.prisma.$queryRawUnsafe<RawRankRow[]>(
      `SELECT COUNT(*) + 1 AS rank
       FROM (
         SELECT user_id, MAX(score) AS best
         FROM match_results mr
         ${whereClause}
         GROUP BY user_id
         HAVING MAX(score) > $${params.length + 1}
       ) sub`,
      ...params,
      userBest.score,
    );

    const globalTotalResult = await this.prisma.$queryRawUnsafe<RawCountRow[]>(
      `SELECT COUNT(DISTINCT mr.user_id) AS total
       FROM match_results mr
       ${whereClause}`,
      ...params,
    );

    const globalRank = Number(globalRankResult[0]?.rank ?? 1);
    const globalTotal = Number(globalTotalResult[0]?.total ?? 1);
    const globalPercentile = Math.round((1 - (globalRank - 1) / globalTotal) * 100);

    // Country rank (if user has countryCode)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    });

    let countryRank: number | null = null;
    let countryTotal: number | null = null;
    let countryPercentile: number | null = null;

    if (user?.countryCode) {
      const countryConditions = [...conditions];
      const countryParams = [...params];

      countryParams.push(user.countryCode);
      countryConditions.push(`u.country_code = $${countryParams.length}`);

      const countryWhereClause = `WHERE ${countryConditions.join(' AND ')}`;

      const countryRankResult = await this.prisma.$queryRawUnsafe<RawRankRow[]>(
        `SELECT COUNT(*) + 1 AS rank
         FROM (
           SELECT mr.user_id, MAX(mr.score) AS best
           FROM match_results mr
           JOIN users u ON mr.user_id = u.id
           ${countryWhereClause}
           GROUP BY mr.user_id
           HAVING MAX(mr.score) > $${countryParams.length + 1}
         ) sub`,
        ...countryParams,
        userBest.score,
      );

      const countryTotalResult = await this.prisma.$queryRawUnsafe<RawCountRow[]>(
        `SELECT COUNT(DISTINCT mr.user_id) AS total
         FROM match_results mr
         JOIN users u ON mr.user_id = u.id
         ${countryWhereClause}`,
        ...countryParams,
      );

      countryRank = Number(countryRankResult[0]?.rank ?? 1);
      countryTotal = Number(countryTotalResult[0]?.total ?? 1);
      countryPercentile = Math.round((1 - (countryRank - 1) / countryTotal) * 100);
    }

    return {
      bestScore: userBest.score,
      bestScoreMatchCode: userBest.matchCode,
      bestScoreDate: userBest.createdAt.toISOString(),
      globalRank,
      globalTotal,
      globalPercentile,
      countryRank,
      countryTotal,
      countryPercentile,
      countryCode: user?.countryCode ?? null,
    };
  }

  private buildCacheKey(
    prefix: string,
    level?: number,
    country?: string,
    period?: MatchPeriod,
    page = 1,
    limit = 100,
  ): string {
    return `${prefix}:level:${level ?? 'ALL'}:country:${country ?? 'ALL'}:period:${period ?? 'all'}:page:${page}:limit:${limit}`;
  }

  private periodToDateFrom(period?: MatchPeriod): Date | null {
    if (period === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (period === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (period === '1y') return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return null;
  }
}
