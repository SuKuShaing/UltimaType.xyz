# Story 4.2: Personal History & Progression Dashboard

Status: done

## Story

As a player,
I want to view my past matches, average score, and best personal score in my profile,
so that I can see my typing progression over time.

## Acceptance Criteria

### AC1: Sección de historial en ProfilePage

**Given** un usuario autenticado en `/profile`
**When** carga la página
**Then** ve una sección "Historial" debajo de su tarjeta de perfil con: lista de partidas recientes (puntaje, WPM, precisión, nivel, rank, fecha) y métricas calculadas "Puntaje Promedio" y "Mejor Puntaje"

### AC2: Métricas globales

**Given** el usuario tiene partidas registradas
**When** ve la sección de historial
**Then** se muestra "Puntaje Promedio" (promedio de score filtrado por período y nivel activos) y "Mejor Puntaje" (máximo score histórico, **siempre all-time sin importar los filtros activos**)
**And** se muestra "Total Partidas" para el conjunto filtrado actualmente

### AC3: Filtro por período de tiempo

**Given** el usuario ve la sección de historial
**When** selecciona un filtro de período ("Últimos 7 días", "Últimos 30 días", "Todo el tiempo")
**Then** la lista de partidas se actualiza mostrando solo las jugadas en ese rango
**And** "Puntaje Promedio" recalcula reflejando solo las partidas filtradas
**And** "Mejor Puntaje" sigue mostrando el máximo score histórico all-time (sin filtro de período)

### AC4: Filtro por nivel

**Given** el usuario ve la sección de historial
**When** selecciona un filtro de nivel (niveles 1–5 o "Todos")
**Then** la lista de partidas se actualiza mostrando solo las del nivel seleccionado
**And** los filtros de período y nivel se pueden combinar simultáneamente

### AC5: Endpoint GET /api/matches/stats

**Given** un usuario autenticado
**When** hace `GET /api/matches/stats` (con parámetros opcionales `level=1-5` y `period=7d|30d|all`)
**Then** recibe `{ avgScore, bestScore, totalMatches }` donde:
- `avgScore` es el promedio de score filtrado (aplica level y period)
- `bestScore` es el máximo score all-time del usuario (sin filtros)
- `totalMatches` es el count filtrado

### AC6: Endpoint GET /api/matches con filtros

**Given** un usuario autenticado
**When** hace `GET /api/matches?level=3&period=7d`
**Then** recibe solo sus partidas del nivel 3 jugadas en los últimos 7 días, paginadas
**And** los parámetros `level` y `period` son opcionales (sin ellos devuelve todo como antes)

### AC7: Estado vacío y carga

**Given** el usuario no tiene partidas registradas (o el filtro no arroja resultados)
**When** ve la sección de historial
**Then** se muestra un mensaje vacío ("Aún no tienes partidas registradas" o "Sin partidas en este período")
**And** durante la carga se muestra un indicador de loading (spinner o skeleton)

---

## Tasks / Subtasks

- [x] Task 1: DTOs compartidos (AC: #5, #6)
  - [x] Agregar `export type MatchPeriod = '7d' | '30d' | 'all'` en `libs/shared/src/dto/match-result.dto.ts`
  - [x] Agregar `export interface MatchStatsDto { avgScore: number; bestScore: number; totalMatches: number; }` en el mismo archivo
  - [x] Re-exportar ambos desde `libs/shared/src/index.ts` (verificar si ya se exporta todo con `export * from './dto/match-result.dto'`)

- [x] Task 2: Backend — extender findByUser con filtros (AC: #6)
  - [x] Agregar helper privado `periodToDateFrom(period?: MatchPeriod): Date | null` en el service
  - [x] Actualizar firma de `findByUser` para aceptar `level?: number` y `period?: MatchPeriod` como parámetros opcionales (4to y 5to param)
  - [x] Construir cláusula `where` con filtros opcionales
  - [x] Adaptar llamadas existentes al método (en el controller) — los parámetros son opcionales, no rompe nada

- [x] Task 3: Backend — método getStats (AC: #5)
  - [x] Agregar método `async getStats(userId: string, level?: number, period?: MatchPeriod): Promise<MatchStatsDto>` en `MatchResultsService`
  - [x] Usar `prisma.matchResult.aggregate` para avgScore y totalMatches
  - [x] Usar `prisma.matchResult.findFirst` sin filtros para bestScore (all-time)
  - [x] Retornar con avgScore redondeado a 1 decimal
  - [x] Ejecutar ambas queries en `Promise.all` para eficiencia

- [x] Task 4: Backend — endpoint GET /api/matches/stats (AC: #5)
  - [x] Agregar `@Get('stats')` ANTES del `@Get()` existente en `MatchResultsController`
  - [x] Proteger con `@UseGuards(JwtAuthGuard)`
  - [x] Validar level (1-5) y period ('7d'|'30d'|'all') con helpers `parseLevelParam` y `parsePeriodParam`
  - [x] Llamar `matchResultsService.getStats(req.user.id, level, period)`
  - [x] Actualizar `getMyResults` para también aceptar y pasar `level` y `period`

- [x] Task 5: Tests backend (AC: #5, #6)
  - [x] Tests de `MatchResultsService.findByUser` con filtros: con level, con period 7d, con ambos, sin ninguno
  - [x] Tests de `MatchResultsService.getStats`: sin datos (retorna 0s), con datos, bestScore ignora filtros de period, level filter aplicado a avgScore
  - [x] Tests de `MatchResultsController.getMyStats`: defaults, level válido/inválido, period válido/inválido, todos los periods
  - [x] Tests de `MatchResultsController.getMyResults` con nuevos params: level y period se pasan al service

- [x] Task 6: Frontend — hooks (AC: #1–#4)
  - [x] Crear `apps/web/src/hooks/use-match-history.ts` con `useMatchHistory({ page, level, period })`
  - [x] Crear `apps/web/src/hooks/use-match-stats.ts` con `useMatchStats({ level, period })`

- [x] Task 7: Frontend — componente MatchHistorySection (AC: #1–#4, #7)
  - [x] Crear `apps/web/src/components/profile/match-history-section.tsx`
  - [x] Estado local: `period`, `level`, `page` con reset de page al cambiar filtros
  - [x] Stats row: 3 tarjetas (Puntaje Promedio, Mejor Puntaje, Total Partidas)
  - [x] Filter pills para período y nivel con aria-pressed
  - [x] Lista de partidas: tabla con WPM, Precisión, Nivel (DIFFICULTY_LEVELS), Rank, Fecha
  - [x] Estado vacío diferenciado (sin datos vs sin resultados en filtro)
  - [x] Estado loading con "_"
  - [x] Paginación con botones anterior/siguiente

- [x] Task 8: Frontend — integrar en ProfilePage (AC: #1)
  - [x] Importar `MatchHistorySection` en `profile-page.tsx`
  - [x] Cambiar el contenedor outer de `max-w-md` a `max-w-2xl`
  - [x] Agregar `<MatchHistorySection />` debajo de la tarjeta de perfil existente

- [x] Task 9: Tests frontend (AC: #1, #3, #4, #7)
  - [x] Crear `apps/web/src/components/profile/match-history-section.spec.tsx`
  - [x] 14 tests: loading, lista con datos, nivel names, rank para DNF, estado vacío (ambos casos), filtros de período/nivel, paginación

---

## Dev Notes

### Arquitectura y patrones clave

**Módulo backend existente:** `apps/api/src/modules/match-results/` ya tiene `MatchResultsService` y `MatchResultsController`. NO crear módulo nuevo — extender el existente.

**Controller routing crítico:** El endpoint `@Get('stats')` DEBE declararse **antes** del `@Get()` en el controller. En NestJS, aunque técnicamente son paths distintos, es buena práctica y evita problemas si en el futuro se agrega `@Get(':id')`.

**Prisma aggregate:** Usar `prisma.matchResult.aggregate()` para calcular avgScore y count en una sola query. Para bestScore usar `findFirst` con `orderBy: { wpm: 'desc' }`.

**bestScore siempre all-time:** Las dos queries en `getStats` tienen `where` distintos:
- filteredWhere: `{ userId, level?, createdAt: { gte: dateFrom } }` → avgScore + count
- allTimeWhere: `{ userId }` solo → bestScore  
Así el "Mejor Puntaje" es siempre el máximo histórico del usuario, sin importar filtros activos.

**findByUser backward compatible:** Los nuevos parámetros `level` y `period` son el 4to y 5to argumento, opcionales. Las llamadas existentes en el controller sin estos params siguen funcionando.

**TanStack Query cache keys:** Incluir todos los filtros en el queryKey para que React Query refetche cuando cambian:
```typescript
queryKey: ['matches', 'history', { page, level, period }]
queryKey: ['matches', 'stats', { level, period }]
```

**useQuery en hooks:** Estos hooks solo funcionan cuando el usuario está autenticado (la query solo se ejecuta dentro de ProfilePage que ya tiene guard). No necesitan `enabled: isAuthenticated` porque ProfilePage redirige si no autenticado.

**Importaciones de shared:** Tanto `MatchPeriod` como `MatchStatsDto` y `DIFFICULTY_LEVELS` se importan desde `@ultimatype-monorepo/shared`. Verificar que el índice los re-exporte correctamente.

### Pseudocódigo backend — getStats

```typescript
async getStats(userId: string, level?: number, period?: MatchPeriod): Promise<MatchStatsDto> {
  const dateFrom = this.periodToDateFrom(period);
  const filteredWhere = {
    userId,
    ...(level !== undefined ? { level } : {}),
    ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
  };

  const [stats, best] = await Promise.all([
    this.prisma.matchResult.aggregate({
      where: filteredWhere,
      _avg: { wpm: true },
      _count: { id: true },
    }),
    this.prisma.matchResult.findFirst({
      where: { userId },           // SIN filtros — all-time
      orderBy: { wpm: 'desc' },
      select: { wpm: true },
    }),
  ]);

  return {
    avgScore: Math.round((stats._avg.wpm ?? 0) * 10) / 10,
    bestScore: best?.wpm ?? 0,
    totalMatches: stats._count.id,
  };
}

private periodToDateFrom(period?: MatchPeriod): Date | null {
  if (period === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (period === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return null;
}
```

### Pseudocódigo frontend — MatchHistorySection

```tsx
export function MatchHistorySection() {
  const [period, setPeriod] = useState<MatchPeriod>('all');
  const [level, setLevel] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Reset page cuando cambian filtros
  function handlePeriodChange(p: MatchPeriod) { setPeriod(p); setPage(1); }
  function handleLevelChange(l: number | null) { setLevel(l); setPage(1); }

  const { data: stats, isLoading: isStatsLoading } = useMatchStats({ level, period });
  const { data: history, isLoading: isHistoryLoading } = useMatchHistory({ page, level, period });

  const hasFilters = period !== 'all' || level !== null;
  const isEmpty = !isHistoryLoading && history?.data.length === 0;

  return (
    <div className="rounded-2xl bg-surface-sunken p-8">
      <h2>Historial de partidas</h2>

      {/* Stats row */}
      {/* Filter pills: period */}
      {/* Filter pills: level */}
      {/* Match list table */}
      {/* Pagination */}
    </div>
  );
}
```

### Convenciones visuales existentes (ProfilePage)

- Contenedor: `rounded-2xl bg-surface-sunken p-10` (tarjeta perfil) — usar `p-8` para la sección historial
- Texto principal: `text-text-main`; muted: `text-text-muted`; caption: `text-xs uppercase tracking-wide`
- Botón activo/primario: `bg-primary text-surface-base font-semibold rounded-lg`
- Elemento inactivo/raised: `bg-surface-raised text-text-muted rounded-lg`
- Font: siempre `font-sans`
- Sin bordes 1px (regla "No-Line" del proyecto)

### Nombres de nivel desde shared

```typescript
import { DIFFICULTY_LEVELS } from '@ultimatype-monorepo/shared';
// DIFFICULTY_LEVELS[0] = { level: 1, name: 'Minúscula', description: '...' }
// DIFFICULTY_LEVELS[4] = { level: 5, name: 'Símbolos', description: '...' }
```

### Aprendizajes de Story 4-1

- Los tests de unit del controller instancian el controller directamente sin NestJS routing (mock del service con `vi.fn()`)
- Para el controller spec de `/stats`, mockear `matchResultsService.getStats`
- El service spec mockea `prisma` directamente (ver `match-results.service.spec.ts` para el patrón)
- `MatchResultsController` importa `JwtAuthGuard` desde `'../auth/guards/jwt-auth.guard'` — verificar path relativo
- `PrismaService` es global, inyectable sin importar `PrismaModule`
- Usar `Promise.all` para queries paralelas en el service

### Regresiones a prevenir

- `getMyResults` del controller ya tiene lógica de clamp/default para `page` y `limit` — no romper al agregar level/period
- `findByUser` tiene el query select explícito — no añadir campos al select que no existan en `MatchResultRecord`
- El módulo `MatchResultsModule` ya está importado en `GameModule` — no modificar esa relación
- `ProfilePage` tiene test en `app.spec.tsx` (implícito) — el cambio de `max-w-md` a `max-w-2xl` no tiene tests directos sobre ese className

### Project Structure Notes

```
apps/api/src/modules/match-results/
├── match-results.controller.ts     ← modificar: agregar @Get('stats'), filtros en @Get()
├── match-results.service.ts        ← modificar: findByUser + getStats + periodToDateFrom
├── match-results.controller.spec.ts ← modificar: agregar tests para /stats y filtros
├── match-results.service.spec.ts   ← modificar: agregar tests para getStats y findByUser filtrado
└── (resto sin cambios)

apps/web/src/
├── hooks/
│   ├── use-match-history.ts        ← NUEVO
│   └── use-match-stats.ts          ← NUEVO
└── components/profile/
    ├── profile-page.tsx             ← modificar: max-w-2xl + MatchHistorySection
    ├── match-history-section.tsx    ← NUEVO
    └── match-history-section.spec.tsx ← NUEVO

libs/shared/src/dto/match-result.dto.ts ← modificar: MatchPeriod + MatchStatsDto
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2] — ACs originales
- [Source: _bmad-output/implementation-artifacts/4-1-match-results-persistence.md#Dev Notes] — patrones del service y controller establecidos en 4-1
- [Source: apps/api/src/modules/match-results/match-results.service.ts] — findByUser actual a extender
- [Source: apps/api/src/modules/match-results/match-results.controller.ts] — controller actual a extender
- [Source: apps/web/src/components/profile/profile-page.tsx] — componente a modificar
- [Source: apps/web/src/lib/api-client.ts] — apiClient para los hooks
- [Source: libs/shared/src/dto/match-result.dto.ts] — DTOs existentes a extender
- [Source: libs/shared/src/constants/difficulty-levels.ts] — DIFFICULTY_LEVELS para mostrar nombres de nivel
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats] — envelope pattern

---

### Review Findings (2026-04-02, post-PRD/epics update)

- [x] [Review][Patch] Tests rotos: labels 'WPM Promedio'/'Mejor WPM' → 'Puntaje Promedio'/'Mejor Puntaje' [match-history-section.spec.tsx:52-53] — **fixed**
- [x] [Review][Patch] Mock semántico incorrecto: `_avg: { wpm: null }` → `_avg: { score: null }` [match-results.service.spec.ts:346] — **fixed**
- [x] [Review][Patch] Tabla sin columna Score — agregada columna "Puntaje" como primera columna [match-history-section.tsx:130] — **fixed**
- [x] [Review][Patch] Label "Partidas" → "Total Partidas" per AC2 [match-history-section.tsx:55] — **fixed**
- [x] [Review][Patch] Loading placeholder `_` reemplazado por skeletons con animate-pulse [match-history-section.tsx:53-55,113] — **fixed**
- [x] [Review][Patch] Empty-state contextual: "en este nivel" / "en este período" / "con estos filtros" [match-history-section.tsx:119] — **fixed**
- [x] [Review][Patch] Error state con mensaje + botón reintentar cuando fetch falla [match-history-section.tsx:124-133] — **fixed**
- [x] [Review][Patch] Story ACs actualizados de WPM a Score para sincronizar con PRD/epics — **fixed**
- [x] [Review][Patch] Match detail: entradas clickeables → nueva vista /match/:matchCode con todos los participantes [match-detail-page.tsx] — **implemented**
- [x] [Review][Defer] Sin test HTTP-level de routing GET /matches/stats vs GET /matches — gap e2e pre-existente
- [x] [Review][Defer] Sin respuesta 400 para query params malformados — por convención del proyecto (defaults silenciosos)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (create-story + dev-story, 2026-04-02)

### Debug Log References

### Completion Notes List

- Implementados 9 tasks + 9 patches de review. 242 API tests + 125 web tests pasando (367 total, sin regresiones).
- `findByUser` extendido con params opcionales level/period (backward compatible).
- `getStats` usa score (no wpm): aggregate filtrado para avgScore/totalMatches, findFirst sin filtros para bestScore all-time (cumple AC2/AC3).
- Controller agrega helpers `parseLevelParam`/`parsePeriodParam` con validación estricta; `@Get('stats')` declarado antes de `@Get()`.
- `findByMatchCode` nuevo método con join a User para obtener participantes de una partida.
- `GET /matches/:matchCode` endpoint nuevo con NotFoundException si no existe.
- Frontend: 3 hooks TanStack Query, componente historial con 16 tests, componente detalle con 8 tests.
- Historial: columna Score agregada, skeletons en loading, error state con reintentar, filas clickeables, mensajes vacíos contextuales.
- Match detail: vista completa de partida con tabla de participantes (avatar, nombre, score, WPM, precisión, estado).
- ProfilePage ampliado a max-w-2xl para acomodar la sección de historial.
- Story ACs sincronizados con PRD/epics actualizados (WPM → Score).

### File List

- libs/shared/src/dto/match-result.dto.ts (modificado: MatchPeriod, MatchStatsDto, MatchDetailParticipantDto, MatchDetailDto)
- ultimatype-monorepo/apps/api/src/modules/match-results/match-results.service.ts (modificado: findByUser filtros, getStats score-based, findByMatchCode, periodToDateFrom)
- ultimatype-monorepo/apps/api/src/modules/match-results/match-results.controller.ts (modificado: @Get('stats'), filtros en @Get(), @Get(':matchCode'))
- ultimatype-monorepo/apps/api/src/modules/match-results/match-results.service.spec.ts (modificado: tests getStats, findByUser filtrado, findByMatchCode)
- ultimatype-monorepo/apps/api/src/modules/match-results/match-results.controller.spec.ts (modificado: tests getMyStats, nuevos params, getMatchDetail)
- ultimatype-monorepo/apps/web/src/hooks/use-match-history.ts (nuevo)
- ultimatype-monorepo/apps/web/src/hooks/use-match-stats.ts (nuevo)
- ultimatype-monorepo/apps/web/src/hooks/use-match-detail.ts (nuevo)
- ultimatype-monorepo/apps/web/src/components/profile/match-history-section.tsx (nuevo)
- ultimatype-monorepo/apps/web/src/components/profile/match-history-section.spec.tsx (nuevo)
- ultimatype-monorepo/apps/web/src/components/match/match-detail-page.tsx (nuevo)
- ultimatype-monorepo/apps/web/src/components/match/match-detail-page.spec.tsx (nuevo)
- ultimatype-monorepo/apps/web/src/components/profile/profile-page.tsx (modificado: max-w-2xl, MatchHistorySection)
- ultimatype-monorepo/apps/web/src/app/app.tsx (modificado: ruta /match/:matchCode)
