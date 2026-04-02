import { Module } from '@nestjs/common';
import { MatchResultsService } from './match-results.service';
import { MatchResultsController } from './match-results.controller';

@Module({
  controllers: [MatchResultsController],
  providers: [MatchResultsService],
  exports: [MatchResultsService],
})
export class MatchResultsModule {}
