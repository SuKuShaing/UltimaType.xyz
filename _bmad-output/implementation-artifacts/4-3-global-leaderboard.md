# Story 4.3: Global Leaderboard

Status: review

## Story

As a competitive player,
I want to view a global leaderboard showing the top-scoring players and their countries,
so that I can see how I rank against the global community.

## Acceptance Criteria

### AC1: Tabla de ranking global

**Given** un usuario navegando a la pagina de Leaderboard (`/leaderboard`)
**When** la pagina carga
**Then** se muestra una lista top-100 de jugadores ordenada por mejor puntaje (score, NO wpm) descendente
**And** cada fila muestra, en orden: posicion (#), bandera de pais, avatar + nombre (juntos), mejor puntaje, precision de esa partida (no promedio)

### AC2: Widget "Tu posicion"

**Given** un usuario autenticado en la pagina de Leaderboard
**When** la pagina carga
**Then** se muestra un widget "Tu posicion" con:
- Tu mejor puntaje: N pts · partida [matchCode], [fecha]
- Mundial: posicion #N, Top X% del mundo
- [Pais]: posicion #N, Top X% de [pais]
**And** el percentil se calcula como: `(1 - (players_with_higher_best_score / total_players)) * 100`
**And** "Tu mejor puntaje" y la referencia a partida vienen del MatchResult con mayor score del usuario (filtrado por level/period activos)
**And** el matchCode en el widget es un link que abre la vista de detalle de esa partida (`/match/:matchCode`)
**And** el widget refleja los filtros activos (level, period)

### AC3: Cache Redis

**Given** los datos del leaderboard
**When** se obtienen del backend
**Then** la respuesta se cachea en Redis con TTL de 12 horas
**And** la cache key codifica los filtros activos (level, country, period)
**And** si ningun nuevo record ha invalidado la cache, el TTL sirve como expiracion de respaldo

### AC4: Filtros basicos de nivel

**Given** la pagina de Leaderboard
**When** el usuario selecciona un nivel de dificultad (1-5 o "Todos")
**Then** el leaderboard se actualiza mostrando el ranking filtrado por ese nivel
**And** el widget "Tu posicion" recalcula con el nivel seleccionado

### AC5: Estado vacio, loading y no autenticado

**Given** la pagina de Leaderboard
**When** no hay datos de leaderboard (o los filtros no arrojan resultados)
**Then** se muestra un mensaje vacio apropiado
**And** durante la carga se muestran skeletons/placeholders
**And** si el usuario no esta autenticado, el widget "Tu posicion" no se muestra pero la tabla de ranking si es visible

---

## Tasks / Subtasks

- [x] Task 1: DTOs compartidos (AC: #1, #2)
  - [x] Crear `LeaderboardEntryDto` en `libs/shared/src/dto/leaderboard.dto.ts` con: `position: number`, `displayName: string`, `avatarUrl: string | null`, `countryCode: string | null`, `bestScore: number`, `avgPrecision: number`
  - [x] Crear `UserLeaderboardPositionDto` con: `bestScore: number`, `bestScoreMatchCode: string`, `bestScoreDate: string`, `globalRank: number`, `globalTotal: number`, `globalPercentile: number`, `countryRank: number | null`, `countryTotal: number | null`, `countryPercentile: number | null`, `countryCode: string | null`
  - [x] Re-exportar desde `libs/shared/src/index.ts`: `export * from './dto/leaderboard.dto'`

- [x] Task 2: Registrar RedisService en RedisModule (AC: #3)
  - [x] Agregar `RedisService` como provider Y export en `apps/api/src/redis/redis.module.ts` (ya es `@Global()`, asi queda disponible en toda la app)
  - [x] Importar `RedisService` desde `../../redis/redis.service`
  - [x] Agregar metodo `keys(pattern: string): Promise<string[]>` a `RedisService` (necesario para 4-5 invalidacion, pero mejor agregarlo ahora)

- [x] Task 3: LeaderboardService (AC: #1, #2, #3)
  - [x] Crear `apps/api/src/modules/leaderboard/leaderboard.service.ts`
  - [x] Inyectar `PrismaService` y `RedisService`
  - [x] Metodo `getLeaderboard(level?, period?, country?, page?, limit?): Promise<{ data: LeaderboardEntryDto[], total: number }>`
  - [x] Metodo `getUserPosition(userId, level?, period?): Promise<UserLeaderboardPositionDto>`
  - [x] Helper privado `buildCacheKey(prefix, level?, country?, period?): string`
  - [x] Helper privado `periodToDateFrom(period?): Date | null` (reutilizar logica de MatchResultsService)
  - [x] TTL de cache: 43200 segundos (12 horas)

- [x] Task 4: LeaderboardController (AC: #1, #2, #4)
  - [x] Crear `apps/api/src/modules/leaderboard/leaderboard.controller.ts`
  - [x] `GET /api/leaderboard` (publico, sin auth guard) con query params: `level`, `period`, `country`, `page`, `limit`
  - [x] `GET /api/leaderboard/position` (protegido con `JwtAuthGuard`) con query params: `level`, `period`
  - [x] Reutilizar helpers `parseLevelParam` y `parsePeriodParam` (extraer a utilidad compartida o copiar)
  - [x] Respuesta de leaderboard usa `PaginatedResponse<LeaderboardEntryDto>` existente

- [x] Task 5: LeaderboardModule (AC: #1, #2, #3)
  - [x] Crear `apps/api/src/modules/leaderboard/leaderboard.module.ts`
  - [x] Importar y registrar `LeaderboardController` y `LeaderboardService`
  - [x] Importar `LeaderboardModule` en `AppModule` (apps/api/src/app/app.module.ts)

- [x] Task 6: Tests backend (AC: #1, #2, #3, #4)
  - [x] Tests de `LeaderboardService`: getLeaderboard sin filtros, con level, con period, con country, cache hit, cache miss, getUserPosition con datos, sin datos, con pais, sin pais
  - [x] Tests de `LeaderboardController`: defaults, level valido/invalido, period valido/invalido, endpoint position requiere auth, leaderboard publico
  - [x] Mockear `RedisService` (get/set) y `PrismaService` ($queryRaw)

- [x] Task 7: Frontend hooks (AC: #1, #2)
  - [x] Crear `apps/web/src/hooks/use-leaderboard.ts` con `useLeaderboard({ level, period, page })`
  - [x] Crear `apps/web/src/hooks/use-leaderboard-position.ts` con `useLeaderboardPosition({ level, period })` (solo cuando `isAuthenticated`)
  - [x] Query keys: `['leaderboard', { level, period, page }]` y `['leaderboard', 'position', { level, period }]`

- [x] Task 8: Componente LeaderboardPage (AC: #1, #2, #4, #5)
  - [x] Crear `apps/web/src/components/leaderboard/leaderboard-page.tsx`
  - [x] Widget "Tu posicion" (solo si autenticado): tarjeta con mejor puntaje + link a matchCode, rank global con %, rank pais con %
  - [x] Level filter pills (misma UX que en MatchHistorySection: "Todos", niveles 1-5 con nombres de DIFFICULTY_LEVELS)
  - [x] Tabla de ranking: columnas #, Bandera+Avatar+Nombre, Mejor Puntaje, Precision Promedio
  - [x] Paginacion si hay mas de 100 entradas
  - [x] Estado vacio, loading con skeletons, error con reintentar
  - [x] `<Helmet>` con titulo "Ranking Global - UltimaType"

- [x] Task 9: Ruta y NavBar (AC: #1)
  - [x] Agregar ruta `/leaderboard` en `apps/web/src/app/app.tsx` (NO protegida, publica)
  - [x] Agregar link "Ranking" en `NavBar` (`apps/web/src/components/ui/nav-bar.tsx`) visible para todos los usuarios

- [x] Task 10: Tests frontend (AC: #1, #2, #4, #5)
  - [x] Crear `apps/web/src/components/leaderboard/leaderboard-page.spec.tsx`
  - [x] Tests: loading state, tabla con datos, widget posicion autenticado, sin widget no autenticado, filtro de nivel, estado vacio, link a match detail, paginacion

---

## Dev Notes

### Arquitectura y patrones clave

**Nuevo modulo dedicado:** Crear `apps/api/src/modules/leaderboard/` como modulo separado de `match-results`. Razon: el leaderboard tiene su propia logica de caching, queries agregadas distintas, y en 4-5 tendra logica de invalidacion. Mantener separacion de responsabilidades.

**RedisService no esta registrado en ningun modulo:** `RedisModule` (global) solo exporta `REDIS_CLIENT` (raw ioredis). `RedisService` existe en `redis.service.ts` pero NO esta en providers/exports. DEBE registrarse en `RedisModule` antes de inyectarlo en `LeaderboardService`.

**Modificacion a `redis.module.ts`:**
```typescript
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, useFactory: ... },
    RedisShutdownService,
    RedisService,          // <-- AGREGAR
  ],
  exports: [REDIS_CLIENT, RedisService],  // <-- AGREGAR RedisService
})
```

**Query principal del leaderboard — usar `$queryRaw`:** Prisma `groupBy` no soporta joins con relaciones. La query necesita agrupar por usuario, calcular MAX(score) y AVG(precision), y traer info del usuario. Usar raw SQL:

```typescript
async getLeaderboard(level?: number, period?: MatchPeriod, country?: string, page = 1, limit = 100) {
  const cacheKey = this.buildCacheKey('leaderboard', level, country, period);
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const dateFrom = this.periodToDateFrom(period);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (level !== undefined) {
    conditions.push(`mr.level = $${params.length + 1}`);
    params.push(level);
  }
  if (dateFrom) {
    conditions.push(`mr.created_at >= $${params.length + 1}`);
    params.push(dateFrom);
  }
  if (country) {
    conditions.push(`u.country_code = $${params.length + 1}`);
    params.push(country);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Query con Prisma.$queryRawUnsafe para parametros dinamicos
  const entries = await this.prisma.$queryRawUnsafe(`
    SELECT u.display_name AS "displayName",
           u.avatar_url AS "avatarUrl",
           u.country_code AS "countryCode",
           MAX(mr.score) AS "bestScore",
           ROUND(AVG(mr.precision)::numeric, 1) AS "avgPrecision"
    FROM match_results mr
    JOIN users u ON mr.user_id = u.id
    ${whereClause}
    GROUP BY u.id, u.display_name, u.avatar_url, u.country_code
    ORDER BY "bestScore" DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, ...params, limit, offset);

  // Count total distinct users
  const countResult = await this.prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT mr.user_id) AS total
    FROM match_results mr
    JOIN users u ON mr.user_id = u.id
    ${whereClause}
  `, ...params);

  const total = Number(countResult[0]?.total ?? 0);
  const data = entries.map((e, i) => ({
    position: offset + i + 1,
    displayName: e.displayName,
    avatarUrl: e.avatarUrl,
    countryCode: e.countryCode,
    bestScore: Number(e.bestScore),
    avgPrecision: Number(e.avgPrecision),
  }));

  const result = { data, total };
  await this.redis.set(cacheKey, JSON.stringify(result), 43200); // 12h TTL
  return result;
}
```

**CRITICO: `$queryRawUnsafe` vs `$queryRaw`:** Prisma `$queryRaw` usa tagged template literals y no permite construir WHERE dinamicos facilmente. `$queryRawUnsafe` acepta string + params posicionales (`$1`, `$2`, ...) que previenen SQL injection igual que prepared statements. Los params SIEMPRE se pasan como argumentos separados, NUNCA interpolados en el string.

**Query de posicion del usuario:**
```typescript
async getUserPosition(userId: string, level?: number, period?: MatchPeriod) {
  // 1. Best score del usuario (con filtros)
  const userBest = await this.prisma.matchResult.findFirst({
    where: { userId, ...(level !== undefined ? { level } : {}), ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}) },
    orderBy: { score: 'desc' },
    select: { score: true, matchCode: true, createdAt: true },
  });

  if (!userBest) return null; // Usuario sin partidas

  // 2. Posicion global: cuantos usuarios tienen mejor best score
  const globalRank = await this.prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT user_id) + 1 AS rank
    FROM (
      SELECT user_id, MAX(score) AS best
      FROM match_results ${whereClause}
      GROUP BY user_id
      HAVING MAX(score) > $N
    ) sub
  `, ...params, userBest.score);

  // 3. Posicion en pais (si tiene countryCode)
  // Similar con filtro adicional de country_code
}
```

**Cache key pattern:**
```
leaderboard:level:{level|ALL}:country:{country|ALL}:period:{period|all}
```
Ejemplos: `leaderboard:level:3:country:ALL:period:all`, `leaderboard:level:ALL:country:AR:period:7d`

**Cache para posicion de usuario:** NO cachear posicion individual (cambia con cada partida nueva de cualquier jugador). Solo cachear la tabla del leaderboard.

### Controller — endpoint publico vs protegido

- `GET /api/leaderboard` es **publico** (sin `@UseGuards`). Cualquier visitante puede ver el ranking.
- `GET /api/leaderboard/position` es **protegido** (`@UseGuards(JwtAuthGuard)`). Solo usuarios autenticados.
- Reutilizar `parseLevelParam` y `parsePeriodParam` del controller de match-results. Opciones:
  - **Opcion A (recomendada):** Extraer a un archivo utilitario `apps/api/src/utils/query-params.ts` y usarlo en ambos controllers.
  - **Opcion B:** Copiar las funciones al nuevo controller (duplicacion aceptable para 2 funciones simples).

### Frontend — LeaderboardPage

**Ruta publica:** La ruta `/leaderboard` NO usa `ProtectedRoute`. Es accesible para todos. El widget "Tu posicion" se muestra condicionalmente basado en `isAuthenticated`.

**NavBar — link "Ranking":** Agregar entre el logo y el area de perfil/login:
```tsx
<Link to="/leaderboard" className="text-sm text-text-muted transition-colors hover:text-text-main">
  Ranking
</Link>
```

**Hooks con TanStack Query:**
```typescript
// use-leaderboard.ts
export function useLeaderboard({ level, period, page }: { level?: number; period?: MatchPeriod; page: number }) {
  return useQuery({
    queryKey: ['leaderboard', { level, period, page }],
    queryFn: () => apiClient.get('/leaderboard', { params: { level, period, page } }),
    staleTime: 5 * 60 * 1000, // 5 min (cache del server es 12h, pero el client puede refrescar mas seguido)
  });
}

// use-leaderboard-position.ts
export function useLeaderboardPosition({ level, period }: { level?: number; period?: MatchPeriod }) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', 'position', { level, period }],
    queryFn: () => apiClient.get('/leaderboard/position', { params: { level, period } }),
    enabled: isAuthenticated,
  });
}
```

**Widget "Tu posicion" — formato:**
```
+--------------------------------------------------+
| Tu posicion                                      |
| Tu mejor puntaje: 847 pts                        |
|   conseguido en partida ABC123 · 2 abr 2026      |
|                                                   |
| Mundial: #42 · Top 3% del mundo                  |
| Argentina: #5 · Top 8% de Argentina              |
+--------------------------------------------------+
```
- El matchCode es un `<Link to={/match/${matchCode}}>` clickeable
- Si el usuario no tiene countryCode, no mostrar la fila de pais
- Si el usuario no tiene partidas, mostrar "Juega tu primera partida para aparecer en el ranking"

**Tabla de ranking:**
```
#   |  Jugador            | Mejor Puntaje | Precision
1   | AR Juan Perez       | 1,240         | 98.2%
2   | CL Maria Gonzalez   | 1,180         | 97.5%
...
```
- La bandera se muestra como emoji de pais (o texto del countryCode si no hay flag)
- Avatar (img 24x24 rounded-full) + displayName juntos
- bestScore formateado con separador de miles
- avgPrecision con 1 decimal + "%"

### Convenciones visuales (mismas que ProfilePage/MatchHistory)

- Contenedor principal: `rounded-2xl bg-surface-sunken p-8`
- Texto principal: `text-text-main`; muted: `text-text-muted`
- Filtro activo: `bg-primary text-surface-base font-semibold rounded-lg`
- Filtro inactivo: `bg-surface-raised text-text-muted rounded-lg`
- Sin bordes 1px (regla "No-Line" del proyecto)
- Font: `font-sans`

### Banderas de pais — emoji flags

Usar la funcion de conversion `countryCode → emoji flag`:
```typescript
function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}
```
Verificar si ya existe en el proyecto (buscar en `libs/shared` o `apps/web`). Si no, crear como utilidad en `apps/web/src/lib/country-utils.ts`.

### Aprendizajes de Stories 4-1 y 4-2

- Los tests de unit del controller instancian directamente sin NestJS routing (mock del service con `vi.fn()`)
- El service spec mockea `prisma` directamente (pattern establecido)
- `PrismaService` es global, inyectable sin importar `PrismaModule`
- `Promise.all` para queries paralelas en el service
- Frontend: TanStack Query hooks con queryKey que incluye todos los filtros
- Filter pills: botones con `aria-pressed` para accesibilidad
- Loading: skeletons con `animate-pulse`, no "_"
- Empty state contextual: mensajes distintos segun que filtro esta activo
- Error state: mensaje + boton "Reintentar" con `refetch()`
- `parseLevelParam` valida con regex `/^[1-5]$/` — niveles 1-5
- `parsePeriodParam` valida contra array `VALID_PERIODS`
- Match detail link ya funciona: usar `<Link to={/match/${matchCode}}>` con React Router

### Regresiones a prevenir

- NO modificar `MatchResultsModule` ni `MatchResultsService` — el leaderboard es un modulo separado
- `RedisModule` es `@Global()`: al agregar `RedisService` a providers/exports, verificar que no rompa el `GameModule` que usa `REDIS_CLIENT` directamente
- `AppModule` imports: agregar `LeaderboardModule` al final del array de imports, despues de `GameModule`
- `NavBar` tiene layout flex con `justify-between` — el link "Ranking" va en un nuevo grupo central o junto al area derecha, sin romper el layout existente
- `app.tsx` Routes: la ruta `/leaderboard` NO es protegida, cualquier usuario puede acceder
- La ruta `/leaderboard` debe ir ANTES de la ruta `*` catch-all en el Routes

### Indice de Prisma recomendado

Para optimizar la query de leaderboard, considerar agregar indice en schema.prisma:
```prisma
@@index([level, score])
```
Esto acelera el GROUP BY + ORDER BY de la query principal. No es bloqueante para esta story pero es una mejora de rendimiento. Si se agrega, correr `npx prisma migrate dev`.

### Project Structure Notes

```
apps/api/src/
├── redis/
│   ├── redis.module.ts              <- MODIFICAR: agregar RedisService a providers/exports
│   ├── redis.service.ts             <- MODIFICAR: agregar metodo keys()
│   └── redis.service.spec.ts        <- MODIFICAR: agregar test para keys()
├── modules/
│   └── leaderboard/                 <- NUEVO directorio
│       ├── leaderboard.module.ts    <- NUEVO
│       ├── leaderboard.service.ts   <- NUEVO
│       ├── leaderboard.service.spec.ts <- NUEVO
│       ├── leaderboard.controller.ts   <- NUEVO
│       └── leaderboard.controller.spec.ts <- NUEVO
├── utils/
│   └── query-params.ts              <- NUEVO (opcional: extraer parseLevelParam/parsePeriodParam)
└── app/
    └── app.module.ts                <- MODIFICAR: importar LeaderboardModule

apps/web/src/
├── hooks/
│   ├── use-leaderboard.ts           <- NUEVO
│   └── use-leaderboard-position.ts  <- NUEVO
├── components/
│   ├── leaderboard/                 <- NUEVO directorio
│   │   ├── leaderboard-page.tsx     <- NUEVO
│   │   └── leaderboard-page.spec.tsx <- NUEVO
│   └── ui/
│       └── nav-bar.tsx              <- MODIFICAR: agregar link "Ranking"
├── lib/
│   └── country-utils.ts             <- NUEVO (countryCodeToFlag si no existe)
└── app/
    └── app.tsx                      <- MODIFICAR: agregar ruta /leaderboard + import

libs/shared/src/
├── dto/
│   └── leaderboard.dto.ts           <- NUEVO
└── index.ts                         <- MODIFICAR: exportar leaderboard.dto
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3] — ACs originales
- [Source: _bmad-output/implementation-artifacts/4-2-personal-history-progression-dashboard.md] — patrones del service, controller, hooks, y frontend establecidos en 4-2
- [Source: apps/api/src/modules/match-results/match-results.service.ts] — patron de periodToDateFrom y queries Prisma
- [Source: apps/api/src/modules/match-results/match-results.controller.ts] — parseLevelParam, parsePeriodParam, PaginatedResponse pattern
- [Source: apps/api/src/redis/redis.module.ts] — RedisModule global con REDIS_CLIENT
- [Source: apps/api/src/redis/redis.service.ts] — RedisService wrapper (NO registrado en modulo)
- [Source: apps/web/src/components/ui/nav-bar.tsx] — NavBar layout actual
- [Source: apps/web/src/app/app.tsx] — Routes actuales, patron ProtectedRoute
- [Source: apps/web/src/components/profile/match-history-section.tsx] — patron de filter pills, loading, error state
- [Source: libs/shared/src/dto/match-result.dto.ts] — DTOs existentes, PaginatedResponse, MatchPeriod
- [Source: _bmad-output/planning-artifacts/architecture.md] — REST patterns, Redis caching, naming conventions

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (create-story + dev-story, 2026-04-02)

### Debug Log References

### Completion Notes List

- Implementados 10 tasks. 275 API tests + 144 web tests pasando (419 total, sin regresiones).
- Nuevo modulo `LeaderboardModule` con `LeaderboardService` y `LeaderboardController` separados de match-results.
- `LeaderboardService` usa `$queryRawUnsafe` con parametros posicionales para queries agregadas (GROUP BY user, MAX score, AVG precision).
- Cache Redis con TTL 12h (43200s), cache key pattern: `leaderboard:level:{N}:country:{CC}:period:{P}`.
- Redis graceful degradation: si Redis falla en get/set, la query va directo a Postgres sin romper.
- `GET /api/leaderboard` publico (sin auth), `GET /api/leaderboard/position` protegido con JwtAuthGuard.
- `RedisService` registrado en `RedisModule` como provider+export global. Metodo `keys()` agregado para futura invalidacion (Story 4-5).
- Widget "Tu posicion": rank global con percentil, rank por pais (si tiene countryCode), link al match detail.
- Percentil calculado como `(1 - (rank-1)/total) * 100`.
- Frontend: 2 hooks TanStack Query (staleTime 5min), componente LeaderboardPage con 15 tests.
- NavBar: link "Ranking" con highlight activo via `useLocation`.
- Ruta `/leaderboard` publica (no ProtectedRoute).
- Reutiliza `CountryFlag` component existente y `COUNTRIES` constant para nombres de paises.

### Review Findings

- [x] [Review][Decision] `avgPrecision` → `bestScorePrecision`: muestra la precisión de la partida del mejor score, no el promedio histórico. Decisión: la columna del ranking pertenece a ese logro específico; ver promedio histórico es función del perfil. SQL cambiado a DISTINCT ON. [leaderboard.service.ts, leaderboard.dto.ts]
- [x] [Review][Patch] **CRÍTICO — APLICADO** `PrismaService` no exponía `$queryRawUnsafe` → 500 en todos los endpoints del leaderboard. Fix: agregar método delegador en `prisma.service.ts:31`. [prisma.service.ts]
- [x] [Review][Patch] **CRÍTICO — APLICADO** `req.user.id` → `undefined` porque `JwtStrategy.validate()` retorna `userId`. Fix: cambiar interface y acceso a `req.user.userId`. [leaderboard.controller.ts:12,72]
- [x] [Review][Patch] Cache key ahora incluye `page` y `limit` → cada página tiene su propia entrada en Redis. [leaderboard.service.ts]
- [x] [Review][Patch] Param `country` validado con `/^[A-Z]{2}$/` → strings inválidos se ignoran, Redis key explosion eliminado. [leaderboard.controller.ts]
- [x] [Review][Patch] Tiebreaker agregado: `ORDER BY "bestScore" DESC, "bestScorePrecision" DESC` → empates se desempatan por mayor precisión, consistente con la tabla de resultados del perfil. [leaderboard.service.ts]
- [x] [Review][Patch] Param `page` limitado a máximo 10 (top-1000 leaderboard cap: 10 páginas × 100 = 1000 jugadores). Widget "Tu posición" usa query separada sin este límite → siempre muestra rank real. [leaderboard.controller.ts]
- [x] [Review][Patch] React key cambiada a `entry.userId` (único garantizado). `userId` agregado a `LeaderboardEntryDto`, SQL query y mapping. Prepara terreno para links de perfil cuando se implemente slug. [leaderboard.dto.ts, leaderboard.service.ts, leaderboard-page.tsx]
- [x] [Review][Patch] Widget copy: AC actualizado para reflejar la implementación (`·` en lugar de `,`, sin "conseguido en"). Formato preferido por el equipo. [4-3-global-leaderboard.md AC2]
- [x] [Review][Patch] `RedisService.keys()` reemplazado con `SCAN` iterativo no-bloqueante (COUNT 100 por iteración). Tests actualizados para cubrir iteración simple, multi-cursor y vacío. [redis.service.ts, redis.service.spec.ts]
- [x] [Review][Defer] `getUserPosition` ejecuta 4-5 queries secuenciales sin transacción → snapshot inconsistente bajo carga — deferred, pre-existing pattern
- [x] [Review][Defer] Cálculo de período con `Date.now()` ignora DST — deferred, pre-existing en match-results también
- [x] [Review][Defer] Sin invalidación activa del cache al guardar nuevo resultado — deferred, scope Story 4-5
- [x] [Review][Defer] Period filter fijo en `'all'` sin UI para cambiarlo — deferred, V2 scope
- [x] [Review][Defer] Endpoint `/position` no cacheado en Redis — deferred, bajo impacto, analizar en 4-5

### File List

- libs/shared/src/dto/leaderboard.dto.ts (nuevo: LeaderboardEntryDto, UserLeaderboardPositionDto)
- libs/shared/src/index.ts (modificado: re-export leaderboard.dto)
- ultimatype-monorepo/apps/api/src/redis/redis.module.ts (modificado: RedisService en providers/exports)
- ultimatype-monorepo/apps/api/src/redis/redis.service.ts (modificado: metodo keys())
- ultimatype-monorepo/apps/api/src/modules/leaderboard/leaderboard.module.ts (nuevo)
- ultimatype-monorepo/apps/api/src/modules/leaderboard/leaderboard.service.ts (nuevo)
- ultimatype-monorepo/apps/api/src/modules/leaderboard/leaderboard.service.spec.ts (nuevo: 17 tests)
- ultimatype-monorepo/apps/api/src/modules/leaderboard/leaderboard.controller.ts (nuevo)
- ultimatype-monorepo/apps/api/src/modules/leaderboard/leaderboard.controller.spec.ts (nuevo: 16 tests)
- ultimatype-monorepo/apps/api/src/app/app.module.ts (modificado: import LeaderboardModule)
- ultimatype-monorepo/apps/web/src/hooks/use-leaderboard.ts (nuevo)
- ultimatype-monorepo/apps/web/src/hooks/use-leaderboard-position.ts (nuevo)
- ultimatype-monorepo/apps/web/src/components/leaderboard/leaderboard-page.tsx (nuevo)
- ultimatype-monorepo/apps/web/src/components/leaderboard/leaderboard-page.spec.tsx (nuevo: 15 tests)
- ultimatype-monorepo/apps/web/src/components/ui/nav-bar.tsx (modificado: link Ranking + useLocation)
- ultimatype-monorepo/apps/web/src/app/app.tsx (modificado: ruta /leaderboard + import LeaderboardPage)
