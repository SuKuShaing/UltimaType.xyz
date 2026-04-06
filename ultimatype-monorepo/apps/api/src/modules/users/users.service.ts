import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface CreateUserInput {
  provider: 'GOOGLE' | 'GITHUB';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode?: string | null;
}

/**
 * Generates a slug from a display name: lowercase initials + 3 hex chars.
 * E.g. "Sebastián Sanhueza" → "ss-a3f"
 */
export function generateSlug(displayName: string): string {
  // Normalize accented characters (NFD + strip diacritics), then strip non-ASCII (CJK, emoji, etc.)
  const normalized = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ascii = normalized.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = (ascii || 'u').split(/\s+/).filter(Boolean);

  let initials: string;
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toLowerCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toLowerCase();
  } else {
    initials = (parts[0]?.[0] ?? 'u').toLowerCase().padEnd(2, 'x');
  }

  const hex = randomBytes(2).toString('hex').substring(0, 3);
  return `${initials}-${hex}`;
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

  async findBySlug(slug: string) {
    return this.prisma.user.findUnique({
      where: { slug: slug.toLowerCase() },
    });
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true },
    });
    return user === null;
  }

  async generateUniqueSlug(displayName: string): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const slug = generateSlug(displayName);
      const available = await this.isSlugAvailable(slug);
      if (available) return slug;
    }
    // Fallback: use longer hex
    const hex = randomBytes(4).toString('hex');
    return `u-${hex}`;
  }

  async create(input: CreateUserInput) {
    const slug = await this.generateUniqueSlug(input.displayName);
    return this.prisma.user.create({
      data: {
        provider: input.provider as AuthProvider,
        providerId: input.providerId,
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        countryCode: input.countryCode ?? null,
        slug,
      },
    });
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateCountryCode(userId: string, countryCode: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { countryCode },
    });
  }

  async updateProfile(userId: string, data: { countryCode?: string; slug?: string }) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (err) {
      if ((err as any)?.code === 'P2002') {
        throw new ConflictException('El slug ya está en uso');
      }
      throw err;
    }
  }
}
