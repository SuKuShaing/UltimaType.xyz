import { IsString, IsNotEmpty, IsOptional, Matches, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,28}[a-zA-Z0-9]$/, {
    message: 'El slug solo puede contener letras, números y guiones. No puede empezar ni terminar con guión.',
  })
  slug?: string;
}
