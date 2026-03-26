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

### Review Findings

#### Decision Needed ✅ Resueltos

- [x] [Review][Decision→Patch] **Tokens en URL → Authorization Code temporal** — Decisión: usar authorization code temporal de corta vida intercambiado via POST en lugar de tokens directos en URL. El callback redirige con un code efímero; el frontend intercambia el code por tokens via `POST /api/auth/token`. [blind+edge+auditor]
- [x] [Review][Decision→Patch] **`/auth/me` retorna subset JWT, no UserProfile completo** — Decisión: query a DB para retornar `UserProfile` completo con todos los campos del modelo `User`. [blind+auditor]
- [x] [Review][Decision→Dismiss] **Email `@@unique` por provider vs global** — Decisión: mantener diseño multi-provider = multi-user. Sin constraint global. [edge]

#### Patch (Fix Automático)

- [ ] [Review][Patch] **`get()!` → `getOrThrow()` para env vars críticas** — `auth.service.ts`, `google.strategy.ts`, `github.strategy.ts`, `jwt.strategy.ts`, `jwt-refresh.strategy.ts`. 6 instancias donde `configService.get<string>('...')!` debería ser `configService.getOrThrow<string>('...')` para fallar al arrancar, no silenciosamente en runtime. [blind+edge]
- [ ] [Review][Patch] **Email vacío aceptado en GitHub strategy** — `github.strategy.ts:26`. `profile.emails?.[0]?.value ?? ''` persiste string vacío. Lanzar `UnauthorizedException` si email no disponible. [blind+edge]
- [ ] [Review][Patch] **`validateOAuthUser` retorna objeto stale** — `auth.service.ts:337-338`. Se llama `updateLastLogin` pero se retorna `existingUser` (previo al update). Retornar el resultado de `updateLastLogin()`. [blind]
- [ ] [Review][Patch] **ConfigModule sin validationSchema** — `app.module.ts:21`. Agregar schema de validación Joi/Zod para fallar al arrancar si faltan env vars requeridas. [blind+edge]
- [ ] [Review][Patch] **Race condition en first-login concurrente** — `auth.service.ts:30-42`. `create()` puede recibir P2002 unique constraint. Envolver en try/catch y retry `findByProvider()` en conflicto. [edge]
- [ ] [Review][Patch] **Callback duplicado Google/GitHub sin método compartido** — `auth.controller.ts:76-106`. Ambos callbacks son idénticos. Extraer a método privado compartido para evitar divergencia. [edge]
- [ ] [Review][Patch] **Shared DTOs definidos pero no consumidos** — `libs/shared/src/dto/auth.dto.ts`, `types/user.ts`. Backend y frontend definen tipos localmente en vez de importar desde `@ultimatype/shared`. Refactorizar imports. [auditor]
- [ ] [Review][Patch] **Import frágil de Prisma** — `users.service.ts:3`. Ruta relativa `'../../../../generated/prisma'` debería usar alias tsconfig `@ultimatype/generated/prisma`. [blind+edge+auditor]

#### Deferred

- [x] [Review][Defer] **Refresh token sin rotación ni invalidación** — `auth.service.ts`. No hay persistencia de refresh tokens (tabla o Redis). Imposible revocar tokens robados. — deferred, requiere diseño de tabla/Redis para token blacklist (post-MVP)
- [x] [Review][Defer] **Rate limiting ausente en endpoints auth** — `/auth/refresh`, `/auth/me`. Sin rate limiting. — deferred, pre-existente (no hay rate limiting infra aún)

#### Dismissed (2)

- ~~`PrismaService` sin graceful shutdown para SIGTERM~~ — `onModuleDestroy` cubre el ciclo NestJS, suficiente para desarrollo.
- ~~`prisma.config.ts` duplica config de `schema.prisma`~~ — Archivo autogenerado por `prisma init`, no conflicto real.
