import { Module } from '@nestjs/common';
import { TextsController } from './texts.controller';
import { TextsService } from './texts.service';

@Module({
  controllers: [TextsController],
  providers: [TextsService],
  exports: [TextsService],
})
export class TextsModule {}
