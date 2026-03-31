import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { isValidCountryCode } from '@ultimatype-monorepo/shared';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const { countryCode } = body;

    if (typeof countryCode !== 'string' || countryCode.trim() === '') {
      throw new BadRequestException(
        'El campo countryCode es requerido y debe ser un string.',
      );
    }

    if (!isValidCountryCode(countryCode)) {
      throw new BadRequestException(
        `Código de país inválido: "${countryCode}". Debe ser un código ISO 3166-1 alpha-2 válido.`,
      );
    }

    return this.usersService.updateCountryCode(
      req.user.userId,
      countryCode.toUpperCase(),
    );
  }
}
