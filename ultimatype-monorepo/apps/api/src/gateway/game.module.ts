import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RoomsModule } from '../modules/rooms/rooms.module';
import { UsersModule } from '../modules/users/users.module';
import { TextsModule } from '../modules/texts/texts.module';
import { MatchesModule } from '../modules/matches/matches.module';

@Module({
  imports: [RoomsModule, UsersModule, TextsModule, MatchesModule],
  providers: [GameGateway],
})
export class GameModule {}
