# Story 1.3: Auto-detect User Country on First Login

Status: done

## Story

As a newly registered user,
I want the system to automatically detect my country of origin,
so that I don't have to manually configure my location for the global leaderboards.

## Acceptance Criteria

1. **Given** a user logging in for the very first time **When** their profile is created in the database **Then** the backend resolves their country code from their IP address and saves it to `countryCode` in the `users` table.
2. **Given** a returning user (profile already exists) **When** they log in again **Then** no geo-detection is performed — `countryCode` is NOT overwritten.
3. **Given** a loopback IP (127.0.0.1, ::1 — local development) **When** geo-detection is attempted **Then** the user is created with `countryCode = null` and no exception is thrown (graceful degradation).
4. **Given** an IP that cannot be resolved by the geo library **When** geo-detection fails **Then** the user is created with `countryCode = null` and no exception is thrown.

## Tasks / Subtasks

- [x] Task 1: Instalar `geoip-lite` (AC: #1)
  - [x] 1.1 `npm install geoip-lite` y `npm install -D @types/geoip-lite`
- [x] Task 2: Crear `GeoModule` y `GeoService` (AC: #1, #3, #4)
  - [x] 2.1 Crear `apps/api/src/modules/geo/geo.service.ts` con método `getCountryCode(ip: string): string | null`
  - [x] 2.2 Crear `apps/api/src/modules/geo/geo.module.ts` exportando `GeoService`
- [x] Task 3: Modificar `UsersService` para aceptar `countryCode` (AC: #1, #2)
  - [x] 3.1 Agregar campo `countryCode?: string | null` a la interfaz `CreateUserInput` en `users.service.ts`
  - [x] 3.2 Pasar `countryCode: input.countryCode ?? null` en `prisma.user.create({ data: { ... } })`
- [x] Task 4: Modificar `AuthService` para inyectar geo-detección (AC: #1, #2)
  - [x] 4.1 Agregar `ip?: string` como segundo parámetro a `validateOAuthUser(oauthUser, ip?)`
  - [x] 4.2 Inyectar `GeoService` en el constructor de `AuthService`
  - [x] 4.3 En el bloque de nuevo usuario (`usersService.create(...)`), llamar `geoService.getCountryCode(ip)` si `ip` está presente y pasar el resultado como `countryCode`
  - [x] 4.4 El bloque de usuario existente (`updateLastLogin`) NO debe tocar `countryCode`
- [x] Task 5: Modificar `AuthController` para extraer IP y pasarla (AC: #1)
  - [x] 5.1 En `handleOAuthCallback(req, res)`, extraer IP del request antes de llamar a `validateOAuthUser`
  - [x] 5.2 Llamar `this.authService.validateOAuthUser(req.user, clientIp)`
- [x] Task 6: Importar `GeoModule` en `AuthModule` (AC: #1)
  - [x] 6.1 Agregar `GeoModule` al array `imports` de `auth.module.ts`
- [x] Task 7: Tests (AC: todos)
  - [x] 7.1 `geo.service.spec.ts`: test de IP válida retorna código país, IP loopback retorna null, IP inválida retorna null
  - [x] 7.2 Actualizar `auth.service.spec.ts`: verificar que `geoService.getCountryCode` es llamado solo para usuarios nuevos, no para existentes
  - [x] 7.3 Actualizar `users.service.spec.ts`: test de `create()` con `countryCode` presente y ausente

### Review Findings

- [x] [Review][Decision→Patch] trust proxy + simplificar extracción IP — `app.set('trust proxy', 1)` agregado en `main.ts`; controller simplificado a `req.ip` [main.ts, auth.controller.ts:82]
- [x] [Review][Patch] Strip IPv6-mapped IPv4 (::ffff:x.x.x.x) en GeoService antes de lookup [geo.service.ts:8]
- [x] [Review][Patch] Tests para extracción de IP en auth.controller [auth.controller.spec.ts — nuevo]
- [x] [Review][Defer] P2002 race condition: loser pierde countryCode del winner — MVP aceptable, baja frecuencia
- [x] [Review][Defer] geoip-lite DB estática sin mecanismo de actualización — trade-off de diseño aceptado
- [x] [Review][Defer] req:any / res:any en controller — pre-existente desde story 1-2
- [x] [Review][Defer] @types/geoip-lite v1.4.x con runtime v2.0.x — API backward-compatible, sin impacto real

## Dev Notes

### Decisión de librería: `geoip-lite`

Usar `geoip-lite` (npm) en lugar de una API HTTP externa. Razones:
- Funciona offline — sin dependencia de red en tests ni en desarrollo local
- Sin rate limits ni API keys
- Base de datos incluida en el paquete (~25MB), auto-descargada al instalar
- Retorna `null` para IPs inválidas/desconocidas — fácil de manejar
- `lookup(ip)` retorna `{ country: 'US', ... }` o `null`
- Código de país: ISO 3166-1 alpha-2 (2 letras, p. ej. `"CL"`, `"US"`, `"ES"`)

```bash
npm install geoip-lite
npm install -D @types/geoip-lite
```

### `countryCode` ya existe en Prisma Schema — NO migrar

**CRÍTICO:** El campo `countryCode String? @map("country_code")` **ya está definido** en `ultimatype-monorepo/prisma/schema.prisma` desde la story 1-2. NO crear una nueva migración para este campo. Solo hay que **poblarlo** en el flujo de creación de usuario.

### Extracción de IP en el controller

El IP debe extraerse en `handleOAuthCallback` (en `auth.controller.ts`), no en las Passport strategies. **NO modificar** `google.strategy.ts` ni `github.strategy.ts`.

```typescript
// Patrón de extracción (en auth.controller.ts -> handleOAuthCallback):
const forwarded = req.headers['x-forwarded-for'];
const clientIp: string | undefined =
  (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ??
  req.socket?.remoteAddress ??
  req.ip;
```

- En producción (detrás de Traefik/Nginx): usará `X-Forwarded-For`
- En desarrollo local: será `::1` o `127.0.0.1` → `geoip-lite` retorna `null` → `countryCode = null` (correcto)

### Implementación de `GeoService`

```typescript
// apps/api/src/modules/geo/geo.service.ts
import { Injectable } from '@nestjs/common';
import * as geoip from 'geoip-lite';

@Injectable()
export class GeoService {
  getCountryCode(ip: string): string | null {
    try {
      const geo = geoip.lookup(ip);
      return geo?.country ?? null;
    } catch {
      return null;
    }
  }
}
```

### Flujo completo de `validateOAuthUser` modificado

```
Controller → validateOAuthUser(req.user, clientIp)
  └─ existingUser? → updateLastLogin() [SIN geo]
  └─ nuevo usuario → geoService.getCountryCode(ip) → usersService.create({ ...oauthUser, countryCode })
```

### Modificación de `CreateUserInput` en `UsersService`

```typescript
export interface CreateUserInput {
  provider: 'GOOGLE' | 'GITHUB';
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode?: string | null; // ← agregar esto
}
```

Y en `prisma.user.create`:
```typescript
data: {
  // ...campos anteriores...
  countryCode: input.countryCode ?? null,
}
```

### Convenciones de archivos (anti-regresión)

- Todos los archivos en `kebab-case.ts` — regla absoluta del proyecto
- Nuevo módulo: `apps/api/src/modules/geo/` (sigue el patrón de dominios verticales)
- `GeoModule` exporta `GeoService` para que `AuthModule` pueda importarlo

### Patrón de tests con Vitest (de story 1-2)

**USAR `vi.fn()` no `jest.fn()`.** Instanciar servicios manualmente, no via `TestingModule`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as geoip from 'geoip-lite';

vi.mock('geoip-lite');

describe('GeoService', () => {
  it('retorna código de país para IP válida', () => {
    vi.mocked(geoip.lookup).mockReturnValue({ country: 'CL', ... } as any);
    const service = new GeoService();
    expect(service.getCountryCode('200.1.2.3')).toBe('CL');
  });

  it('retorna null para IP loopback', () => {
    vi.mocked(geoip.lookup).mockReturnValue(null);
    const service = new GeoService();
    expect(service.getCountryCode('127.0.0.1')).toBeNull();
  });
});
```

Para tests de `AuthService` que involucren `GeoService`, mockear con:
```typescript
const geoService = { getCountryCode: vi.fn().mockReturnValue('CL') };
```

### Project Structure Notes

Archivos a crear/modificar (kebab-case estricto):

```text
apps/api/src/
└── modules/
    ├── geo/                              ← NUEVO directorio
    │   ├── geo.module.ts                 ← NUEVO
    │   ├── geo.service.ts                ← NUEVO
    │   └── geo.service.spec.ts           ← NUEVO
    ├── auth/
    │   ├── auth.module.ts                ← MODIFICAR (import GeoModule)
    │   ├── auth.service.ts               ← MODIFICAR (inject GeoService, add ip param)
    │   ├── auth.controller.ts            ← MODIFICAR (extraer IP, pasar a validateOAuthUser)
    │   └── auth.service.spec.ts          ← MODIFICAR (mock GeoService)
    └── users/
        ├── users.service.ts              ← MODIFICAR (countryCode en CreateUserInput + create)
        └── users.service.spec.ts         ← MODIFICAR (test con countryCode)
```

**Archivos que NO deben modificarse en esta story:**
- `google.strategy.ts` — NO tocar
- `github.strategy.ts` — NO tocar
- `prisma/schema.prisma` — NO tocar (countryCode ya existe)
- Frontend — ningún cambio requerido en esta story

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — User story y acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#FR33] — "El sistema detecta y guarda el país del usuario mediante una Geo API en el primer inicio de sesión"
- [Source: ultimatype-monorepo/prisma/schema.prisma#User] — `countryCode String? @map("country_code")` ya definido
- [Source: ultimatype-monorepo/apps/api/src/modules/auth/auth.service.ts#validateOAuthUser] — Punto de inyección de geo-detección
- [Source: ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts#handleOAuthCallback] — Punto de extracción de IP
- [Source: _bmad-output/implementation-artifacts/1-2-oauth-2-0-integration-google-github.md#Completion Notes] — Vitest patterns, convenciones kebab-case
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure] — Traefik/Nginx proxy → usar X-Forwarded-For

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `geoip-lite` usa default export — importar con `import geoip from 'geoip-lite'` (no destructuring)
- Mock de `geoip-lite` en Vitest: `vi.mock('geoip-lite', () => ({ default: { lookup: vi.fn() } }))`
- `mockConfigService` en `auth.service.spec.ts` carecía de `getOrThrow` — se agregó para cubrir los tests pre-existentes de `generateTokens` y `refreshTokens` que fallaban (issue pre-existente de story 1-2)
- Lint error `@nx/enforce-module-boundaries` en `prisma.service.ts` es pre-existente (no introducido por esta story)

### Completion Notes List

- ✅ 18/18 tests pasando (5 GeoService + 7 AuthService + 6 UsersService), cero regresiones
- ✅ `GeoService.getCountryCode()` usando `geoip-lite` — offline, sin API key, ISO 3166-1 alpha-2
- ✅ Geo-detección solo para usuarios nuevos — `existingUser` path no llama a `GeoService`
- ✅ Graceful degradation: loopback IP, IP inválida, excepción → `countryCode = null`, sin crash
- ✅ IP extraída en `auth.controller.ts` via `X-Forwarded-For` → `socket.remoteAddress` → `req.ip`
- ✅ `countryCode` field ya existía en Prisma schema — sin migración necesaria
- ✅ Google/GitHub strategies NO modificadas
- ✅ `auth.service.spec.ts`: corregido `getOrThrow` en mock (fix pre-existente que mejora cobertura)

### Change Log

- 2026-03-26: Story 1.3 implementada — geo-detección automática de país en primer login
- 2026-03-26: Review patches aplicados — trust proxy, IPv6-mapped IPv4, tests controller

### File List

#### Nuevos
- ultimatype-monorepo/apps/api/src/modules/geo/geo.service.ts
- ultimatype-monorepo/apps/api/src/modules/geo/geo.module.ts
- ultimatype-monorepo/apps/api/src/modules/geo/geo.service.spec.ts

#### Modificados
- ultimatype-monorepo/apps/api/src/main.ts (trust proxy config)
- ultimatype-monorepo/apps/api/src/modules/auth/auth.service.ts (inject GeoService, ip param en validateOAuthUser)
- ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts (clientIp = req.ip)
- ultimatype-monorepo/apps/api/src/modules/auth/auth.module.ts (import GeoModule)
- ultimatype-monorepo/apps/api/src/modules/auth/auth.service.spec.ts (mock GeoService, 4 tests nuevos, fix getOrThrow)
- ultimatype-monorepo/apps/api/src/modules/geo/geo.service.ts (normalizar IPv6-mapped IPv4)
- ultimatype-monorepo/apps/api/src/modules/geo/geo.service.spec.ts (test IPv6-mapped)
- ultimatype-monorepo/apps/api/src/modules/users/users.service.ts (countryCode en CreateUserInput + create)
- ultimatype-monorepo/apps/api/src/modules/users/users.service.spec.ts (2 tests de create actualizados)
- ultimatype-monorepo/package.json (geoip-lite dependency)
- ultimatype-monorepo/package-lock.json

#### Nuevos (review patches)
- ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.spec.ts
