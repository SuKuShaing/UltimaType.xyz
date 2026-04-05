import { Controller, Get, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchResultsService, MatchResultRecord } from './match-results.service';
import {
  PaginatedResponse,
  MatchResultDto,
  MatchStatsDto,
  MatchDetailDto,
  MatchPeriod,
} from '@ultimatype-monorepo/shared';

interface AuthenticatedRequest {
  user: { id: string };
}

const VALID_PERIODS: MatchPeriod[] = ['7d', '30d', '1y', 'all'];

function parseLevelParam(param?: string): number | undefined {
  if (param && /^[1-5]$/.test(param)) return parseInt(param, 10);
  return undefined;
}

function parsePeriodParam(param?: string): MatchPeriod | undefined {
  if (param && VALID_PERIODS.includes(param as MatchPeriod)) return param as MatchPeriod;
  return undefined;
}

@Controller('matches')
export class MatchResultsController {
  constructor(private readonly matchResultsService: MatchResultsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(
    @Req() req: AuthenticatedRequest,
    @Query('level') levelParam?: string,
    @Query('period') periodParam?: string,
  ): Promise<MatchStatsDto> {
    const level = parseLevelParam(levelParam);
    const period = parsePeriodParam(periodParam);
    return this.matchResultsService.getStats(req.user.id, level, period);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyResults(
    @Req() req: AuthenticatedRequest,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
    @Query('level') levelParam?: string,
    @Query('period') periodParam?: string,
  ): Promise<PaginatedResponse<MatchResultDto>> {
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));
    const level = parseLevelParam(levelParam);
    const period = parsePeriodParam(periodParam);

    const { data, total } = await this.matchResultsService.findByUser(
      req.user.id,
      page,
      limit,
      level,
      period,
    );

    return {
      data: data.map((r: MatchResultRecord) => ({
        id: r.id,
        matchCode: r.matchCode,
        wpm: r.wpm,
        precision: r.precision,
        score: r.score,
        missingChars: r.missingChars,
        level: r.level,
        finished: r.finished,
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
        rank: r.rank,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get(':matchCode')
  async getMatchDetail(
    @Param('matchCode') matchCode: string,
  ): Promise<MatchDetailDto> {
    const results = await this.matchResultsService.findByMatchCode(matchCode);

    if (results.length === 0) {
      throw new NotFoundException(`Partida ${matchCode} no encontrada`);
    }

    return {
      matchCode,
      level: results[0].level,
      createdAt: results[0].createdAt.toISOString(),
      participants: results.map((r) => ({
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
        countryCode: r.user.countryCode,
        slug: r.user.slug,
        wpm: r.wpm,
        precision: r.precision,
        score: r.score,
        missingChars: r.missingChars,
        rank: r.rank,
        finished: r.finished,
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
    };
  }
}
