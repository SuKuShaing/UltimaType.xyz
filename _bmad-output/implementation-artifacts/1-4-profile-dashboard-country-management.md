# Story 1.4: Profile Dashboard & Country Management

Status: done

## Story

As an authenticated user,
I want to view my profile statistics and be able to change my associated country,
so that my identity on the leaderboards accurately reflects my preference.

## Acceptance Criteria

1. **Given** an authenticated user **When** they navigate to their Profile section **Then** they can see their avatar, display name, email, and current country displayed with the country's name (not just the code).
2. **Given** an authenticated user viewing their profile **When** they click the country field **Then** a dropdown list appears containing all valid ISO 3166-1 alpha-2 countries with their human-readable names in Spanish.
3. **Given** a user selecting a new country from the dropdown **When** they save the changes **Then** the backend validates the country code and updates `countryCode` in the `users` table immediately.
4. **Given** a user with `countryCode = null` (geo-detection failed or local dev) **When** they view their profile **Then** the country field shows a placeholder indicating no country is set, and they can select one from the dropdown.
5. **Given** a PATCH request to `/api/users/me` with an invalid `countryCode` (not in ISO 3166-1 alpha-2) **When** the server validates it **Then** the server responds with HTTP 400 and a descriptive error message.
6. **Given** a user who saves their country **When** the update succeeds **Then** the profile view reflects the change immediately without a full page reload (React Query invalidation).

## Tasks / Subtasks

- [x] Task 1: Crear lista de países compartida en `libs/shared` (AC: #2, #5)
  - [x] 1.1 Crear `libs/shared/src/constants/countries.ts` con un array exportado `COUNTRIES: { code: string; name: string }[]` (ISO 3166-1 alpha-2, nombres en español)
  - [x] 1.2 Crear función de validación `isValidCountryCode(code: string): boolean`
  - [x] 1.3 Re-exportar desde `libs/shared/src/index.ts`
- [x] Task 2: Agregar `updateCountryCode` a `UsersService` (AC: #3)
  - [x] 2.1 Método `updateCountryCode(userId: string, countryCode: string): Promise<User>` en `users.service.ts`
  - [x] 2.2 Tests en `users.service.spec.ts` para update exitoso
- [x] Task 3: Crear `UsersController` con endpoint `PATCH /users/me` (AC: #3, #5)
  - [x] 3.1 Crear `apps/api/src/modules/users/users.controller.ts`
  - [x] 3.2 Endpoint `PATCH /users/me` protegido con `JwtAuthGuard`, valida `countryCode` contra la lista compartida
  - [x] 3.3 Validación manual de `countryCode` contra `isValidCountryCode` — sin dependencias extra
  - [x] 3.4 Registrar `UsersController` en `UsersModule` + importar `UsersModule` en `AppModule`
  - [x] 3.5 Tests en `users.controller.spec.ts`
- [x] Task 4: Actualizar `UserProfile` en `useAuth` para incluir todos los campos (AC: #1, #4)
  - [x] 4.1 Reemplazar la interfaz local `UserProfile` en `use-auth.ts` por `UserProfile` de `@ultimatype-monorepo/shared` (incluye `avatarUrl`, `countryCode`, `id`, etc.)
- [x] Task 5: Crear componente `ProfilePage` en frontend (AC: #1, #2, #3, #4, #6)
  - [x] 5.1 Crear `apps/web/src/components/profile/profile-page.tsx`
  - [x] 5.2 Mostrar avatar (img con fallback a iniciales), displayName, email, país actual
  - [x] 5.3 Dropdown de países usando la lista de `@ultimatype-monorepo/shared`
  - [x] 5.4 Botón "Guardar" que llama a `PATCH /api/users/me` vía `apiClient`
  - [x] 5.5 Usar `useMutation` de TanStack Query para el update + `invalidateQueries(['auth', 'me'])` al éxito
  - [x] 5.6 Estado de carga con cursor `_`, éxito con mensaje verde, error con mensaje rojo
- [x] Task 6: Agregar ruta `/profile` y navegación (AC: #1)
  - [x] 6.1 Agregar `<Route path="/profile" element={<ProfilePage />} />` en `app.tsx`
  - [x] 6.2 Agregar botón/link "Mi Perfil" naranja visible en la landing cuando el usuario está autenticado
- [x] Task 7: Tests (AC: todos)
  - [x] 7.1 `users.controller.spec.ts`: test de PATCH exitoso, PATCH con código inválido (400), PATCH con código minúsculas (normalización), código vacío (400), código 3 letras (400)
  - [x] 7.2 `users.service.spec.ts`: test de `updateCountryCode` con código válido, test con diferente código
  - [x] 7.3 Tests unitarios de la lista de países: 11 tests — COUNTRIES array válido, isValidCountryCode true/false para varios casos

### Review Findings

- [x] [Review][Decision] ~~Lista de países incompleta vs AC #2~~ — **RESUELTO**: `countries.ts` completado con los 249 códigos ISO 3166-1 alpha-2 oficiales. [countries.ts]
- [x] [Review][Patch] ~~`navigate('/')` imperativo durante render~~ — **RESUELTO**: reemplazado con `useEffect` + guard consolidado. [profile-page.tsx]
- [x] [Review][Patch] ~~`setTimeout` sin cleanup en `onSuccess`~~ — **RESUELTO**: `useRef` + cleanup effect al desmontar. [profile-page.tsx]
- [x] [Review][Patch] ~~Mensaje de error expone `"undefined"` cuando falta `countryCode`~~ — **RESUELTO**: guard `typeof !== 'string'` antes de validación ISO. [users.controller.ts]
- [x] [Review][Patch] ~~`displayInitials` falla con `displayName` vacío~~ — **RESUELTO**: `filter(Boolean)` + fallback `'?'` si displayName es vacío. [profile-page.tsx]
- [x] [Review][Patch] ~~`countryCode` no-string en runtime → TypeError~~ — **RESUELTO**: cubierto por el mismo guard typeof en P3. [users.controller.ts]
- [x] [Review][Defer] ~~Ruta `/profile` sin guard a nivel de ruta~~ — **RESUELTO**: creado `protected-route.tsx` + ruta envuelta con `<ProtectedRoute>` en `app.tsx`. [app.tsx / protected-route.tsx]
- [x] [Review][Defer] `updateCountryCode` sin manejo de Prisma P2025 [users.service.ts:54] — deferred: patrón consistente con el resto del servicio. Tratar en capa de error global post-MVP.
- [x] [Review][Defer] Estado visual stale de `effectiveCountry` cuando refetch falla [profile-page.tsx] — deferred: requiere Background Sync API (Service Worker) para encolar la mutación offline. Post-MVP junto con capacidades PWA.

## Dev Notes

### Contexto de la story anterior (1-3)

La story 1-3 implementó la geo-detección automática de país en el primer login. El campo `countryCode` ya existe en el schema de Prisma y se puebla automáticamente vía `geoip-lite`. Esta story completa el circuito permitiendo al usuario **ver** y **modificar manualmente** su país.

**Hallazgos relevantes de story 1-3:**
- `geoip-lite` retorna `null` para IPs de loopback (dev local) — muchos usuarios de desarrollo tendrán `countryCode = null`
- `GeoService` ya normaliza IPv6-mapped IPv4
- Patrón de tests: Vitest con `vi.fn()`, instanciar servicios manualmente (NO `TestingModule`)
- `auth.service.spec.ts` necesitó `getOrThrow` en mock de ConfigService (fix pre-existente)

### No existe `UsersController` — CREAR UNO NUEVO

Actualmente `UsersModule` solo tiene `UsersService` (sin controller). El endpoint `GET /auth/me` vive en `AuthController` y retorna el perfil completo del usuario desde `UsersService.findById()`.

Para esta story, crear `UsersController` que maneje operaciones de perfil del usuario autenticado.

### Endpoint: `PATCH /api/users/me`

```typescript
// apps/api/src/modules/users/users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.usersService.updateCountryCode(req.user.userId, body.countryCode);
  }
}
```

**Nota sobre `JwtAuthGuard`:** La clase está en `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`. La `JwtStrategy` está registrada en `AuthModule` (importado en `AppModule`), así que el guard funciona en cualquier controller del app. Importar directamente:
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
```

### Validación de `countryCode`

Validar contra una lista estática de códigos ISO 3166-1 alpha-2 en `libs/shared`. NO usar librerías externas — la lista es estática y conocida (< 250 entries).

```typescript
// libs/shared/src/constants/countries.ts
export const COUNTRIES = [
  { code: 'AF', name: 'Afganistán' },
  { code: 'AL', name: 'Albania' },
  // ... lista completa ISO 3166-1 alpha-2
  { code: 'ZW', name: 'Zimbabue' },
] as const;

export const COUNTRY_CODES = new Set(COUNTRIES.map(c => c.code));

export function isValidCountryCode(code: string): boolean {
  return COUNTRY_CODES.has(code.toUpperCase());
}
```

### `UserProfile` local en `useAuth` está incompleta — CORREGIR

El hook `useAuth` (en `apps/web/src/hooks/use-auth.ts`) define una interfaz local limitada:
```typescript
interface UserProfile {
  userId: string;       // ⚠️ El backend retorna `id`, no `userId`
  email: string;
  displayName: string;
}
```

Problemas:
1. Usa `userId` pero el backend retorna `id` (campo del modelo Prisma)
2. Falta `avatarUrl`, `countryCode`, `provider`

**Solución:** Reemplazar por `UserProfileResponse` de `@ultimatype-monorepo/shared`, o por lo menos expandir la interfaz local para incluir los campos necesarios. Verificar que el campo `id` vs `userId` sea consistente — el endpoint `GET /auth/me` retorna el objeto User de Prisma directamente (campo `id`).

### Implementación de `UsersService.updateCountryCode`

```typescript
async updateCountryCode(userId: string, countryCode: string) {
  return this.prisma.user.update({
    where: { id: userId },
    data: { countryCode },
  });
}
```

### Frontend: Componente `ProfilePage`

**Diseño visual (UX spec compliance):**
- Usar inline styles (el proyecto aún NO tiene Tailwind CSS configurado)
- Seguir la paleta Dark Mode: fondo `#0F1F29`, surface `#1A2630`/`#25343F`, texto `#F8F9FA`, muted `#8B949E`
- Acento naranja `#FF9B51` para botón primario "Guardar"
- **No-Line Rule**: sin bordes en contenedores. Usar diferencias de fondo para crear separación
- **No spinners**: usar cursor `_` parpadeante o cambio de opacidad para estados de carga
- Tipografía: Space Grotesk (ya configurada como font-family global)
- Inputs: fondo `bg-surface-sunken` (`#1A2630`), sin border, padding generoso
- Avatar: mostrar imagen del provider OAuth, con fallback a iniciales del displayName

**Estructura del componente:**
```
ProfilePage
├── Avatar (img con fallback)
├── DisplayName (solo lectura)
├── Email (solo lectura)
├── Country Selector (dropdown editable)
│   └── Lista de COUNTRIES desde @ultimatype-monorepo/shared
├── Botón "Guardar cambios" (solo habilitado si hubo cambios)
└── Feedback de estado (éxito/error)
```

**TanStack Query para la mutación:**
```typescript
const updateProfile = useMutation({
  mutationFn: (countryCode: string) =>
    apiClient('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ countryCode }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  },
});
```

### Ruta en `app.tsx`

Agregar ruta protegida `/profile`:
```tsx
<Route path="/profile" element={<ProfilePage />} />
```

Agregar un link "Mi Perfil" en la vista autenticada de la landing para navegar a `/profile`. Usar `react-router-dom` Link.

### Convenciones de archivos (anti-regresión)

- Todos los archivos en `kebab-case.ts` — regla absoluta
- Frontend: componentes en `apps/web/src/components/profile/profile-page.tsx`
- Backend: controller en `apps/api/src/modules/users/users.controller.ts`
- Shared: constantes en `libs/shared/src/constants/countries.ts`

### Patrón de tests con Vitest (de stories anteriores)

**USAR `vi.fn()` no `jest.fn()`.** Instanciar servicios manualmente, no via `TestingModule`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UsersController', () => {
  it('actualiza countryCode con código válido', async () => {
    const usersService = {
      updateCountryCode: vi.fn().mockResolvedValue({ id: '1', countryCode: 'CL' }),
    };
    const controller = new UsersController(usersService as any);
    const req = { user: { userId: '1' } };
    const result = await controller.updateProfile(req, { countryCode: 'CL' });
    expect(usersService.updateCountryCode).toHaveBeenCalledWith('1', 'CL');
    expect(result.countryCode).toBe('CL');
  });
});
```

### Project Structure Notes

Archivos a crear/modificar (kebab-case estricto):

```text
libs/shared/src/
├── constants/
│   └── countries.ts                   ← NUEVO
├── index.ts                           ← MODIFICAR (re-exportar countries)

apps/api/src/
└── modules/
    └── users/
        ├── users.controller.ts        ← NUEVO
        ├── users.controller.spec.ts   ← NUEVO
        ├── users.module.ts            ← MODIFICAR (registrar controller)
        ├── users.service.ts           ← MODIFICAR (agregar updateCountryCode)
        └── users.service.spec.ts      ← MODIFICAR (test updateCountryCode)

apps/web/src/
├── components/
│   └── profile/
│       └── profile-page.tsx           ← NUEVO
├── hooks/
│   └── use-auth.ts                    ← MODIFICAR (expandir UserProfile)
└── app/
    └── app.tsx                        ← MODIFICAR (agregar ruta /profile + link)
```

**Archivos que NO deben modificarse en esta story:**
- `prisma/schema.prisma` — NO tocar (countryCode ya existe)
- `auth.controller.ts` — NO tocar (GET /auth/me se mantiene como está)
- `auth.service.ts` — NO tocar
- `google.strategy.ts` / `github.strategy.ts` — NO tocar
- `geo.service.ts` / `geo.module.ts` — NO tocar

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — User story y acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#FR3] — "Un usuario autenticado puede ver y configurar su perfil (avatar, nombre, país asociado, estadísticas)"
- [Source: _bmad-output/planning-artifacts/epics.md#FR34] — "El usuario puede modificar manualmente su país asociado desde la configuración de su perfil"
- [Source: ultimatype-monorepo/prisma/schema.prisma#User] — `countryCode String? @map("country_code")` ya definido
- [Source: ultimatype-monorepo/apps/api/src/modules/users/users.service.ts] — `UsersService` sin `updateCountryCode` aún
- [Source: ultimatype-monorepo/apps/api/src/modules/users/users.module.ts] — Sin controller registrado
- [Source: ultimatype-monorepo/apps/web/src/hooks/use-auth.ts] — `UserProfile` local incompleta (falta countryCode, avatarUrl)
- [Source: ultimatype-monorepo/apps/web/src/app/app.tsx] — Sin ruta /profile
- [Source: ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts#getProfile] — `GET /auth/me` retorna User completo de Prisma
- [Source: ultimatype-monorepo/libs/shared/src/dto/auth.dto.ts] — `UserProfileResponse` con countryCode
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — kebab-case archivos, camelCase código, PascalCase tipos
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions] — Endpoints REST pluralizados
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — Dark Mode paleta, No-Line Rule, loading states
- [Source: _bmad-output/implementation-artifacts/1-3-auto-detect-user-country-on-first-login.md] — countryCode ya poblado por geoip-lite, Vitest patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `libs/shared` no tenía `build` target en Nx → `enforceBuildableLibDependency: true` bloqueaba el import en `apps/web` (que tiene projectType `library`). Fix: agregar `project.json` con `executor: nx:noop` para hacer shared "buildable" sin compilar.
- `app.spec.tsx` era pre-existente pero fallaba con el `QueryClientProvider` faltante; el test también esperaba texto "Welcome @ultimatype-monorepo/web" inexistente. Fix: agregar `QueryClientProvider` wrapper y actualizar assertion a "UltimaType".
- Nx tiene caché agresivo; lint web mostraba error stale. Fix: `--skip-nx-cache`.

### Completion Notes List

- ✅ 11/11 tests de shared: `COUNTRIES` array, `isValidCountryCode` con mayúsculas/minúsculas/inválidos
- ✅ 29/29 tests de API: +2 tests updateCountryCode en UsersService, +5 tests en UsersController (PATCH success, normalización, 3 casos BadRequest)
- ✅ 2/2 tests de web: renderizado + heading
- ✅ `PATCH /api/users/me` con JwtAuthGuard, validación contra lista shared, normalización a mayúsculas
- ✅ `ProfilePage` con avatar + fallback iniciales, dropdown 180+ países, botón guardar solo activo si hay cambio, feedback sin spinners
- ✅ `useAuth` hook actualizado a `UserProfile` de shared (incluye `countryCode`, `avatarUrl`, `id`)
- ✅ Ruta `/profile` y botón "Mi Perfil" naranja en landing
- ✅ Lint web: 0 errores. Lint API: 1 error pre-existente en `prisma.service.ts` (documentado desde story 1-3)

### File List

#### Nuevos
- ultimatype-monorepo/libs/shared/src/constants/countries.ts
- ultimatype-monorepo/libs/shared/src/constants/countries.spec.ts
- ultimatype-monorepo/libs/shared/vitest.config.ts
- ultimatype-monorepo/libs/shared/project.json
- ultimatype-monorepo/apps/api/src/modules/users/users.controller.ts
- ultimatype-monorepo/apps/api/src/modules/users/users.controller.spec.ts
- ultimatype-monorepo/apps/web/src/components/profile/profile-page.tsx

#### Modificados
- ultimatype-monorepo/libs/shared/src/index.ts (re-export countries)
- ultimatype-monorepo/apps/api/src/modules/users/users.service.ts (updateCountryCode)
- ultimatype-monorepo/apps/api/src/modules/users/users.service.spec.ts (+2 tests updateCountryCode)
- ultimatype-monorepo/apps/api/src/modules/users/users.module.ts (registrar UsersController)
- ultimatype-monorepo/apps/api/src/app/app.module.ts (importar UsersModule)
- ultimatype-monorepo/apps/web/src/hooks/use-auth.ts (UserProfile desde shared)
- ultimatype-monorepo/apps/web/src/app/app.tsx (ruta /profile + Link "Mi Perfil")
- ultimatype-monorepo/apps/web/src/app/app.spec.tsx (QueryClientProvider + fix assertion)
