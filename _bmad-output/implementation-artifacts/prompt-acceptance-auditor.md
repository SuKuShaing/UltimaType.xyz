# Acceptance Auditor Review Prompt

You are an Acceptance Auditor. Review this diff against the spec and context docs. Check for: violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, contradictions between spec constraints and actual code. Output findings as a Markdown list. Each finding: one-line title, which AC/constraint it violates, and evidence from the diff.

## SPEC
# Story 1.2: OAuth 2.0 Integration (Google & GitHub)

Status: review

## Story

As a new or returning user,
I want to log in using my Google or GitHub account,
So that I can access the platform quickly without creating a new password and maintain a persistent session.

## Acceptance Criteria

1. **Given** an unauthenticated user on the landing page **When** they click "Log in with Google" or "Log in with GitHub" **Then** they are redirected to the respective OAuth provider.
2. **Given** a successful OAuth callback from Google or GitHub **When** the backend processes the OAuth response **Then** a JWT access token (24h expiration) and a refresh token are issued.
3. **Given** a newly authenticated user with no existing profile **When** the OAuth callback is processed **Then** a new user record is created in PostgreSQL with `provider`, `providerId`, `email`, `displayName`, and `avatarUrl` extracted from the OAuth profile.
4. **Given** a returning user (matching `provider` + `providerId`) **When** they log in again **Then** no duplicate record is created; the existing profile is used and `lastLoginAt` is updated.
5. **Given** an authenticated user with a valid JWT stored in the browser **When** they reload the page or return later **Then** their session persists automatically (no re-login required while token is valid).
6. **Given** an expired JWT access token **When** the frontend attempts an API call **Then** the refresh token is used to silently obtain a new access token without user intervention.
7. **Given** any protected API endpoint **When** an unauthenticated request is made **Then** a `401 Unauthorized` response is returned.

## Tasks / Subtasks

- [x] Task 1: Prisma Schema & Database Setup (AC: #3, #4)
  - [x] 1.1 Instalar Prisma y configurar datasource PostgreSQL
  - [x] 1.2 Crear modelo `User` en `schema.prisma` con todos los campos
  - [x] 1.3 Agregar unique constraint compuesto `@@unique([provider, providerId])`
  - [x] 1.4 Crear `PrismaModule` y `PrismaService` como módulo global
  - [ ] 1.5 Ejecutar migración (requiere PostgreSQL en Docker)
- [x] Task 2: Auth Module Backend - NestJS (AC: #1, #2, #6, #7)
  - [x] 2.1-2.2 Instalar dependencias y types
  - [x] 2.3 ConfigModule global con env vars
  - [x] 2.4 auth.module.ts
  - [x] 2.5 google.strategy.ts
  - [x] 2.6 github.strategy.ts
  - [x] 2.7 jwt.strategy.ts
  - [x] 2.8 jwt-refresh.strategy.ts
  - [x] 2.9 auth.service.ts
  - [x] 2.10 auth.controller.ts con todos los endpoints
  - [x] 2.11 Guards: GoogleAuthGuard, GithubAuthGuard, JwtAuthGuard, JwtRefreshGuard
- [x] Task 3: Users Module Backend (AC: #3, #4)
  - [x] 3.1 users.module.ts
  - [x] 3.2 users.service.ts con findByProvider(), create(), findById(), updateLastLogin()
  - [x] 3.3 Exportar UsersService
- [x] Task 4: Shared DTOs & Types (AC: all)
  - [x] 4.1 libs/shared/src/dto/auth.dto.ts
  - [x] 4.2 libs/shared/src/types/user.ts
  - [x] 4.3 Exportar desde libs/shared/src/index.ts
- [x] Task 5: Frontend Auth Flow (AC: #1, #5, #6)
  - [x] 5.1 @tanstack/react-query instalado
  - [x] 5.2 api-client.ts con Bearer injection + auto-refresh en 401
  - [x] 5.3 use-auth.ts con TanStack Query
  - [x] 5.4 auth-buttons.tsx con iconos SVG
  - [x] 5.5 auth-callback.tsx + callback handler en useAuth
  - [x] 5.6 QueryClientProvider en main.tsx (TanStack Query reemplaza React Context)
  - [x] 5.7 App con rutas auth/callback y display condicional
- [x] Task 6: Environment & Docker Setup (AC: all)
  - [x] 6.1 .env.example con todas las variables documentadas
  - [x] 6.2 docker-compose.yml con PostgreSQL 16 + Redis 7
  - [x] 6.3 Variables documentadas en .env.example
- [x] Task 7: Testing (AC: all)
  - [x] 7.1 auth.service.spec.ts: 5 tests (upsert, token gen, refresh, error)
  - [x] 7.2 users.service.spec.ts: 5 tests (findByProvider, findById, create, updateLastLogin)
  - [ ] 7.3 Test de integración (deferred: requiere DB running)

## Dev Notes

### Arquitectura de Autenticación

El flujo OAuth sigue el estándar Authorization Code Flow:
1. Frontend redirige a `GET /api/auth/google` (o `/github`)
2. NestJS Passport redirige al OAuth provider
3. Provider redirige a `GET /api/auth/google/callback` con authorization code
4. NestJS intercambia code por tokens del provider, extrae perfil
5. `auth.service.validateOAuthUser()` hace upsert en PostgreSQL
6. `auth.service.generateTokens()` firma JWT (access 24h + refresh 7d)
7. Redirect al frontend con tokens en URL query params (o fragment)
8. Frontend almacena tokens y marca sesión activa

### Anti-Patrones a Evitar

- **NO crear sistema de passwords propio** — Solo OAuth (NFR8)
- **NO usar sessions server-side** — Solo JWT stateless
- **NO almacenar tokens sensibles en localStorage sin expiración** — Access token en memoria/localStorage con TTL, refresh token preferiblemente en httpOnly cookie
- **NO hardcodear client IDs/secrets** — Usar ConfigModule con env vars
- **NO usar `useState` para estado de auth global** — Usar TanStack Query para el perfil auth (`/api/auth/me`) que cachea automáticamente

### Convenciones Críticas del Proyecto

- **Archivos:** estricto `kebab-case.ts` / `kebab-case.tsx` (ej. `google.strategy.ts`, `auth.controller.ts`, `use-auth.ts`)
- **Tipos/Interfaces:** `PascalCase` sin prefijo "I" (ej. `UserProfile`, no `IUserProfile`)
- **Endpoints REST:** plural unificado bajo `/api/` (ej. `/api/auth/google`, `/api/users`)
- **DB tablas:** `snake_case` con Prisma `@@map()` (ej. tabla `users` → modelo `User`)
- **DB columnas:** `snake_case` en PostgreSQL, `camelCase` en Prisma (ej. `created_at` → `createdAt` via `@map`)

### Dependencias de npm Requeridas

```bash
# Producción
npm install @nestjs/passport passport passport-google-oauth20 passport-github2 @nestjs/jwt passport-jwt @nestjs/config @prisma/client @tanstack/react-query

# Desarrollo
npm install -D prisma @types/passport-google-oauth20 @types/passport-github2 @types/passport-jwt
```

### Versiones Específicas del Stack Actual

| Paquete | Versión actual |
|---------|---------------|
| NestJS | ^11.0.0 |
| React | ^19.0.0 |
| Vite | ^7.0.0 |
| TypeScript | ~5.9.2 |
| Vitest | ~4.0.0 |

> **IMPORTANTE:** `@nestjs/passport` con NestJS 11 requiere `passport@^0.7.0`. Verificar compatibilidad con las strategies de Google y GitHub al instalar.

### Project Structure Notes

Estructura objetivo tras completar esta story:

```text
ultimatype-monorepo/
├── .env.example                  # Variables OAuth documentadas
├── docker-compose.yml            # PostgreSQL + Redis local
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   └── ui/
│   │       │       └── auth-buttons.tsx
│   │       ├── hooks/
│   │       │   └── use-auth.ts
│   │       └── lib/
│   │           └── api-client.ts
│   └── api/
│       └── src/
│           ├── modules/
│           │   ├── auth/
│           │   │   ├── auth.module.ts
│           │   │   ├── auth.controller.ts
│           │   │   ├── auth.service.ts
│           │   │   ├── strategies/
│           │   │   │   ├── google.strategy.ts
│           │   │   │   ├── github.strategy.ts
│           │   │   │   ├── jwt.strategy.ts
│           │   │   │   └── jwt-refresh.strategy.ts
│           │   │   └── guards/
│           │   │       ├── google-auth.guard.ts
│           │   │       ├── github-auth.guard.ts
│           │   │       ├── jwt-auth.guard.ts
│           │   │       └── jwt-refresh.guard.ts
│           │   └── users/
│           │       ├── users.module.ts
│           │       └── users.service.ts
│           └── prisma/
│               ├── prisma.module.ts
│               ├── prisma.service.ts
│               └── schema.prisma
└── libs/
    └── shared/
        └── src/
            ├── dto/
            │   └── auth.dto.ts
            ├── types/
            │   └── user.ts
            └── index.ts
```

### Alineación Confirmada

- La ubicación de archivos sigue exactamente el árbol definido en `architecture.md` §Project Structure
- Los módulos NestJS siguen el patrón de dominios verticales (auth, users) especificado en la arquitectura
- Los DTOs compartidos residen en `libs/shared` conforme al patrón Nx monorepo establecido

### Previous Story Intelligence (1-1)

- **Lección 1:** `libs/shared` ya fue generado manualmente via `npx nx g @nx/js:library --directory=libs/shared` — ya existe y exporta desde `index.ts`
- **Lección 2:** Se detectó inconsistencia de linter entre `apps/web` y `apps/api`. Se creó `apps/api/eslint.config.mjs` extendiendo la config root. Cualquier módulo nuevo debe respetar esta estructura
- **Lección 3:** Las convenciones de file naming (`kebab-case`) no tienen enforcement automático aún (deferred). El dev agent DEBE ser disciplinado manualmente

### Git Intelligence

Últimos commits relevantes:
- `d742901` — 1-1-workspace-infrastructure-scaffolding: done
- `28535a5` — 1-1-workspace-infrastructure-scaffolding Listo

La estructura base del monorepo está confirmada y funcional. No hay conflictos pendientes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — User story y acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] — Passport JWT, RS256/HS256, flujos OAuth
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — Endpoints REST bajo `/api/`
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — Convenciones kebab-case, snake_case, PascalCase
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — Ubicación de `modules/auth/`, `libs/shared`
- [Source: _bmad-output/planning-artifacts/epics.md#FR1,FR2,FR4] — OAuth Google, OAuth GitHub, sesión persistida
- [Source: _bmad-output/planning-artifacts/epics.md#NFR8,NFR9] — OAuth exclusivo (sin passwords), JWT 24h expiration
- [Source: _bmad-output/implementation-artifacts/1-1-workspace-infrastructure-scaffolding.md#Review Findings] — Learnings de story anterior

## Dev Agent Record

### Agent Model Used

Antigravity (Google Deepmind)

### Debug Log References

- Vitest required `vi.fn()` instead of `jest.fn()` — tests rewritten
- Prisma generated client path needed alias in `vitest.config.ts`
- NestJS TestingModule DI failed due to Prisma import chain — switched to manual instantiation
- Strategy constructors: removed `private` from configService (only used in super()), added `!` assertions
- Auth controller: used `any` for `@Req()`/`@Res()` params to avoid `isolatedModules` import type error
- JwtService.signAsync expiresIn: cast to `any` for NestJS JWT v11 type compat

### Completion Notes List

- ✅ 10/10 unit tests passing (5 AuthService + 5 UsersService)
- ✅ Full OAuth 2.0 flow: Google + GitHub via Passport.js
- ✅ JWT dual token system: access (24h) + refresh (7d)
- ✅ Prisma schema with User model, UUID PK, composite unique, snake_case mapping
- ✅ Frontend: TanStack Query, auto-refresh on 401, OAuth buttons with SVG icons
- ✅ Docker Compose: PostgreSQL 16 + Redis 7
- ⚠️ Pending: `prisma migrate dev` (needs running PostgreSQL)
- ⚠️ Pending: Integration tests (needs running PostgreSQL)
- 📝 Decision: Used `any` types in auth controller decorated params due to `isolatedModules` constraint
- 📝 Decision: TanStack Query replaces React Context for auth state (simpler, auto-caching)

### Change Log

- 2026-03-26: Story 1.2 implementation complete — OAuth Google/GitHub, JWT, Prisma schema, frontend auth flow

### File List

#### New Files
- prisma/schema.prisma
- prisma.config.ts (auto-generated by prisma init)
- docker-compose.yml
- .env.example
- .env
- apps/api/vitest.config.ts
- apps/api/src/prisma/prisma.module.ts
- apps/api/src/prisma/prisma.service.ts
- apps/api/src/modules/auth/auth.module.ts
- apps/api/src/modules/auth/auth.controller.ts
- apps/api/src/modules/auth/auth.service.ts
- apps/api/src/modules/auth/auth.service.spec.ts
- apps/api/src/modules/auth/strategies/google.strategy.ts
- apps/api/src/modules/auth/strategies/github.strategy.ts
- apps/api/src/modules/auth/strategies/jwt.strategy.ts
- apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
- apps/api/src/modules/auth/guards/google-auth.guard.ts
- apps/api/src/modules/auth/guards/github-auth.guard.ts
- apps/api/src/modules/auth/guards/jwt-auth.guard.ts
- apps/api/src/modules/auth/guards/jwt-refresh.guard.ts
- apps/api/src/modules/users/users.module.ts
- apps/api/src/modules/users/users.service.ts
- apps/api/src/modules/users/users.service.spec.ts
- apps/web/src/lib/api-client.ts
- apps/web/src/hooks/use-auth.ts
- apps/web/src/components/ui/auth-buttons.tsx
- apps/web/src/components/auth/auth-callback.tsx
- libs/shared/src/dto/auth.dto.ts
- libs/shared/src/types/user.ts

#### Modified Files
- apps/api/src/app/app.module.ts (added ConfigModule, PrismaModule, AuthModule)
- apps/web/src/main.tsx (added QueryClientProvider)
- apps/web/src/app/app.tsx (added auth routes and conditional display)
- libs/shared/src/index.ts (added DTO and type exports)
- package.json (new dependencies)

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
