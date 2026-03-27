import {
  Controller,
  Get,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TextsService } from './texts.service';
import { isValidLevel } from '@ultimatype-monorepo/shared';

@Controller('texts')
export class TextsController {
  constructor(private textsService: TextsService) {}

  @Get('random')
  async getRandomText(@Query('level') levelStr: string) {
    if (levelStr === undefined || levelStr === null || levelStr === '') {
      throw new BadRequestException('level es requerido y debe ser un entero entre 1 y 5');
    }
    const level = Number(levelStr);
    if (!isValidLevel(level)) {
      throw new BadRequestException('level debe ser un entero entre 1 y 5');
    }
    const text = await this.textsService.getRandomByLevel(level);
    if (!text) {
      throw new NotFoundException(
        `No hay textos disponibles para el nivel ${level}`,
      );
    }
    return {
      id: text.id,
      level: text.level,
      language: text.language,
      content: text.content,
    };
  }

  @Get('levels')
  getLevels() {
    return this.textsService.getLevels();
  }
}
