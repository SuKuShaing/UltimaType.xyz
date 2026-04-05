# Story 4.6: Public User Profiles

Status: review

## Story

As a player,
I want to view other players' public profiles and share my own profile via a clean URL,
so that I can explore opponents' stats and history, and share my achievements on social media.

## Acceptance Criteria

### AC1: Campo slug y auto-generación

**Given** un nuevo usuario que se registra via OAuth
**When** se crea su cuenta por primera vez
**Then** se genera automáticamente un slug único con formato `{iniciales}-{3 hex random}` (ej: `ss-a3f`), todo en minúsculas
**And** el slug se persiste en el campo `slug` del modelo User (unique, not null)
**And** si el slug generado colisiona con uno existente, se regeneran los 3 caracteres hex hasta encontrar uno disponible

### AC2: Edición de slug con validación de disponibilidad

**Given** un usuario autenticado en su página de perfil (`/profile`)
**When** edita su slug en el campo correspondiente
**Then** se muestra un indicador en tiempo real (verde/rojo) de disponibilidad consultando `GET /api/users/check-slug/:slug`
**And** el slug se valida: solo letras minúsculas, números y guiones; entre 3 y 30 caracteres; no puede empezar ni terminar con guión
**And** al guardar, el slug se actualiza via `PATCH /api/users/me` con el campo `slug`
**And** si el slug no está disponible o es inválido, se muestra error y no se guarda

### AC3: Endpoint de disponibilidad de slug

**Given** cualquier usuario (autenticado o no)
**When** se consulta `GET /api/users/check-slug/:slug`
**Then** retorna `{ available: boolean }` indicando si el slug está libre
**And** la comparación es case-insensitive (se normaliza a lowercase antes de buscar)

### AC4: Endpoints públicos de perfil

**Given** un slug válido de un usuario existente
**When** se consulta `GET /api/users/by-slug/:slug`
**Then** retorna `{ id, displayName, avatarUrl, countryCode, slug, createdAt }` (sin email, sin provider, sin providerId)

**Given** un userId válido
**When** se consulta `GET /api/users/:id/matches` con parámetros opcionales `level`, `period`, `page`, `limit`
**Then** retorna la lista paginada de partidas del usuario (misma estructura que `GET /api/matches` pero para cualquier usuario)

**Given** un userId válido
**When** se consulta `GET /api/users/:id/stats` con parámetros opcionales `level`, `period`
**Then** retorna `{ avgScore, bestScore, totalMatches }` del usuario consultado

**And** estos 3 endpoints NO requieren autenticación (son públicos)
**And** si el slug o userId no existe, retorna 404

### AC5: Página de perfil público `/u/:slug`

**Given** un visitante (autenticado o no) que navega a `/u/:slug`
**When** la página carga
**Then** se muestra el perfil público del usuario: avatar (o iniciales), displayName, bandera de país, fecha de registro ("Jugador desde [mes] [año]")
**And** debajo se muestran stats: Mejor Puntaje, Puntaje Promedio, Total Partidas
**And** debajo se muestra la sección de historial con filtros de nivel y período (reutilizando la lógica de MatchHistorySection)
**And** cada partida del historial es clickeable y navega a `/match/:matchCode`
**And** la página es pública (no requiere login) y tiene su propia ruta fuera de ProtectedRoute

### AC6: CTA para visitantes no autenticados

**Given** un visitante no autenticado viendo un perfil público
**When** la página renderiza
**Then** se muestra un botón CTA prominente "Comienza a competir" que redirige al flujo de login OAuth
**And** el texto es en español internacional (no regionalismos)
**And** si el visitante ya está autenticado, el CTA no se muestra

### AC7: Nombres clickeables en match detail y leaderboard

**Given** la vista de detalle de partida (`/match/:matchCode`)
**When** se muestran los participantes
**Then** el displayName y avatar de cada participante son links clickeables que navegan a `/u/:slug`

**Given** la tabla del leaderboard (`/leaderboard`)
**When** se muestran los jugadores
**Then** el displayName y avatar de cada jugador son links clickeables que navegan a `/u/:slug`

**And** el endpoint `GET /matches/:matchCode` ahora incluye `slug` en cada participante
**And** el endpoint del leaderboard ahora incluye `slug` en cada jugador

### AC8: Match detail accesible sin autenticación

**Given** un visitante no autenticado
**When** navega a `/match/:matchCode` (por ejemplo desde un perfil público)
**Then** puede ver el detalle de la partida con todos los participantes
**And** la ruta `/match/:matchCode` deja de estar dentro de ProtectedRoute

### AC9: Proxy ligero para OG meta tags (SEO y previews sociales)

**Given** un bot de red social o buscador (WhatsApp, Twitter, Facebook, Google, LinkedIn)
**When** hace request a `/u/:slug`
**Then** NestJS detecta el user-agent como bot y sirve un HTML mínimo con meta tags dinámicas:
  - `<title>{displayName} — UltimaType</title>`
  - `<meta name="description" content="Mejor puntaje: {bestScore} pts | Nivel {maxLevel} | {country}">`
  - `<meta property="og:title" content="{displayName} — UltimaType">`
  - `<meta property="og:description" content="...">`
  - `<meta property="og:image" content="{avatarUrl}">`
  - `<meta property="og:url" content="https://ultimatype.com/u/{slug}">`

**Given** un browser normal (no bot)
**When** hace request a `/u/:slug`
**Then** NestJS sirve el `index.html` de la SPA normalmente (sin overhead de query a DB)

---

## Tasks / Subtasks

- [x] Task 1: Migración Prisma — campo slug (AC: #1)
  - [x] Agregar campo `slug String? @unique @map("slug")` al modelo User (nullable inicialmente para migración)
  - [x] Crear migración: `npx prisma migrate dev --name add-user-slug`
  - [x] Script de backfill: generar slugs para usuarios existentes (iniciales + 3 hex random)
  - [x] Cambiar campo a `slug String @unique` (not null) después del backfill
  - [x] Regenerar Prisma client

- [x] Task 2: Utilidad de generación de slug (AC: #1)
  - [x] Crear helper `generateSlug(displayName: string): string` en UsersService o utils
  - [x] Formato: `{iniciales lowercase}-{3 chars hex random}` (ej: "Sebastián Sanhueza" → `ss-a3f`)
  - [x] Si displayName tiene una sola palabra, usar las dos primeras letras
  - [x] Normalizar caracteres acentuados (é→e, á→a, ñ→n)
  - [x] Método `generateUniqueSlug(displayName)` que reintenta si hay colisión (max 10 intentos)

- [x] Task 3: Backend — auto-generación al crear usuario (AC: #1)
  - [x] Modificar `UsersService.create()` para llamar `generateUniqueSlug(displayName)` y asignar al campo slug
  - [x] Tests: crear usuario genera slug con formato correcto, colisiones se resuelven

- [x] Task 4: Backend — endpoint check-slug (AC: #3)
  - [x] Agregar `@Get('check-slug/:slug')` en UsersController (SIN guard, público)
  - [x] Normalizar slug a lowercase antes de buscar
  - [x] Retornar `{ available: boolean }`
  - [x] Tests: slug libre → true, slug tomado → true, normalización case

- [x] Task 5: Backend — endpoint perfil público by-slug (AC: #4)
  - [x] Agregar `@Get('by-slug/:slug')` en UsersController (SIN guard, público)
  - [x] Query: `prisma.user.findUnique({ where: { slug } })` con select explícito (sin email, provider, providerId)
  - [x] Retornar `{ id, displayName, avatarUrl, countryCode, slug, createdAt }` o 404
  - [x] Tests: slug válido → perfil sin email, slug inexistente → 404

- [x] Task 6: Backend — endpoints públicos de matches y stats de otro usuario (AC: #4)
  - [x] Agregar `@Get(':id/matches')` en UsersController (SIN guard, público)
  - [x] Agregar `@Get(':id/stats')` en UsersController (SIN guard, público)
  - [x] Reutilizar `MatchResultsService.findByUser()` y `MatchResultsService.getStats()` con el userId del param
  - [x] Validar que userId existe antes de consultar (404 si no)
  - [x] Mismos parámetros opcionales: `level`, `period`, `page`, `limit`
  - [x] Tests: matches de usuario válido, stats de usuario válido, userId inexistente → 404

- [x] Task 7: Backend — edición de slug en PATCH /users/me (AC: #2)
  - [x] Extender `UpdateProfileDto` para aceptar campo opcional `slug`
  - [x] Validar formato: regex `/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/`
  - [x] Verificar disponibilidad antes de guardar (throw ConflictException si tomado)
  - [x] Normalizar a lowercase
  - [x] Actualizar `UsersService.updateProfile()` o crear método específico
  - [x] Tests: slug válido y libre → actualizado, slug tomado → 409, formato inválido → 400

- [x] Task 8: Backend — agregar slug a respuestas de match detail y leaderboard (AC: #7)
  - [x] Extender `findByMatchCode` en MatchResultsService para incluir `user.slug` en el select/include
  - [x] Agregar `slug` al `MatchDetailParticipantDto` en shared
  - [x] Extender endpoint de leaderboard para incluir `slug` en cada jugador
  - [x] Agregar `slug` al DTO de leaderboard en shared
  - [x] Tests: match detail incluye slug por participante, leaderboard incluye slug por jugador

- [x] Task 9: Backend — hacer match detail público (AC: #8)
  - [x] Remover `@UseGuards(JwtAuthGuard)` del endpoint `GET /matches/:matchCode`
  - [x] Tests: request sin token a GET /matches/:matchCode → 200 (no 401)

- [x] Task 10: Backend — proxy middleware OG meta tags (AC: #9)
  - [x] Crear middleware NestJS que intercepte rutas `/u/:slug`
  - [x] Detección de bot por User-Agent: `WhatsApp`, `Twitterbot`, `facebookexternalhit`, `Googlebot`, `LinkedInBot`, `Slackbot`
  - [x] Si es bot: query user + stats, generar HTML con meta tags OG, servir directamente
  - [x] Si no es bot: `next()` para que sirva la SPA
  - [x] Template HTML mínimo con og:title, og:description, og:image, og:url, twitter:card
  - [x] Tests: request con User-Agent bot → HTML con meta tags, request normal → no interceptado

- [x] Task 11: DTOs compartidos (AC: #4, #7, #8)
  - [x] Agregar `PublicUserProfileDto` en shared: `{ id, displayName, avatarUrl, countryCode, slug, createdAt }`
  - [x] Agregar `slug: string` a `MatchDetailParticipantDto`
  - [x] Agregar `slug: string` al DTO del leaderboard
  - [x] Agregar `CheckSlugResponseDto`: `{ available: boolean }`
  - [x] Re-exportar desde `libs/shared/src/index.ts`

- [x] Task 12: Frontend — hook usePublicProfile (AC: #5)
  - [x] Crear `apps/web/src/hooks/use-public-profile.ts`
  - [x] `usePublicProfile(slug)` → query `GET /api/users/by-slug/:slug`
  - [x] No requiere auth token

- [x] Task 13: Frontend — hooks useUserMatches y useUserStats (AC: #5)
  - [x] Crear `apps/web/src/hooks/use-user-matches.ts` → query `GET /api/users/:id/matches`
  - [x] Crear `apps/web/src/hooks/use-user-stats.ts` → query `GET /api/users/:id/stats`
  - [x] Aceptar parámetros de filtro: `level`, `period`, `page`
  - [x] No requieren auth token

- [x] Task 14: Frontend — componente PublicProfilePage (AC: #5, #6)
  - [x] Crear `apps/web/src/components/profile/public-profile-page.tsx`
  - [x] Hero: avatar (o iniciales), displayName, bandera país, "Jugador desde [mes] [año]"
  - [x] Stats: 3 tarjetas (Mejor Puntaje, Puntaje Promedio, Total Partidas)
  - [x] Historial: reutilizar lógica de MatchHistorySection (filtros nivel/período, lista clickeable)
  - [x] CTA "Comienza a competir" visible solo para visitantes no autenticados
  - [x] Loading, error y empty states
  - [x] Español internacional en todos los textos

- [x] Task 15: Frontend — edición de slug en ProfilePage (AC: #2)
  - [x] Agregar campo de slug en la tarjeta de perfil existente
  - [x] Hook `useCheckSlug(slug)` con debounce 400ms → `GET /api/users/check-slug/:slug`
  - [x] Indicador visual: verde "Disponible" / rojo "No disponible" / gris "Verificando..."
  - [x] Validación cliente: regex, longitud 3-30
  - [x] Enviar slug en el `PATCH /users/me` junto con countryCode
  - [x] Mostrar link compartible: `ultimatype.com/u/{slug}` (copiable)

- [x] Task 16: Frontend — nombres clickeables en MatchDetailPage (AC: #7)
  - [x] Modificar `match-detail-page.tsx`: envolver displayName + avatar en `<Link to={/u/${slug}}>`
  - [x] Actualizar tipo del participante para incluir `slug`

- [x] Task 17: Frontend — nombres clickeables en LeaderboardPage (AC: #7)
  - [x] Modificar leaderboard para envolver nombre + avatar en `<Link to={/u/${slug}}>`
  - [x] Actualizar tipo del jugador para incluir `slug`

- [x] Task 18: Frontend — rutas (AC: #5, #8)
  - [x] Agregar ruta `/u/:slug` → `<PublicProfilePage />` (fuera de ProtectedRoute)
  - [x] Mover `/match/:matchCode` fuera de ProtectedRoute (ahora público)
  - [x] En `app.tsx` actualizar Routes

- [x] Task 19: Tests frontend (AC: #2, #5, #6, #7)
  - [x] Tests de PublicProfilePage: loading, perfil con datos, stats, historial, CTA visible sin auth, CTA oculto con auth, 404
  - [x] Tests de slug editing en ProfilePage: campo slug, indicador disponibilidad, validación, guardado
  - [x] Tests de links clickeables en MatchDetailPage: click en nombre navega a /u/:slug
  - [x] Tests de links clickeables en LeaderboardPage: click en nombre navega a /u/:slug

- [x] Task 20: Tests backend adicionales (AC: #1, #9)
  - [x] Tests de generateSlug: formato correcto, caracteres acentuados normalizados, una palabra
  - [x] Tests de generateUniqueSlug: resolución de colisiones
  - [x] Tests del middleware OG: detección bot, HTML generado con meta tags correctas, bypass para browsers

### Review Findings

- [x] [Review][Decision] OG middleware registrado en NestJS pero /u/* es ruta de la SPA y nunca llega al servidor NestJS (no hay ServeStatic configurado) — RESUELTO: Opción A aplicada (ServeStaticModule, Dockerfile actualizado, deploy.yml actualizado, helmet configurado)
- [ ] [Review][Patch] XSS en template HTML del OG proxy — displayName, description, avatarUrl interpolados sin escapar entidades HTML [apps/api/src/middleware/og-proxy.middleware.ts:54-70]
- [ ] [Review][Patch] Host-header injection — usar FRONTEND_URL de config en lugar de req.get('host') [apps/api/src/middleware/og-proxy.middleware.ts:53]
- [ ] [Review][Patch] Race condition TOCTOU en slug — check-then-write no atómico; P2002 de Prisma debe capturarse como ConflictException 409 [apps/api/src/modules/users/users.service.ts, users.controller.ts]
- [ ] [Review][Patch] Migración backfill sin manejo de colisiones — CREATE UNIQUE INDEX puede fallar si dos usuarios con mismas iniciales obtienen el mismo MD5[0:3] [prisma/migrations/20260405000000_add_user_slug/migration.sql]
- [ ] [Review][Patch] OG description no incluye bestScore/maxLevel/country — viola AC9 (el middleware no consulta MatchResult) [apps/api/src/middleware/og-proxy.middleware.ts:39-54]
- [ ] [Review][Patch] check-slug sin @Throttle dedicado — permite enumerar el espacio de slugs anónimamente [apps/api/src/modules/users/users.controller.ts:46-51]
- [ ] [Review][Patch] generateSlug produce slugs inválidos para nombres con caracteres no-latinos (CJK, emoji) — NFD strip no elimina no-ASCII [apps/api/src/modules/users/users.service.ts:19-35]
- [ ] [Review][Patch] handleSave no bloquea guardado si slug availability aún no verificada o está pendiente [apps/web/src/components/profile/profile-page.tsx]
- [ ] [Review][Patch] DTO @Matches exige lowercase, rechazando slugs mixtos en vez de normalizarlos — violación AC2 (el toLowerCase del controller es dead code path) [apps/api/src/modules/users/dto/update-profile.dto.ts:11]
- [ ] [Review][Patch] totalPages = 0 cuando usuario sin partidas muestra "1 / 0" en paginación [apps/web/src/components/profile/public-profile-page.tsx:71]
- [ ] [Review][Patch] Migración backfill falla para display names de 1 carácter o con espacios iniciales [prisma/migrations/20260405000000_add_user_slug/migration.sql:6-13]
- [ ] [Review][Patch] useCheckSlug enabled-guard usa regex más permisivo que el DTO — puede mostrar "Disponible" para slugs que el backend rechaza [apps/web/src/hooks/use-check-slug.ts:12]
- [x] [Review][Defer] usePublicProfile sin staleTime — re-fetches en cada mount [apps/web/src/hooks/use-public-profile.ts] — deferred, pre-existing pattern
- [x] [Review][Defer] countryPercentile puede ser NaN si globalTotal=0 [apps/api/src/modules/leaderboard/leaderboard.service.ts:190] — deferred, pre-existing
- [x] [Review][Defer] profile.id stale desde cache puede disparar queries de stats para usuario incorrecto [apps/web/src/components/profile/public-profile-page.tsx] — deferred, React Query behavior, low risk

---

## Dev Notes

### Arquitectura y patrones clave

**Slug lowercase siempre:** Toda comparación y almacenamiento en lowercase. El frontend normaliza antes de enviar, el backend normaliza antes de guardar/buscar. No hay case-sensitivity en slugs.

**Formato auto-generación:** `{iniciales}-{3hex}`. Las iniciales se extraen de `displayName.split(' ')`, tomando la primera letra de cada palabra. Si es una sola palabra, se usan las dos primeras letras. Caracteres acentuados se normalizan (NFD + strip diacritics). Ejemplo: "Sebastián Sanhueza" → `ss`, "María" → `ma`. Los 3 hex son `Math.random().toString(16).slice(2, 5)`.

**Endpoints públicos vs autenticados:**
- `GET /users/check-slug/:slug` → público
- `GET /users/by-slug/:slug` → público
- `GET /users/:id/matches` → público
- `GET /users/:id/stats` → público
- `GET /matches/:matchCode` → público (cambio: antes era protegido)
- `PATCH /users/me` → autenticado (existente, extendido con slug)

**Cuidado con routing del controller:** Los endpoints `check-slug/:slug` y `by-slug/:slug` deben declararse ANTES de `:id/matches` y `:id/stats` en el controller, para que NestJS no interprete "check-slug" como un `:id`.

**Proxy OG middleware — detección de bots:**
```typescript
const BOT_USER_AGENTS = [
  'WhatsApp', 'Twitterbot', 'facebookexternalhit',
  'Googlebot', 'LinkedInBot', 'Slackbot', 'Discordbot',
];

function isBot(userAgent: string): boolean {
  return BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
}
```

**Proxy OG — template HTML:**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <title>${displayName} — UltimaType</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${displayName} — UltimaType">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${avatarUrl}">
  <meta property="og:url" content="${baseUrl}/u/${slug}">
  <meta name="twitter:card" content="summary">
</head>
<body></body>
</html>
```

**Reutilización de MatchHistorySection:** El componente actual usa hooks que consultan `/api/matches` (del usuario autenticado). Para el perfil público, se necesitan hooks separados que consulten `/api/users/:id/matches` y `/api/users/:id/stats`. Considerar extraer la parte de UI de MatchHistorySection en un componente compartido que reciba data via props, y crear dos wrappers: uno para el perfil propio (hooks actuales) y otro para el perfil público (hooks nuevos).

**Privacidad:** Los endpoints públicos NUNCA exponen: `email`, `provider`, `providerId`, `updatedAt`, `lastLoginAt`. Solo: `id`, `displayName`, `avatarUrl`, `countryCode`, `slug`, `createdAt`.

**PublicProfilePage — CTA:**
```tsx
{!isAuthenticated && (
  <a href="/api/auth/google" className="...">
    Comienza a competir
  </a>
)}
```

**Migración con backfill:** Como hay usuarios existentes sin slug, la migración tiene dos pasos:
1. Agregar campo nullable `slug String? @unique`
2. Ejecutar script backfill que genera slugs para todos los usuarios existentes
3. Alterar a not null: `slug String @unique`
Esto puede hacerse en una sola migración custom con SQL raw.

### Modelo User actualizado (post-migración)

```prisma
model User {
  id          String       @id @default(uuid())
  provider    AuthProvider
  providerId  String       @map("provider_id")
  email       String
  displayName String       @map("display_name")
  avatarUrl   String?      @map("avatar_url")
  countryCode String?      @map("country_code")
  slug        String       @unique
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  lastLoginAt DateTime     @default(now()) @map("last_login_at")

  matchResults MatchResult[]

  @@unique([provider, providerId])
  @@map("users")
}
```

### Regresiones a prevenir

- `GET /auth/me` sigue retornando el user completo (incluye email) — solo para el usuario autenticado, no cambia
- `PATCH /users/me` sigue aceptando `countryCode` — agregar `slug` como campo opcional adicional, no romper lo existente
- `GET /matches/:matchCode` cambia de autenticado a público — verificar que no hay lógica que dependa de `req.user` en ese endpoint
- Los endpoints nuevos de users (`check-slug`, `by-slug`, `:id/matches`, `:id/stats`) deben registrarse con rutas que no colisionen con `PATCH me`

### Project Structure Notes

```
prisma/
└── schema.prisma                           ← modificar: agregar campo slug

apps/api/src/modules/users/
├── users.service.ts                        ← modificar: generateSlug, generateUniqueSlug, findBySlug, updateSlug
├── users.controller.ts                     ← modificar: check-slug, by-slug, :id/matches, :id/stats, extender PATCH me
├── users.service.spec.ts                   ← modificar: tests de slug generation y nuevos métodos
├── users.controller.spec.ts                ← modificar/crear: tests de nuevos endpoints
└── dto/update-profile.dto.ts               ← modificar: agregar slug opcional

apps/api/src/modules/match-results/
├── match-results.controller.ts             ← modificar: remover guard de GET :matchCode, agregar slug a response
├── match-results.service.ts                ← modificar: incluir user.slug en findByMatchCode
├── match-results.controller.spec.ts        ← modificar: test sin auth para GET :matchCode
└── match-results.service.spec.ts           ← modificar: test de slug en findByMatchCode

apps/api/src/middleware/
└── og-proxy.middleware.ts                  ← NUEVO: middleware de detección bot + OG meta tags

apps/web/src/
├── hooks/
│   ├── use-public-profile.ts               ← NUEVO
│   ├── use-user-matches.ts                 ← NUEVO
│   ├── use-user-stats.ts                   ← NUEVO
│   └── use-check-slug.ts                   ← NUEVO
├── components/profile/
│   ├── public-profile-page.tsx             ← NUEVO
│   ├── public-profile-page.spec.tsx        ← NUEVO
│   ├── profile-page.tsx                    ← modificar: agregar edición de slug
│   └── match-history-section.tsx           ← posible refactor para reutilización
├── components/match/
│   └── match-detail-page.tsx               ← modificar: nombres clickeables con Link
└── app/
    └── app.tsx                             ← modificar: agregar ruta /u/:slug, mover /match fuera de ProtectedRoute

libs/shared/src/
├── dto/match-result.dto.ts                 ← modificar: agregar slug a MatchDetailParticipantDto
├── types/user.ts                           ← modificar: agregar slug a UserProfile
└── dto/public-profile.dto.ts               ← NUEVO: PublicUserProfileDto, CheckSlugResponseDto
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4] — contexto del epic
- [Source: _bmad-output/implementation-artifacts/4-2-personal-history-progression-dashboard.md] — patrón de filtros y historial a reutilizar
- [Source: apps/api/src/modules/users/users.service.ts] — service a extender
- [Source: apps/api/src/modules/users/users.controller.ts] — controller a extender
- [Source: apps/api/src/modules/match-results/match-results.controller.ts] — endpoint match detail a modificar
- [Source: apps/web/src/components/match/match-detail-page.tsx] — nombres a hacer clickeables
- [Source: apps/web/src/app/app.tsx] — router a modificar
- [Source: prisma/schema.prisma] — schema a migrar
