import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';
import {
  PaginatedResponse,
  LeaderboardEntryDto,
  UserLeaderboardPositionDto,
  MatchPeriod,
} from '@ultimatype-monorepo/shared';

interface AuthenticatedRequest {
  user: { userId: string };
}

const VALID_PERIODS: MatchPeriod[] = ['7d', '30d', 'all'];

function parseLevelParam(param?: string): number | undefined {
  if (param && /^[1-5]$/.test(param)) return parseInt(param, 10);
  return undefined;
}

function parsePeriodParam(param?: string): MatchPeriod | undefined {
  if (param && VALID_PERIODS.includes(param as MatchPeriod)) return param as MatchPeriod;
  return undefined;
}

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
    @Query('level') levelParam?: string,
    @Query('period') periodParam?: string,
    @Query('country') country?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ): Promise<PaginatedResponse<LeaderboardEntryDto>> {
    const level = parseLevelParam(levelParam);
    const period = parsePeriodParam(periodParam);
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '100', 10) || 100));

    const { data, total } = await this.leaderboardService.getLeaderboard(
      level,
      period,
      country || undefined,
      page,
      limit,
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('position')
  @UseGuards(JwtAuthGuard)
  async getUserPosition(
    @Req() req: AuthenticatedRequest,
    @Query('level') levelParam?: string,
    @Query('period') periodParam?: string,
  ): Promise<UserLeaderboardPositionDto | null> {
    const level = parseLevelParam(levelParam);
    const period = parsePeriodParam(periodParam);
    return this.leaderboardService.getUserPosition(req.user.userId, level, period);
  }
}
