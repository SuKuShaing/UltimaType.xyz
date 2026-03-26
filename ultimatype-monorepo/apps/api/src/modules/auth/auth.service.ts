import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

export interface OAuthUserInput {
  provider: 'GOOGLE' | 'GITHUB';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthCodePayload {
  sub: string; // userId
  email: string;
  displayName: string;
  type: 'auth_code';
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateOAuthUser(oauthUser: OAuthUserInput) {
    const existingUser = await this.usersService.findByProvider(
      oauthUser.provider,
      oauthUser.providerId,
    );

    if (existingUser) {
      return this.usersService.updateLastLogin(existingUser.id);
    }

    try {
      return await this.usersService.create(oauthUser);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === 'P2002'
      ) {
        const retryUser = await this.usersService.findByProvider(
          oauthUser.provider,
          oauthUser.providerId,
        );
        if (retryUser) {
          return this.usersService.updateLastLogin(retryUser.id);
        }
      }
      throw error;
    }
  }

  async generateTokens(user: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    };

    const accessTokenExpiration = this.configService.get<string>(
      'JWT_EXPIRATION',
      '24h',
    );
    const refreshTokenExpiration = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessTokenExpiration as any,
      }),
      this.jwtService.signAsync(
        { sub: user.id, email: user.email },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTokenExpiration as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  /**
   * Generates a short-lived auth code (JWT, 60s) used to transfer the session
   * from the OAuth callback redirect to the frontend without exposing long-lived
   * tokens in the URL. The frontend exchanges this code ONCE via POST /auth/code.
   */
  async generateAuthCode(user: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<string> {
    const payload: AuthCodePayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      type: 'auth_code',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '60s' as any,
    });
  }

  /**
   * Validates a short-lived auth code and issues real access + refresh tokens.
   * Throws UnauthorizedException if the code is invalid, expired, or wrong type.
   */
  async exchangeAuthCode(code: string): Promise<AuthTokens> {
    let payload: AuthCodePayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthCodePayload>(code, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }

    if (payload.type !== 'auth_code') {
      throw new UnauthorizedException('Invalid token type');
    }

    return this.generateTokens({
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
    });
  }
}
