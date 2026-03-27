import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RoomsModule } from '../modules/rooms/rooms.module';
import { UsersModule } from '../modules/users/users.module';
import { TextsModule } from '../modules/texts/texts.module';

@Module({
  imports: [RoomsModule, UsersModule, TextsModule],
  providers: [GameGateway],
})
export class GameModule {}
