import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DIFFICULTY_LEVELS } from '@ultimatype-monorepo/shared';

@Injectable()
export class TextsService {
  constructor(private prisma: PrismaService) {}

  async getRandomByLevel(level: number) {
    const count = await this.prisma.text.count({ where: { level } });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const results = await this.prisma.text.findMany({
      where: { level },
      skip,
      take: 1,
    });
    return results[0] ?? null;
  }

  getLevels() {
    return DIFFICULTY_LEVELS;
  }
}
