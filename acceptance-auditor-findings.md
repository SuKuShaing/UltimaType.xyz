# Acceptance Auditor — Story 1.2: OAuth 2.0 Integration

**Layer:** Acceptance Auditor  
**Scope:** Diff + on-disk frontend files vs. Story 1.2 Spec & 7 Acceptance Criteria

---

## ✅ PASS — Criteria Fully Satisfied

### AC #3 — New user record creation
- `auth.service.validateOAuthUser()` creates via `usersService.create()` when `findByProvider()` returns null ✔
- Prisma `User` model contains all required fields: `provider`, `providerId`, `email`, `displayName`, `avatarUrl` ✔
- `@@unique([provider, providerId])` composite constraint present ✔
- `@map` annotations produce `snake_case` DB columns per spec ✔

### AC #4 — Returning user (no duplicate + `lastLoginAt` update)
- `validateOAuthUser()` calls `findByProvider()` → `updateLastLogin()` on existing user ✔
- Unit test `should return existing user and update lastLoginAt` validates this path ✔

### AC #7 — Protected endpoints return 401
- `@UseGuards(JwtAuthGuard)` on `GET /auth/me` ✔
- `JwtStrategy` extracts Bearer token + validates + rejects with `401` automatically via Passport ✔

---

## ⚠️ FINDINGS — Spec Deviations & AC Violations

### Finding 1: **Tokens in URL query params → security violation**
- **AC Violated:** AC #2 (JWT issuance), Dev Notes §Anti-Patrones ("refresh token preferiblemente en httpOnly cookie")
- **Evidence:** `auth.controller.ts` lines 53-57 (googleCallback) and 70-78 (githubCallback) put **both** accessToken and refreshToken as URL query parameters:
  ```ts
  res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  ```
- **Impact:** Tokens leak into browser history, server logs, referrer headers. The spec's anti-pattern guidance explicitly warns against this for refresh tokens. This is a **security risk**, not a bug per se — but contradicts the spec's own stated anti-pattern.
- **Severity:** 🟡 MEDIUM — Acceptable for MVP if documented; should be tracked as tech debt.

### Finding 2: **`GET /auth/me` returns Passport's `req.user`, NOT the full `UserProfile` from DB**
- **AC Violated:** AC #5 (session persists with user profile data)
- **Evidence:** `auth.controller.ts`:
  ```ts
  @Get('me') async getProfile(@Req() req: any) { return req.user; }
  ```
  `jwt.strategy.ts` validate() returns `{ userId, email, displayName }` — a subset of JWT claims.
- **Impact:** The `/auth/me` endpoint returns JWT-derived data (userId, email, displayName) rather than querying the DB for the full `UserProfile`. The shared DTO `UserProfileResponse` defines `id`, `provider`, `email`, `displayName`, `avatarUrl`, `countryCode`, `createdAt` — **none of these fields except email/displayName are returned**. The `id` field is returned as `userId` (naming mismatch).
- **Severity:** 🟡 MEDIUM — Frontend `use-auth.ts` defines `UserProfile` as `{userId, email, displayName}` to match, so it functions, but violates the shared DTO contract.

### Finding 3: **Shared DTOs defined but NOT consumed**
- **AC Violated:** Task 4 (Shared DTOs & Types), spec constraint "all, AC"
- **Evidence:** `libs/shared/src/dto/auth.dto.ts` defines `AuthTokensResponse`, `UserProfileResponse`, `RefreshTokenRequest`. `libs/shared/src/types/user.ts` defines `UserProfile`, `AuthProvider`. **None of these are imported by backend or frontend code.** 
  - Backend `auth.service.ts` defines its own `OAuthUserInput`, `AuthTokens` locally
  - Frontend `use-auth.ts` defines its own `UserProfile` interface locally
  - Backend `users.service.ts` defines its own `CreateUserInput` locally
- **Impact:** The shared lib exists but serves no purpose — types are duplicated across apps.
- **Severity:** 🟡 MEDIUM — Structural violation; the monorepo shared pattern is bypassed.

### ~~Finding 4: Controller mounted at `/auth`, not `/api/auth`~~ — ✅ VERIFIED OK
- **Originally flagged as 🔴 HIGH** but after checking `apps/api/src/main.ts`, line 12-13 confirms:
  ```ts
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  ```
- The diff didn't include `main.ts` (pre-existing file), which caused the false positive. **No issue.**

### Finding 5: **`.env.example` file missing from diff and disk**
- **AC Violated:** Task 6 (AC: all) — "6.1 .env.example con todas las variables documentadas"
- **Evidence:** The file list in the spec says `.env.example` was created. `find` on disk returns 0 results for `.env*`. The diff doesn't include it either.
- **Impact:** New developers have no reference for required environment variables.
- **Severity:** 🟡 MEDIUM — Onboarding gap.

### Finding 6: **`AuthCallback` has stale closure issue with `handleCallback`**
- **AC Violated:** AC #5 (session persists after callback)
- **Evidence:** `auth-callback.tsx`:
  ```tsx
  useEffect(() => {
    const success = handleCallback(searchParams);
    // ...
  }, [searchParams, handleCallback, navigate]);
  ```
  `handleCallback` is from `useAuth()` which recreates the function on every render (no `useCallback`). Combined with `StrictMode` double-render, this could fire twice or with stale references. However, the redirect (`navigate('/')`) should prevent practical issues.
- **Severity:** 🟢 LOW — Unlikely to cause bugs in production but not idiomatic.

### Finding 7: **`AuthProvider` enum imported from generated Prisma path, not shared lib**
- **AC Violated:** Task 4 (shared types), architecture pattern (libs/shared as single source of truth)
- **Evidence:** `users.service.ts`:
  ```ts
  import { AuthProvider } from '../../../../generated/prisma';
  ```
  The shared lib `libs/shared/src/types/user.ts` already exports `type AuthProvider = 'GOOGLE' | 'GITHUB'`, but it's not used.
- **Severity:** 🟢 LOW — Functionally correct but architecturally inconsistent.

---

## 📋 Triage Summary

| # | Finding | Severity | AC | Action |
|---|---------|----------|-----|--------|
| 1 | Tokens in URL query params | 🟡 MEDIUM | #2 | Track as tech debt; consider fragment hash or httpOnly cookies |
| 2 | `/auth/me` returns JWT subset, not full UserProfile | 🟡 MEDIUM | #5 | Query DB in controller or accept as intentional thin response |
| 3 | Shared DTOs defined but never imported | 🟡 MEDIUM | Task 4 | Refactor to import from `@ultimatype/shared` |
| 4 | ~~Missing `/api` global prefix~~ | ✅ VERIFIED | Conventions | Confirmed in `main.ts` — no action needed |
| 5 | `.env.example` missing from disk | 🟡 MEDIUM | Task 6.1 | Create the file |
| 6 | `handleCallback` stale closure risk | 🟢 LOW | #5 | Wrap in `useCallback` |
| 7 | `AuthProvider` imported from generated path | 🟢 LOW | Task 4 | Use shared lib type |

**Verdict:** 0 HIGH findings (Finding #4 verified OK). 4 MEDIUM findings are acceptable for MVP with documented tech debt. 2 LOW findings are cosmetic.
