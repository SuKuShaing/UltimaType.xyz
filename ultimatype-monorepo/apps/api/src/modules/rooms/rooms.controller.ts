import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  @UseGuards(JwtAuthGuard)
  async createRoom(@Req() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    const room = await this.roomsService.createRoom(req.user.userId, {
      id: req.user.userId,
      displayName: user?.displayName ?? req.user.displayName,
      avatarUrl: user?.avatarUrl ?? null,
    });
    return { code: room.code, link: `/room/${room.code}` };
  }

  @Get(':code')
  async getRoomInfo(@Param('code') code: string) {
    const room = await this.roomsService.getRoomState(code);
    if (!room) throw new NotFoundException('Sala no encontrada');
    return {
      code: room.code,
      playerCount: room.players.length,
      status: room.status,
      level: room.level,
    };
  }
}
