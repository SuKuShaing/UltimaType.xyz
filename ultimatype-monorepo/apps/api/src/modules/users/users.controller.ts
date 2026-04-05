import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { MatchResultsService, MatchResultRecord } from '../match-results/match-results.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  isValidCountryCode,
  PaginatedResponse,
  MatchResultDto,
  MatchStatsDto,
  MatchPeriod,
} from '@ultimatype-monorepo/shared';
import { UpdateProfileDto } from './dto/update-profile.dto';

const VALID_PERIODS: MatchPeriod[] = ['7d', '30d', '1y', 'all'];

function parseLevelParam(param?: string): number | undefined {
  if (param && /^[1-5]$/.test(param)) return parseInt(param, 10);
  return undefined;
}

function parsePeriodParam(param?: string): MatchPeriod | undefined {
  if (param && VALID_PERIODS.includes(param as MatchPeriod)) return param as MatchPeriod;
  return undefined;
}

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private matchResultsService: MatchResultsService,
  ) {}

  // Public endpoints — declared BEFORE :id routes to avoid NestJS interpreting slugs as IDs

  @Get('check-slug/:slug')
  async checkSlug(@Param('slug') slug: string) {
    const normalized = slug.toLowerCase();
    const available = await this.usersService.isSlugAvailable(normalized);
    return { available };
  }

  @Get('by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const user = await this.usersService.findBySlug(slug.toLowerCase());
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      countryCode: user.countryCode,
      slug: user.slug,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const updateData: { countryCode?: string; slug?: string } = {};

    if (body.countryCode !== undefined) {
      if (typeof body.countryCode !== 'string' || body.countryCode.trim() === '') {
        throw new BadRequestException(
          'El campo countryCode es requerido y debe ser un string.',
        );
      }
      if (!isValidCountryCode(body.countryCode)) {
        throw new BadRequestException(
          `Código de país inválido: "${body.countryCode}". Debe ser un código ISO 3166-1 alpha-2 válido.`,
        );
      }
      updateData.countryCode = body.countryCode.toUpperCase();
    }

    if (body.slug !== undefined) {
      updateData.slug = body.slug.toLowerCase();
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No hay campos para actualizar.');
    }

    return this.usersService.updateProfile(req.user.userId, updateData);
  }

  // Public endpoints for any user's matches and stats

  @Get(':id/matches')
  async getUserMatches(
    @Param('id') userId: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
    @Query('level') levelParam?: string,
    @Query('period') periodParam?: string,
  ): Promise<PaginatedResponse<MatchResultDto>> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));
    const level = parseLevelParam(levelParam);
    const period = parsePeriodParam(periodParam);

    const { data, total } = await this.matchResultsService.findByUser(
      userId, page, limit, level, period,
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

  @Get(':id/stats')
  async getUserStats(
    @Param('id') userId: string,
    @Query('level') levelParam?: string,
    @Query('period') periodParam?: string,
  ): Promise<MatchStatsDto> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const level = parseLevelParam(levelParam);
    const period = parsePeriodParam(periodParam);
    return this.matchResultsService.getStats(userId, level, period);
  }
}
