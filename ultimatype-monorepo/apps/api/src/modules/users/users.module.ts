import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MatchResultsModule } from '../match-results/match-results.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [MatchResultsModule, LeaderboardModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
