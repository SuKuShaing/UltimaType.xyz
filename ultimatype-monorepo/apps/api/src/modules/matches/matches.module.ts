import { Module } from '@nestjs/common';
import { MatchStateService } from './match-state.service';

@Module({
  providers: [MatchStateService],
  exports: [MatchStateService],
})
export class MatchesModule {}
