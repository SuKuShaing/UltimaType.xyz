import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoomsService } from './rooms.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { MatchStateService } from '../matches/match-state.service';
import { ActiveRoomDto, ActiveRoomPlayerDto } from '@ultimatype-monorepo/shared';

@Controller('rooms')
export class RoomsController {
  private readonly logger = new Logger(RoomsController.name);

  constructor(
    private roomsService: RoomsService,
    private usersService: UsersService,
    private matchStateService: MatchStateService,
  ) {}

  @Get('active')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async getActiveRooms(): Promise<{ rooms: ActiveRoomDto[] }> {
    const codes = await this.roomsService.getActiveRoomCodes();

    const rooms: ActiveRoomDto[] = [];
    for (const code of codes) {
      try {
        const roomState = await this.roomsService.getRoomState(code);
        if (!roomState || roomState.status === 'finished') continue;

        const activePlayers = roomState.players.filter((p) => !p.disconnected);
        const topPlayers = activePlayers.slice(0, 4);

        if (roomState.status === 'playing') {
          const meta = await this.matchStateService.getMatchMetadata(code);
          if (!meta) continue;
          const matchState = await this.matchStateService.getMatchState(code);

          rooms.push({
            code: roomState.code,
            status: 'playing',
            level: roomState.level,
            playerCount: activePlayers.length,
            players: topPlayers.map((p) => ({
              displayName: p.displayName,
              colorIndex: p.colorIndex,
              avatarUrl: p.avatarUrl,
              position: matchState?.[p.id]?.position ?? 0,
            })),
            startedAt: meta?.startedAt,
            textLength: meta?.textContent?.length,
          });
        } else {
          rooms.push({
            code: roomState.code,
            status: 'waiting',
            level: roomState.level,
            playerCount: activePlayers.length,
            players: topPlayers.map((p) => ({
              displayName: p.displayName,
              colorIndex: p.colorIndex,
              avatarUrl: p.avatarUrl,
            })),
          });
        }
      } catch (err) {
        this.logger.warn(`Skipping room ${code}: ${(err as Error).message}`);
      }
    }

    return { rooms };
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(OptionalJwtAuthGuard)
  async createRoom(
    @Req() req: any,
    @Body() body?: { guestId?: string; guestName?: string },
  ) {
    if (req.user) {
      const userId = req.user.userId;
      const user = await this.usersService.findById(userId);
      const room = await this.roomsService.createRoom(userId, {
        id: userId,
        displayName: user?.displayName ?? req.user.displayName,
        avatarUrl: user?.avatarUrl ?? null,
        countryCode: user?.countryCode ?? null,
      });
      return { code: room.code, link: `/room/${room.code}` };
    }

    const guestId = body?.guestId;
    const guestName = body?.guestName;
    if (!guestId || !guestName) {
      throw new NotFoundException('Se requiere guestId y guestName');
    }

    const room = await this.roomsService.createRoom(guestId, {
      id: guestId,
      displayName: guestName,
      avatarUrl: null,
      countryCode: null,
    });
    return { code: room.code, link: `/room/${room.code}` };
  }

  @Get(':code')
  async getRoomInfo(@Param('code') code: string) {
    const room = await this.roomsService.getRoomState(code);
    if (!room) throw new NotFoundException('Esta partida ya terminó');
    return {
      code: room.code,
      playerCount: room.players.length,
      status: room.status,
      level: room.level,
    };
  }
}
