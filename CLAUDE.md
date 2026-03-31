# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UltimaType is a typing competition platform. It is an **Nx monorepo** with a NestJS backend (`apps/api`) and a React 19 frontend (`apps/web`), plus a shared types library (`libs/shared`).

## Development Commands

### Local services (PostgreSQL + Redis via Docker)

```bash
docker-compose up -d
```

### Install dependencies

```bash
npm install
```

### Database migrations

```bash
npx prisma migrate dev
npx prisma generate          # Regenerate Prisma client after schema changes
```

### Serve apps

```bash
npx nx serve web             # Frontend: http://localhost:4200
npx nx serve api             # Backend:  http://localhost:3000/api
```

### Build

```bash
npx nx build web
npx nx build api
```

### Tests

```bash
npx nx test api              # Backend unit tests (Vitest, Node environment)
npx nx test web              # Frontend unit tests (Vitest, jsdom environment)
```

To run a single test file, pass the path via the `--testFile` flag or use `--testNamePattern`.

### Lint

```bash
npx nx lint api
npx nx lint web
```

## Architecture

### Backend (`apps/api`) — NestJS 11

- **AppModule** bootstraps `ConfigModule` (Zod-validated env vars) and `PrismaModule` (global).
- **AuthModule** handles all authentication:
    - Passport strategies: `GoogleStrategy`, `GithubStrategy`, `JwtStrategy`, `JwtRefreshStrategy`
    - Guards: `GoogleAuthGuard`, `GithubAuthGuard`, `JwtAuthGuard`, `JwtRefreshGuard`
    - `AuthService` generates JWTs and validates OAuth users
- **UsersModule** (`UsersService`) handles DB CRUD; called by `AuthService` on first OAuth login.
- **PrismaModule** provides a global `PrismaService` (connects on init, disconnects on destroy).

### Frontend (`apps/web`) — React 19 + Vite

- **`useAuth` hook** (`src/hooks/use-auth.ts`): central auth state; fetches `/auth/me`, handles login redirects, callback code exchange, and logout.
- **`apiClient`** (`src/lib/api-client.ts`): fetch wrapper that attaches `Authorization: Bearer` header, auto-refreshes on 401, and replays failed requests.
- Tokens are stored in `localStorage` (`accessToken`, `refreshToken`).
- TanStack React Query is used for data fetching and cache invalidation.
- UI labels are in Spanish.

### Shared Library (`libs/shared`)

Contains `UserProfile` interface and auth DTOs shared between frontend and backend. Import via `@ultimatype-monorepo/shared`.

### Authentication Flow

1. User clicks OAuth login → browser navigates to `/api/auth/google` or `/api/auth/github`.
2. Passport handles the callback; backend issues a short-lived auth code (JWT, 60 s).
3. Browser is redirected to `/auth/callback?code=<JWT>`.
4. `AuthCallback` component calls `POST /auth/code` to exchange the code for `accessToken` + `refreshToken`.
5. Tokens stored in `localStorage`; React Query invalidated to trigger profile fetch.

### Database (PostgreSQL via Prisma)

- Schema lives in `prisma/schema.prisma`; generated client is in `generated/`.
- `User` model has a unique constraint on `(provider, providerId)` — one record per OAuth identity.

## Environment Variables

Copy `.env.example` to `.env` and fill in OAuth credentials and secrets. Required vars:

- `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`
- `GITHUB_CLIENT_ID/SECRET/CALLBACK_URL`
- `FRONTEND_URL` (default `http://localhost:4200`)

## Skill bmad

- Every time the user asks for a skill that starts with BMAD-\*, look for that skill in the .agent folder

## Party Mode

- When the user requests a party mode, you have to find out how to activate it; that's in the @.agent skills.
