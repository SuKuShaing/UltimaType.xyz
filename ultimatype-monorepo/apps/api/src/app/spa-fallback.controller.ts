import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller('u')
export class SpaFallbackController {
  @Get(':slug')
  serveSpa(@Param('slug') _slug: string, @Res() res: Response) {
    return res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }
}
