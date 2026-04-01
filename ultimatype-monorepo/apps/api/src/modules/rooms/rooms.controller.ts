import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private roomsService: RoomsService,
    private usersService: UsersService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(JwtAuthGuard)
  async createRoom(@Req() req: any) {
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
