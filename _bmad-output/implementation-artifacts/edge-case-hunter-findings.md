# Edge Case Hunter — OAuth 2.0 Integration Findings

**Scope:** Diff from `prompt-edge-case-hunter.md` (Story 1.2 OAuth 2.0 Integration)
**Date:** 2026-03-26

## Findings (JSON)

```json
[
  {
    "location": "auth.controller.ts:76-85",
    "trigger_condition": "FRONTEND_URL env var is undefined or empty",
    "guard_snippet": "const frontendUrl = this.configService.get<string>('FRONTEND_URL'); if (!frontendUrl) throw new InternalServerErrorException('FRONTEND_URL not configured');",
    "potential_consequence": "Redirect to 'undefined/auth/callback?...' — user gets 404 or DNS error"
  },
  {
    "location": "auth.controller.ts:76-85",
    "trigger_condition": "req.user is undefined (Passport strategy failure without exception)",
    "guard_snippet": "if (!req.user) throw new UnauthorizedException('OAuth validation failed');",
    "potential_consequence": "validateOAuthUser receives undefined, causing unhandled TypeError"
  },
  {
    "location": "auth.controller.ts:76-85",
    "trigger_condition": "validateOAuthUser or generateTokens throws at runtime",
    "guard_snippet": "Wrap in try/catch and redirect to frontendUrl/auth/callback?error=oauth_failed",
    "potential_consequence": "Unhandled exception returns raw 500 JSON during redirect flow"
  },
  {
    "location": "auth.controller.ts:80-83",
    "trigger_condition": "Tokens passed via URL query string (GET redirect)",
    "guard_snippet": "Consider short-lived authorization code exchanged via POST instead of tokens in URL",
    "potential_consequence": "Tokens visible in browser history, server logs, Referer headers"
  },
  {
    "location": "auth.controller.ts:97-106",
    "trigger_condition": "GitHub callback duplicates Google callback — same unguarded paths",
    "guard_snippet": "Extract to shared private method to avoid divergence",
    "potential_consequence": "Duplicated risk surface — fixes applied to one callback may miss the other"
  },
  {
    "location": "auth.controller.ts:112-116",
    "trigger_condition": "req.user.userId is undefined (malformed JWT lacking 'sub')",
    "guard_snippet": "if (!req.user?.userId) throw new UnauthorizedException('Invalid token payload');",
    "potential_consequence": "refreshTokens with undefined userId — misleading error path"
  },
  {
    "location": "auth.service.ts:55-58",
    "trigger_condition": "JWT_SECRET env var is missing (get() returns undefined)",
    "guard_snippet": "const secret = this.configService.getOrThrow<string>('JWT_SECRET');",
    "potential_consequence": "Tokens signed with undefined secret — critical security vulnerability"
  },
  {
    "location": "auth.service.ts:72-75",
    "trigger_condition": "JWT_REFRESH_SECRET env var is missing",
    "guard_snippet": "const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');",
    "potential_consequence": "Refresh tokens signed with undefined secret — security vulnerability"
  },
  {
    "location": "auth.service.ts:30-42",
    "trigger_condition": "Race condition: two concurrent first-logins for same OAuth user",
    "guard_snippet": "Wrap create in try/catch for P2002, retry findByProvider on unique conflict",
    "potential_consequence": "500 error for second concurrent OAuth login attempt"
  },
  {
    "location": "auth.service.ts:44-48",
    "trigger_condition": "user.email or user.displayName is null/undefined",
    "guard_snippet": "if (!user.email) throw new Error('User missing required email field');",
    "potential_consequence": "JWT payload contains null email — downstream failures"
  },
  {
    "location": "google.strategy.ts:16-20",
    "trigger_condition": "GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL is undefined",
    "guard_snippet": "Use configService.getOrThrow() instead of get()!",
    "potential_consequence": "Strategy initializes with undefined — cryptic runtime error on first login"
  },
  {
    "location": "github.strategy.ts:11-14",
    "trigger_condition": "GITHUB_CLIENT_ID/SECRET/CALLBACK_URL is undefined",
    "guard_snippet": "Use configService.getOrThrow() instead of get()!",
    "potential_consequence": "Same — silent misconfiguration, cryptic error at runtime"
  },
  {
    "location": "github.strategy.ts:21-29",
    "trigger_condition": "GitHub user has private/no email (emails array empty)",
    "guard_snippet": "if (!profile.emails?.length) throw new UnauthorizedException('Email required');",
    "potential_consequence": "User created with empty string email — breaks email-based operations"
  },
  {
    "location": "google.strategy.ts:21-28",
    "trigger_condition": "Google profile returns empty emails array",
    "guard_snippet": "Validate email is non-empty before passing to done()",
    "potential_consequence": "User persisted with empty string email"
  },
  {
    "location": "github.strategy.ts:26",
    "trigger_condition": "Both displayName and username are empty/undefined",
    "guard_snippet": "displayName: profile.displayName || profile.username || profile.id || 'Unknown'",
    "potential_consequence": "User created with empty displayName — blank name in UI"
  },
  {
    "location": "jwt.strategy.ts:16-18",
    "trigger_condition": "JWT_SECRET undefined at strategy construction",
    "guard_snippet": "secretOrKey: configService.getOrThrow<string>('JWT_SECRET')",
    "potential_consequence": "Strategy may accept any token — security vulnerability"
  },
  {
    "location": "jwt-refresh.strategy.ts:14-17",
    "trigger_condition": "JWT_REFRESH_SECRET undefined at strategy construction",
    "guard_snippet": "secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET')",
    "potential_consequence": "Refresh strategy compromised"
  },
  {
    "location": "users.service.ts:25-29",
    "trigger_condition": "updateLastLogin with non-existent user ID",
    "guard_snippet": "Catch Prisma P2025 RecordNotFound in updateLastLogin",
    "potential_consequence": "500 during callback if user deleted between find and update"
  },
  {
    "location": "users.service.ts:3",
    "trigger_condition": "Fragile relative import path '../../../../generated/prisma'",
    "guard_snippet": "Configure tsconfig path alias '@ultimatype/generated/prisma'",
    "potential_consequence": "Import breaks silently if directory structure changes"
  },
  {
    "location": "prisma.service.ts:5-12",
    "trigger_condition": "DATABASE_URL is missing or malformed",
    "guard_snippet": "Catch $connect() error in onModuleInit with descriptive log",
    "potential_consequence": "App crash on startup with cryptic Prisma connection error"
  },
  {
    "location": "schema.prisma:23",
    "trigger_condition": "datasource db block has no url property",
    "guard_snippet": "url = env(\"DATABASE_URL\")",
    "potential_consequence": "Prisma CLI commands (migrate, generate) fail"
  },
  {
    "location": "schema.prisma:30",
    "trigger_condition": "email has no @unique constraint — same email via two providers",
    "guard_snippet": "Business decision: add @@unique([email]) if one-account-per-email is desired",
    "potential_consequence": "Same person exists as two separate users via different providers"
  }
]
```

## Summary

| Category | Count |
|---|---|
| Missing env-var guards (`getOrThrow`) | 6 |
| Missing null/empty input validation | 5 |
| Security exposure (tokens in URL) | 1 |
| Race condition | 1 |
| Error handling gaps | 4 |
| Schema / config concerns | 3 |
| Code duplication risk | 1 |
| **Total findings** | **22** |
