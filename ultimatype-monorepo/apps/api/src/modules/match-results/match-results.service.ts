import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PlayerResult, MatchPeriod, MatchStatsDto } from '@ultimatype-monorepo/shared';

export interface MatchResultRecord {
  id: string;
  matchCode: string;
  wpm: number;
  precision: number;
  score: number;
  missingChars: number;
  level: number;
  finished: boolean;
  finishedAt: Date | null;
  rank: number;
  createdAt: Date;
}

@Injectable()
export class MatchResultsService {
  private readonly logger = new Logger(MatchResultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * Persiste los resultados de una partida finalizada.
   * Filtra automáticamente guests verificando qué playerIds existen en la tabla users.
   * Inserta individualmente para no perder resultados válidos si uno falla.
   * No lanza excepciones — loguea errores para no bloquear el flujo de juego.
   */
  async persistResults(
    matchCode: string,
    level: number,
    results: PlayerResult[],
  ): Promise<void> {
    try {
      const playerIds = results.map((r) => r.playerId);
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true },
      });
      const validUserIds = new Set(existingUsers.map((u) => u.id));

      const records = results
        .filter((r) => validUserIds.has(r.playerId))
        .map((r) => {
          const sanitized: Record<string, unknown> = {};

          if (!Number.isFinite(r.wpm)) {
            this.logger.warn(`wpm inválido (${r.wpm}) para jugador ${r.playerId} en partida ${matchCode}, usando 0`);
          }
          if (!Number.isFinite(r.precision)) {
            this.logger.warn(`precision inválido (${r.precision}) para jugador ${r.playerId} en partida ${matchCode}, usando 0`);
          }
          if (!Number.isFinite(r.score)) {
            this.logger.warn(`score inválido (${r.score}) para jugador ${r.playerId} en partida ${matchCode}, usando 0`);
          }
          if (!Number.isFinite(r.missingChars)) {
            this.logger.warn(`missingChars inválido (${r.missingChars}) para jugador ${r.playerId} en partida ${matchCode}, usando 0`);
          }
          if (!Number.isFinite(r.rank)) {
            this.logger.warn(`rank inválido (${r.rank}) para jugador ${r.playerId} en partida ${matchCode}, usando ${results.length}`);
          }

          let finishedAt: Date | null = null;
          if (r.finishedAt) {
            const parsed = Date.parse(r.finishedAt);
            if (isNaN(parsed)) {
              this.logger.warn(`finishedAt inválido ("${r.finishedAt}") para jugador ${r.playerId} en partida ${matchCode}, usando null`);
            } else {
              finishedAt = new Date(parsed);
            }
          }

          return {
            matchCode,
            userId: r.playerId,
            wpm: Number.isFinite(r.wpm) ? r.wpm : 0,
            precision: Number.isFinite(r.precision) ? r.precision : 0,
            score: Number.isFinite(r.score) ? r.score : 0,
            missingChars: Number.isFinite(r.missingChars) ? r.missingChars : 0,
            level,
            finished: r.finished,
            finishedAt,
            rank: Number.isFinite(r.rank) ? r.rank : results.length,
          };
        });

      if (records.length === 0) {
        this.logger.debug(
          `Sin resultados persistibles para partida ${matchCode} (solo guests)`,
        );
        return;
      }

      // Insert individual para no perder resultados válidos si uno falla
      const settled = await Promise.allSettled(
        records.map((record) =>
          this.prisma.matchResult.create({ data: record }),
        ),
      );

      let persisted = 0;
      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === 'fulfilled') {
          persisted++;
        } else {
          this.logger.error(
            `Error persistiendo resultado de jugador ${records[i].userId} en partida ${matchCode}: ${result.reason?.message ?? result.reason}`,
          );
        }
      }

      if (persisted > 0) {
        this.logger.log(
          `Persistidos ${persisted}/${records.length} resultados para partida ${matchCode}`,
        );

        // Invalidar cache del leaderboard si algun jugador supero su marca personal
        const persistedRecords = records.filter((_, i) => settled[i].status === 'fulfilled');
        await Promise.allSettled(
          persistedRecords.map((record) =>
            this.checkAndInvalidateLeaderboard(record.userId, level, record.score, matchCode),
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        `Error persistiendo resultados para partida ${matchCode}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async checkAndInvalidateLeaderboard(
    userId: string,
    level: number,
    newScore: number,
    matchCode: string,
  ): Promise<void> {
    try {
      const previousBest = await this.prisma.matchResult.findFirst({
        where: { userId, level, NOT: { matchCode } },
        orderBy: { score: 'desc' },
        select: { score: true },
      });

      if (previousBest === null || newScore > previousBest.score) {
        await this.leaderboardService.invalidateForLevel(level);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to check/invalidate leaderboard for user ${userId}, level ${level}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Consulta resultados paginados de un usuario con filtros opcionales.
   */
  async findByUser(
    userId: string,
    page: number,
    limit: number,
    level?: number,
    period?: MatchPeriod,
  ): Promise<{ data: MatchResultRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    const dateFrom = this.periodToDateFrom(period);
    const where = {
      userId,
      ...(level !== undefined ? { level } : {}),
      ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.matchResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          matchCode: true,
          wpm: true,
          precision: true,
          score: true,
          missingChars: true,
          level: true,
          finished: true,
          finishedAt: true,
          rank: true,
          createdAt: true,
        },
      }),
      this.prisma.matchResult.count({ where }),
    ]);

    return { data: data as MatchResultRecord[], total };
  }

  /**
   * Calcula métricas agregadas de un usuario:
   * - avgScore: promedio de score filtrado por level y period
   * - bestScore: máximo de score filtrado por level y period
   * - totalMatches: conteo filtrado
   */
  async getStats(
    userId: string,
    level?: number,
    period?: MatchPeriod,
  ): Promise<MatchStatsDto> {
    const dateFrom = this.periodToDateFrom(period);
    const filteredWhere = {
      userId,
      ...(level !== undefined ? { level } : {}),
      ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
    };

    const [stats, best] = await Promise.all([
      this.prisma.matchResult.aggregate({
        where: filteredWhere,
        _avg: { score: true, precision: true },
        _count: { id: true },
      }),
      this.prisma.matchResult.findFirst({
        where: filteredWhere,
        orderBy: { score: 'desc' },
        select: { score: true },
      }),
    ]);

    return {
      avgScore: Math.round((stats._avg.score ?? 0) * 10) / 10,
      avgPrecision: Math.round((stats._avg.precision ?? 0) * 10) / 10,
      bestScore: best?.score ?? 0,
      totalMatches: stats._count.id,
    };
  }

  /**
   * Busca todos los resultados de una partida por matchCode, con info del jugador.
   */
  async findByMatchCode(matchCode: string) {
    return this.prisma.matchResult.findMany({
      where: { matchCode },
      orderBy: { rank: 'asc' },
      select: {
        wpm: true,
        precision: true,
        score: true,
        missingChars: true,
        level: true,
        finished: true,
        finishedAt: true,
        rank: true,
        createdAt: true,
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
            countryCode: true,
          },
        },
      },
    });
  }

  private periodToDateFrom(period?: MatchPeriod): Date | null {
    if (period === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (period === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (period === '1y') return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return null;
  }
}
