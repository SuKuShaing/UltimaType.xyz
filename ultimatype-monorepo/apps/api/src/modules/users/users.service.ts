import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '@ultimatype-monorepo/prisma-client';

export interface CreateUserInput {
  provider: 'GOOGLE' | 'GITHUB';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByProvider(provider: 'GOOGLE' | 'GITHUB', providerId: string) {
    return this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: provider as AuthProvider,
          providerId,
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: {
        provider: input.provider as AuthProvider,
        providerId: input.providerId,
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
      },
    });
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
