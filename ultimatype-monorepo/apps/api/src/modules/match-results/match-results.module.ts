import { Module } from '@nestjs/common';
import { MatchResultsService } from './match-results.service';
import { MatchResultsController } from './match-results.controller';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [LeaderboardModule],
  controllers: [MatchResultsController],
  providers: [MatchResultsService],
  exports: [MatchResultsService],
})
export class MatchResultsModule {}
