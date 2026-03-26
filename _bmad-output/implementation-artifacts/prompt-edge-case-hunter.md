# Edge Case Hunter Review Prompt

You are the Edge Case Hunter. Review the following code diff to find unhandled edge cases, boundary condition failures, and missing error handling. You have read access to the project so you can ask for more context if needed, but for now here is the diff. Output your findings as a Markdown list.

## DIFF
diff --git a/ultimatype-monorepo/apps/api/src/app/app.module.ts b/ultimatype-monorepo/apps/api/src/app/app.module.ts
index 8662803..899821e 100644
--- a/ultimatype-monorepo/apps/api/src/app/app.module.ts
+++ b/ultimatype-monorepo/apps/api/src/app/app.module.ts
@@ -1,10 +1,18 @@
 import { Module } from '@nestjs/common';
+import { ConfigModule } from '@nestjs/config';
 import { AppController } from './app.controller';
 import { AppService } from './app.service';
+import { PrismaModule } from '../prisma/prisma.module';
+import { AuthModule } from '../modules/auth/auth.module';
 
 @Module({
-  imports: [],
+  imports: [
+    ConfigModule.forRoot({ isGlobal: true }),
+    PrismaModule,
+    AuthModule,
+  ],
   controllers: [AppController],
   providers: [AppService],
 })
 export class AppModule {}
+
diff --git a/ultimatype-monorepo/libs/shared/src/index.ts b/ultimatype-monorepo/libs/shared/src/index.ts
index 8ca85a7..d6a2d0b 100644
--- a/ultimatype-monorepo/libs/shared/src/index.ts
+++ b/ultimatype-monorepo/libs/shared/src/index.ts
@@ -1 +1,3 @@
 export * from './lib/shared.js';
+export * from './dto/auth.dto';
+export * from './types/user';
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts b/ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts
new file mode 100644
index 0000000..9e44054
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts
@@ -0,0 +1,82 @@
+import {
+  Controller,
+  Get,
+  Post,
+  Req,
+  Res,
+  UseGuards,
+} from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
+import { AuthService } from './auth.service';
+import { GoogleAuthGuard } from './guards/google-auth.guard';
+import { GithubAuthGuard } from './guards/github-auth.guard';
+import { JwtAuthGuard } from './guards/jwt-auth.guard';
+import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
+
+@Controller('auth')
+export class AuthController {
+  constructor(
+    private authService: AuthService,
+    private configService: ConfigService,
+  ) {}
+
+  // ---- Google OAuth ----
+
+  @Get('google')
+  @UseGuards(GoogleAuthGuard)
+  googleLogin() {
+    // Guard redirects to Google
+  }
+
+  @Get('google/callback')
+  @UseGuards(GoogleAuthGuard)
+  async googleCallback(@Req() req: any, @Res() res: any) {
+    const user = await this.authService.validateOAuthUser(req.user);
+    const tokens = await this.authService.generateTokens(user);
+    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
+    const params = new URLSearchParams({
+      accessToken: tokens.accessToken,
+      refreshToken: tokens.refreshToken,
+    });
+    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
+  }
+
+  // ---- GitHub OAuth ----
+
+  @Get('github')
+  @UseGuards(GithubAuthGuard)
+  githubLogin() {
+    // Guard redirects to GitHub
+  }
+
+  @Get('github/callback')
+  @UseGuards(GithubAuthGuard)
+  async githubCallback(@Req() req: any, @Res() res: any) {
+    const user = await this.authService.validateOAuthUser(req.user);
+    const tokens = await this.authService.generateTokens(user);
+    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
+    const params = new URLSearchParams({
+      accessToken: tokens.accessToken,
+      refreshToken: tokens.refreshToken,
+    });
+    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
+  }
+
+  // ---- Token Refresh ----
+
+  @Post('refresh')
+  @UseGuards(JwtRefreshGuard)
+  async refresh(@Req() req: any) {
+    const userId = req.user.userId;
+    const tokens = await this.authService.refreshTokens(userId);
+    return tokens;
+  }
+
+  // ---- Current User Profile ----
+
+  @Get('me')
+  @UseGuards(JwtAuthGuard)
+  async getProfile(@Req() req: any) {
+    return req.user;
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/auth.module.ts b/ultimatype-monorepo/apps/api/src/modules/auth/auth.module.ts
new file mode 100644
index 0000000..5e56d6a
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/auth.module.ts
@@ -0,0 +1,28 @@
+import { Module } from '@nestjs/common';
+import { JwtModule } from '@nestjs/jwt';
+import { PassportModule } from '@nestjs/passport';
+import { UsersModule } from '../users/users.module';
+import { AuthService } from './auth.service';
+import { AuthController } from './auth.controller';
+import { GoogleStrategy } from './strategies/google.strategy';
+import { GithubStrategy } from './strategies/github.strategy';
+import { JwtStrategy } from './strategies/jwt.strategy';
+import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
+
+@Module({
+  imports: [
+    PassportModule,
+    JwtModule.register({}),
+    UsersModule,
+  ],
+  controllers: [AuthController],
+  providers: [
+    AuthService,
+    GoogleStrategy,
+    GithubStrategy,
+    JwtStrategy,
+    JwtRefreshStrategy,
+  ],
+  exports: [AuthService],
+})
+export class AuthModule {}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/auth.service.spec.ts b/ultimatype-monorepo/apps/api/src/modules/auth/auth.service.spec.ts
new file mode 100644
index 0000000..5c05cd3
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/auth.service.spec.ts
@@ -0,0 +1,132 @@
+import { describe, it, expect, beforeEach, vi } from 'vitest';
+import { UnauthorizedException } from '@nestjs/common';
+import { AuthService, OAuthUserInput } from './auth.service';
+
+// Manual mocks to avoid NestJS DI import chain issues with Prisma
+const mockUsersService = {
+  findByProvider: vi.fn(),
+  findById: vi.fn(),
+  create: vi.fn(),
+  updateLastLogin: vi.fn(),
+};
+
+const mockJwtService = {
+  signAsync: vi.fn().mockResolvedValue('mock-token'),
+};
+
+const mockConfigService = {
+  get: vi.fn((key: string, defaultValue?: string) => {
+    const config: Record<string, string> = {
+      JWT_SECRET: 'test-secret',
+      JWT_REFRESH_SECRET: 'test-refresh-secret',
+      JWT_EXPIRATION: '24h',
+      JWT_REFRESH_EXPIRATION: '7d',
+    };
+    return config[key] ?? defaultValue;
+  }),
+};
+
+describe('AuthService', () => {
+  let authService: AuthService;
+
+  const mockUser = {
+    id: 'user-uuid-123',
+    provider: 'GOOGLE' as const,
+    providerId: '123456',
+    email: 'test@example.com',
+    displayName: 'Test User',
+    avatarUrl: 'https://example.com/avatar.jpg',
+    countryCode: null,
+    createdAt: new Date(),
+    updatedAt: new Date(),
+    lastLoginAt: new Date(),
+  };
+
+  beforeEach(() => {
+    vi.clearAllMocks();
+    authService = new AuthService(
+      mockUsersService as any,
+      mockJwtService as any,
+      mockConfigService as any,
+    );
+  });
+
+  describe('validateOAuthUser', () => {
+    const oauthInput: OAuthUserInput = {
+      provider: 'GOOGLE',
+      providerId: '123456',
+      email: 'test@example.com',
+      displayName: 'Test User',
+      avatarUrl: 'https://example.com/avatar.jpg',
+    };
+
+    it('should return existing user and update lastLoginAt', async () => {
+      mockUsersService.findByProvider.mockResolvedValue(mockUser);
+      mockUsersService.updateLastLogin.mockResolvedValue(mockUser);
+
+      const result = await authService.validateOAuthUser(oauthInput);
+
+      expect(mockUsersService.findByProvider).toHaveBeenCalledWith(
+        'GOOGLE',
+        '123456',
+      );
+      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
+        mockUser.id,
+      );
+      expect(result).toEqual(mockUser);
+    });
+
+    it('should create new user if not found', async () => {
+      mockUsersService.findByProvider.mockResolvedValue(null);
+      mockUsersService.create.mockResolvedValue(mockUser);
+
+      const result = await authService.validateOAuthUser(oauthInput);
+
+      expect(mockUsersService.create).toHaveBeenCalledWith(oauthInput);
+      expect(result).toEqual(mockUser);
+    });
+  });
+
+  describe('generateTokens', () => {
+    it('should generate access and refresh tokens', async () => {
+      mockJwtService.signAsync
+        .mockResolvedValueOnce('access-token')
+        .mockResolvedValueOnce('refresh-token');
+
+      const result = await authService.generateTokens({
+        id: 'user-id',
+        email: 'test@example.com',
+        displayName: 'Test User',
+      });
+
+      expect(result).toEqual({
+        accessToken: 'access-token',
+        refreshToken: 'refresh-token',
+      });
+      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
+    });
+  });
+
+  describe('refreshTokens', () => {
+    it('should generate new tokens for valid user', async () => {
+      mockUsersService.findById.mockResolvedValue(mockUser);
+      mockJwtService.signAsync
+        .mockResolvedValueOnce('new-access')
+        .mockResolvedValueOnce('new-refresh');
+
+      const result = await authService.refreshTokens('user-uuid-123');
+
+      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-123');
+      expect(result.accessToken).toBe('new-access');
+      expect(result.refreshToken).toBe('new-refresh');
+    });
+
+    it('should throw UnauthorizedException if user not found', async () => {
+      mockUsersService.findById.mockResolvedValue(null);
+
+      await expect(
+        authService.refreshTokens('nonexistent-id'),
+      ).rejects.toThrow(UnauthorizedException);
+    });
+  });
+});
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/auth.service.ts b/ultimatype-monorepo/apps/api/src/modules/auth/auth.service.ts
new file mode 100644
index 0000000..86d9e03
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/auth.service.ts
@@ -0,0 +1,87 @@
+import { Injectable, UnauthorizedException } from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
+import { JwtService } from '@nestjs/jwt';
+import { UsersService } from '../users/users.service';
+
+export interface OAuthUserInput {
+  provider: 'GOOGLE' | 'GITHUB';
+  providerId: string;
+  email: string;
+  displayName: string;
+  avatarUrl: string | null;
+}
+
+export interface AuthTokens {
+  accessToken: string;
+  refreshToken: string;
+}
+
+@Injectable()
+export class AuthService {
+  constructor(
+    private usersService: UsersService,
+    private jwtService: JwtService,
+    private configService: ConfigService,
+  ) {}
+
+  async validateOAuthUser(oauthUser: OAuthUserInput) {
+    const existingUser = await this.usersService.findByProvider(
+      oauthUser.provider,
+      oauthUser.providerId,
+    );
+
+    if (existingUser) {
+      await this.usersService.updateLastLogin(existingUser.id);
+      return existingUser;
+    }
+
+    return this.usersService.create(oauthUser);
+  }
+
+  async generateTokens(user: {
+    id: string;
+    email: string;
+    displayName: string;
+  }): Promise<AuthTokens> {
+    const payload = {
+      sub: user.id,
+      email: user.email,
+      displayName: user.displayName,
+    };
+
+    const accessTokenExpiration = this.configService.get<string>(
+      'JWT_EXPIRATION',
+      '24h',
+    );
+    const refreshTokenExpiration = this.configService.get<string>(
+      'JWT_REFRESH_EXPIRATION',
+      '7d',
+    );
+
+    const [accessToken, refreshToken] = await Promise.all([
+      this.jwtService.signAsync(payload, {
+        secret: this.configService.get<string>('JWT_SECRET')!,
+        expiresIn: accessTokenExpiration as any,
+      }),
+      this.jwtService.signAsync(
+        { sub: user.id, email: user.email },
+        {
+          secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
+          expiresIn: refreshTokenExpiration as any,
+        },
+      ),
+    ]);
+
+    return { accessToken, refreshToken };
+  }
+
+  async refreshTokens(userId: string): Promise<AuthTokens> {
+    const user = await this.usersService.findById(userId);
+
+    if (!user) {
+      throw new UnauthorizedException('User not found');
+    }
+
+    return this.generateTokens(user);
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/guards/github-auth.guard.ts b/ultimatype-monorepo/apps/api/src/modules/auth/guards/github-auth.guard.ts
new file mode 100644
index 0000000..7b08fd4
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/guards/github-auth.guard.ts
@@ -0,0 +1,5 @@
+import { Injectable } from '@nestjs/common';
+import { AuthGuard } from '@nestjs/passport';
+
+@Injectable()
+export class GithubAuthGuard extends AuthGuard('github') {}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/guards/google-auth.guard.ts b/ultimatype-monorepo/apps/api/src/modules/auth/guards/google-auth.guard.ts
new file mode 100644
index 0000000..4a2c87a
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/guards/google-auth.guard.ts
@@ -0,0 +1,5 @@
+import { Injectable } from '@nestjs/common';
+import { AuthGuard } from '@nestjs/passport';
+
+@Injectable()
+export class GoogleAuthGuard extends AuthGuard('google') {}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/guards/jwt-auth.guard.ts b/ultimatype-monorepo/apps/api/src/modules/auth/guards/jwt-auth.guard.ts
new file mode 100644
index 0000000..2155290
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/guards/jwt-auth.guard.ts
@@ -0,0 +1,5 @@
+import { Injectable } from '@nestjs/common';
+import { AuthGuard } from '@nestjs/passport';
+
+@Injectable()
+export class JwtAuthGuard extends AuthGuard('jwt') {}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/guards/jwt-refresh.guard.ts b/ultimatype-monorepo/apps/api/src/modules/auth/guards/jwt-refresh.guard.ts
new file mode 100644
index 0000000..ed74420
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/guards/jwt-refresh.guard.ts
@@ -0,0 +1,5 @@
+import { Injectable } from '@nestjs/common';
+import { AuthGuard } from '@nestjs/passport';
+
+@Injectable()
+export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/strategies/github.strategy.ts b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/github.strategy.ts
new file mode 100644
index 0000000..c5058f0
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/github.strategy.ts
@@ -0,0 +1,32 @@
+import { Injectable } from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
+import { PassportStrategy } from '@nestjs/passport';
+import { Strategy, Profile } from 'passport-github2';
+
+@Injectable()
+export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
+  constructor(configService: ConfigService) {
+    super({
+      clientID: configService.get<string>('GITHUB_CLIENT_ID')!,
+      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET')!,
+      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL')!,
+      scope: ['user:email'],
+    });
+  }
+
+  async validate(
+    accessToken: string,
+    refreshToken: string,
+    profile: Profile,
+    done: (error: Error | null, user?: Record<string, unknown>) => void,
+  ): Promise<void> {
+    const user = {
+      provider: 'GITHUB' as const,
+      providerId: profile.id,
+      email: profile.emails?.[0]?.value ?? '',
+      displayName: profile.displayName || profile.username || '',
+      avatarUrl: profile.photos?.[0]?.value ?? null,
+    };
+    done(null, user);
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/strategies/google.strategy.ts b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/google.strategy.ts
new file mode 100644
index 0000000..4d36695
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/google.strategy.ts
@@ -0,0 +1,32 @@
+import { Injectable } from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
+import { PassportStrategy } from '@nestjs/passport';
+import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
+
+@Injectable()
+export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
+  constructor(configService: ConfigService) {
+    super({
+      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
+      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
+      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
+      scope: ['email', 'profile'],
+    });
+  }
+
+  async validate(
+    accessToken: string,
+    refreshToken: string,
+    profile: Profile,
+    done: VerifyCallback,
+  ): Promise<void> {
+    const user = {
+      provider: 'GOOGLE' as const,
+      providerId: profile.id,
+      email: profile.emails?.[0]?.value ?? '',
+      displayName: profile.displayName,
+      avatarUrl: profile.photos?.[0]?.value ?? null,
+    };
+    done(null, user);
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
new file mode 100644
index 0000000..be6ebde
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
@@ -0,0 +1,31 @@
+import { Injectable } from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
+import { PassportStrategy } from '@nestjs/passport';
+import { ExtractJwt, Strategy } from 'passport-jwt';
+
+@Injectable()
+export class JwtRefreshStrategy extends PassportStrategy(
+  Strategy,
+  'jwt-refresh',
+) {
+  constructor(configService: ConfigService) {
+    super({
+      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
+      ignoreExpiration: false,
+      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
+      passReqToCallback: true,
+    });
+  }
+
+  async validate(
+    req: { body?: { refreshToken?: string } },
+    payload: { sub: string; email: string },
+  ) {
+    const refreshToken = req.body?.refreshToken;
+    return {
+      userId: payload.sub,
+      email: payload.email,
+      refreshToken,
+    };
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/modules/auth/strategies/jwt.strategy.ts b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/jwt.strategy.ts
new file mode 100644
index 0000000..863e535
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/auth/strategies/jwt.strategy.ts
@@ -0,0 +1,29 @@
+import { Injectable } from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
+import { PassportStrategy } from '@nestjs/passport';
+import { ExtractJwt, Strategy } from 'passport-jwt';
+
+export interface JwtPayload {
+  sub: string;
+  email: string;
+  displayName: string;
+}
+
+@Injectable()
+export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
+  constructor(configService: ConfigService) {
+    super({
+      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
+      ignoreExpiration: false,
+      secretOrKey: configService.get<string>('JWT_SECRET')!,
+    });
+  }
+
+  async validate(payload: JwtPayload) {
+    return {
+      userId: payload.sub,
+      email: payload.email,
+      displayName: payload.displayName,
+    };
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/modules/users/users.module.ts b/ultimatype-monorepo/apps/api/src/modules/users/users.module.ts
new file mode 100644
index 0000000..8fa904f
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/users/users.module.ts
@@ -0,0 +1,8 @@
+import { Module } from '@nestjs/common';
+import { UsersService } from './users.service';
+
+@Module({
+  providers: [UsersService],
+  exports: [UsersService],
+})
+export class UsersModule {}
diff --git a/ultimatype-monorepo/apps/api/src/modules/users/users.service.spec.ts b/ultimatype-monorepo/apps/api/src/modules/users/users.service.spec.ts
new file mode 100644
index 0000000..48c5112
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/users/users.service.spec.ts
@@ -0,0 +1,115 @@
+import { describe, it, expect, beforeEach, vi } from 'vitest';
+import { UsersService } from './users.service';
+
+// Manual mock to avoid Prisma import chain issues
+const mockPrisma = {
+  user: {
+    findUnique: vi.fn(),
+    create: vi.fn(),
+    update: vi.fn(),
+  },
+};
+
+describe('UsersService', () => {
+  let usersService: UsersService;
+
+  const mockUser = {
+    id: 'user-uuid-123',
+    provider: 'GOOGLE',
+    providerId: '123456',
+    email: 'test@example.com',
+    displayName: 'Test User',
+    avatarUrl: 'https://example.com/avatar.jpg',
+    countryCode: null,
+    createdAt: new Date(),
+    updatedAt: new Date(),
+    lastLoginAt: new Date(),
+  };
+
+  beforeEach(() => {
+    vi.clearAllMocks();
+    usersService = new UsersService(mockPrisma as any);
+  });
+
+  describe('findByProvider', () => {
+    it('should find user by provider and providerId', async () => {
+      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
+
+      const result = await usersService.findByProvider('GOOGLE', '123456');
+
+      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
+        where: {
+          provider_providerId: {
+            provider: 'GOOGLE',
+            providerId: '123456',
+          },
+        },
+      });
+      expect(result).toEqual(mockUser);
+    });
+
+    it('should return null when user not found', async () => {
+      mockPrisma.user.findUnique.mockResolvedValue(null);
+
+      const result = await usersService.findByProvider(
+        'GITHUB',
+        'nonexistent',
+      );
+
+      expect(result).toBeNull();
+    });
+  });
+
+  describe('findById', () => {
+    it('should find user by id', async () => {
+      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
+
+      const result = await usersService.findById('user-uuid-123');
+
+      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
+        where: { id: 'user-uuid-123' },
+      });
+      expect(result).toEqual(mockUser);
+    });
+  });
+
+  describe('create', () => {
+    it('should create a new user', async () => {
+      mockPrisma.user.create.mockResolvedValue(mockUser);
+
+      const input = {
+        provider: 'GOOGLE' as const,
+        providerId: '123456',
+        email: 'test@example.com',
+        displayName: 'Test User',
+        avatarUrl: 'https://example.com/avatar.jpg',
+      };
+
+      const result = await usersService.create(input);
+
+      expect(mockPrisma.user.create).toHaveBeenCalledWith({
+        data: {
+          provider: 'GOOGLE',
+          providerId: '123456',
+          email: 'test@example.com',
+          displayName: 'Test User',
+          avatarUrl: 'https://example.com/avatar.jpg',
+        },
+      });
+      expect(result).toEqual(mockUser);
+    });
+  });
+
+  describe('updateLastLogin', () => {
+    it('should update lastLoginAt timestamp', async () => {
+      mockPrisma.user.update.mockResolvedValue(mockUser);
+
+      await usersService.updateLastLogin('user-uuid-123');
+
+      expect(mockPrisma.user.update).toHaveBeenCalledWith({
+        where: { id: 'user-uuid-123' },
+        data: { lastLoginAt: expect.any(Date) },
+      });
+    });
+  });
+});
diff --git a/ultimatype-monorepo/apps/api/src/modules/users/users.service.ts b/ultimatype-monorepo/apps/api/src/modules/users/users.service.ts
new file mode 100644
index 0000000..d63e3a8
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/modules/users/users.service.ts
@@ -0,0 +1,52 @@
+import { Injectable } from '@nestjs/common';
+import { PrismaService } from '../../prisma/prisma.service';
+import { AuthProvider } from '../../../../generated/prisma';
+
+export interface CreateUserInput {
+  provider: 'GOOGLE' | 'GITHUB';
+  providerId: string;
+  email: string;
+  displayName: string;
+  avatarUrl: string | null;
+}
+
+@Injectable()
+export class UsersService {
+  constructor(private prisma: PrismaService) {}
+
+  async findByProvider(provider: 'GOOGLE' | 'GITHUB', providerId: string) {
+    return this.prisma.user.findUnique({
+      where: {
+        provider_providerId: {
+          provider: provider as AuthProvider,
+          providerId,
+        },
+      },
+    });
+  }
+
+  async findById(id: string) {
+    return this.prisma.user.findUnique({
+      where: { id },
+    });
+  }
+
+  async create(input: CreateUserInput) {
+    return this.prisma.user.create({
+      data: {
+        provider: input.provider as AuthProvider,
+        providerId: input.providerId,
+        email: input.email,
+        displayName: input.displayName,
+        avatarUrl: input.avatarUrl,
+      },
+    });
+  }
+
+  async updateLastLogin(id: string) {
+    return this.prisma.user.update({
+      where: { id },
+      data: { lastLoginAt: new Date() },
+    });
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/src/prisma/prisma.module.ts b/ultimatype-monorepo/apps/api/src/prisma/prisma.module.ts
new file mode 100644
index 0000000..7207426
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/prisma/prisma.module.ts
@@ -0,0 +1,9 @@
+import { Global, Module } from '@nestjs/common';
+import { PrismaService } from './prisma.service';
+
+@Global()
+@Module({
+  providers: [PrismaService],
+  exports: [PrismaService],
+})
+export class PrismaModule {}
diff --git a/ultimatype-monorepo/apps/api/src/prisma/prisma.service.ts b/ultimatype-monorepo/apps/api/src/prisma/prisma.service.ts
new file mode 100644
index 0000000..4e172fd
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/src/prisma/prisma.service.ts
@@ -0,0 +1,16 @@
+import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
+import { PrismaClient } from '../../../generated/prisma';
+
+@Injectable()
+export class PrismaService
+  extends PrismaClient
+  implements OnModuleInit, OnModuleDestroy
+{
+  async onModuleInit() {
+    await this.$connect();
+  }
+
+  async onModuleDestroy() {
+    await this.$disconnect();
+  }
+}
diff --git a/ultimatype-monorepo/apps/api/vitest.config.ts b/ultimatype-monorepo/apps/api/vitest.config.ts
new file mode 100644
index 0000000..1cf7798
--- /dev/null
+++ b/ultimatype-monorepo/apps/api/vitest.config.ts
@@ -0,0 +1,26 @@
+import { defineConfig } from 'vitest/config';
+import path from 'path';
+
+export default defineConfig({
+  test: {
+    globals: true,
+    environment: 'node',
+    root: path.resolve(__dirname),
+    include: ['src/**/*.spec.ts'],
+    coverage: {
+      provider: 'v8',
+    },
+  },
+  resolve: {
+    alias: {
+      '../../../generated/prisma': path.resolve(
+        __dirname,
+        '../../generated/prisma',
+      ),
+      '../../../../generated/prisma': path.resolve(
+        __dirname,
+        '../../generated/prisma',
+      ),
+    },
+  },
+});
diff --git a/ultimatype-monorepo/libs/shared/src/dto/auth.dto.ts b/ultimatype-monorepo/libs/shared/src/dto/auth.dto.ts
new file mode 100644
index 0000000..6437121
--- /dev/null
+++ b/ultimatype-monorepo/libs/shared/src/dto/auth.dto.ts
@@ -0,0 +1,18 @@
+export interface AuthTokensResponse {
+  accessToken: string;
+  refreshToken: string;
+}
+
+export interface UserProfileResponse {
+  id: string;
+  provider: 'GOOGLE' | 'GITHUB';
+  email: string;
+  displayName: string;
+  avatarUrl: string | null;
+  countryCode: string | null;
+  createdAt: string;
+}
+
+export interface RefreshTokenRequest {
+  refreshToken: string;
+}
diff --git a/ultimatype-monorepo/libs/shared/src/types/user.ts b/ultimatype-monorepo/libs/shared/src/types/user.ts
new file mode 100644
index 0000000..6a64454
--- /dev/null
+++ b/ultimatype-monorepo/libs/shared/src/types/user.ts
@@ -0,0 +1,14 @@
+export type AuthProvider = 'GOOGLE' | 'GITHUB';
+
+export interface UserProfile {
+  id: string;
+  provider: AuthProvider;
+  providerId: string;
+  email: string;
+  displayName: string;
+  avatarUrl: string | null;
+  countryCode: string | null;
+  createdAt: string;
+  updatedAt: string;
+  lastLoginAt: string;
+}
diff --git a/ultimatype-monorepo/prisma.config.ts b/ultimatype-monorepo/prisma.config.ts
new file mode 100644
index 0000000..831a20f
--- /dev/null
+++ b/ultimatype-monorepo/prisma.config.ts
@@ -0,0 +1,14 @@
+// This file was generated by Prisma, and assumes you have installed the following:
+// npm install --save-dev prisma dotenv
+import "dotenv/config";
+import { defineConfig } from "prisma/config";
+
+export default defineConfig({
+  schema: "prisma/schema.prisma",
+  migrations: {
+    path: "prisma/migrations",
+  },
+  datasource: {
+    url: process.env["DATABASE_URL"],
+  },
+});
diff --git a/ultimatype-monorepo/prisma/schema.prisma b/ultimatype-monorepo/prisma/schema.prisma
new file mode 100644
index 0000000..8d5e9cd
--- /dev/null
+++ b/ultimatype-monorepo/prisma/schema.prisma
@@ -0,0 +1,32 @@
+// This is the UltimaType Prisma schema
+// Docs: https://pris.ly/d/prisma-schema
+
+generator client {
+  provider = "prisma-client"
+  output   = "../generated/prisma"
+}
+
+datasource db {
+  provider = "postgresql"
+}
+
+enum AuthProvider {
+  GOOGLE
+  GITHUB
+}
+
+model User {
+  id          String       @id @default(uuid())
+  provider    AuthProvider
+  providerId  String       @map("provider_id")
+  email       String
+  displayName String       @map("display_name")
+  avatarUrl   String?      @map("avatar_url")
+  countryCode String?      @map("country_code")
+  createdAt   DateTime     @default(now()) @map("created_at")
+  updatedAt   DateTime     @updatedAt @map("updated_at")
+  lastLoginAt DateTime     @default(now()) @map("last_login_at")
+
+  @@unique([provider, providerId])
+  @@map("users")
+}
