# Story 4.5: Automated Leaderboard Updates

Status: review

## Story

As the system,
I want to invalidate the relevant leaderboard cache automatically when a player sets a new personal best,
So that the rankings are always fresh without manual intervention and without rebuilding the full dataset on every match.

## Acceptance Criteria

### AC1: Invalidacion selectiva al superar marca personal

**Given** un resultado de partida recien persistido
**When** el nuevo score del jugador es estrictamente mayor que su mejor score previo para ese nivel
**Then** el backend elimina todas las cache keys de Redis que matcheen el patron `leaderboard:level:{level}:*` (afectando todas las combinaciones de country/period para ese nivel)
**And** tambien elimina `leaderboard:level:ALL:*` (la vista "Todos los niveles")
**And** la siguiente request al leaderboard para cualquiera de esas keys dispara un query fresco a Postgres y re-puebla la cache con un nuevo TTL de 12 horas
**And** si no se establece un nuevo record, la cache existente no se toca (cero invalidacion innecesaria)

### AC2: Invalidacion no-bloqueante y tolerante a fallos

**Given** la logica de invalidacion de cache
**When** el query a Postgres para obtener el mejor score previo falla O el Redis DEL falla
**Then** el resultado de la partida se persiste exitosamente igual (la invalidacion es no-bloqueante)
**And** el error se loguea con nivel `warn` incluyendo userId, level y razon
**And** el TTL fallback (12h) asegura que la cache eventualmente expire de todos modos

---

## Tasks / Subtasks

- [x] Task 1: Agregar metodo `invalidateForLevel` en `LeaderboardService` (AC: #1, #2)
  - [x] 1.1 Crear metodo `async invalidateForLevel(level: number): Promise<void>` en `leaderboard.service.ts`
  - [x] 1.2 Usar `this.redis.keys('leaderboard:level:${level}:*')` para obtener todas las keys del nivel afectado
  - [x] 1.3 Usar `this.redis.keys('leaderboard:level:ALL:*')` para obtener todas las keys de "Todos los niveles"
  - [x] 1.4 Si hay keys a eliminar, llamar `this.redis.del(...allKeys)`
  - [x] 1.5 Envolver TODO en try/catch — en caso de error, loguear `this.logger.warn(...)` con level y motivo. No lanzar excepcion
  - [x] 1.6 Loguear con `this.logger.log(...)` la cantidad de keys invalidadas cuando es exitoso

- [x] Task 2: Agregar metodo `checkAndInvalidateLeaderboard` en `MatchResultsService` (AC: #1, #2)
  - [x] 2.1 Inyectar `LeaderboardService` en `MatchResultsService` via constructor
  - [x] 2.2 Crear metodo privado `async checkAndInvalidateLeaderboard(userId: string, level: number, newScore: number): Promise<void>`
  - [x] 2.3 Consultar el mejor score previo del usuario para ese nivel
  - [x] 2.5 Implementado con NOT matchCode para excluir el record recien insertado
  - [x] 2.6 Si es nuevo personal best, llamar `this.leaderboardService.invalidateForLevel(level)`
  - [x] 2.7 Envolver TODO en try/catch — en caso de error, loguear `this.logger.warn(...)` con userId, level y motivo. No lanzar excepcion

- [x] Task 3: Integrar invalidacion en `persistResults` (AC: #1, #2)
  - [x] 3.1 Despues del loop de `Promise.allSettled`, recolectar los records que se persistieron exitosamente junto con su score
  - [x] 3.2 Para cada record persistido exitosamente, llamar checkAndInvalidateLeaderboard
  - [x] 3.3 Usar `Promise.allSettled` para las llamadas de invalidacion (no bloquear entre jugadores)
  - [x] 3.4 No modificar la firma de `persistResults` ni su contrato externo

- [x] Task 4: Actualizar `MatchResultsModule` para importar `LeaderboardModule` (AC: #1)
  - [x] 4.1 En `match-results.module.ts`, agregar `imports: [LeaderboardModule]`
  - [x] 4.2 Verificar que no se crea dependencia circular: MatchResultsModule -> LeaderboardModule es unidireccional

- [x] Task 5: Tests unitarios para `invalidateForLevel` en `LeaderboardService` (AC: #1, #2)
  - [x] 5.1 Test: keys encontradas para nivel especifico y ALL — se eliminan correctamente
  - [x] 5.2 Test: no hay keys que matcheen — no se llama `redis.del`
  - [x] 5.3 Test: `redis.keys` falla — no lanza excepcion
  - [x] 5.4 Test: `redis.del` falla — no lanza excepcion
  - [x] 5.5 Agregar `keys` y `del` al mock de Redis en `leaderboard.service.spec.ts`

- [x] Task 6: Tests unitarios para invalidacion en `MatchResultsService` (AC: #1, #2)
  - [x] 6.1 Agregar mock de `LeaderboardService` (`invalidateForLevel: vi.fn()`) en `match-results.service.spec.ts`
  - [x] 6.2 Test: nuevo personal best (score > previo) — llama `invalidateForLevel(level)`
  - [x] 6.3 Test: score igual o menor al previo — NO llama `invalidateForLevel`
  - [x] 6.4 Test: primera partida del usuario en ese nivel (sin score previo) — llama `invalidateForLevel`
  - [x] 6.5 Test: error en query de best score previo — no lanza excepcion, resultado se persiste normalmente
  - [x] 6.6 Test: multiples jugadores, solo uno con nuevo PB — `invalidateForLevel` se llama exactamente 1 vez

- [x] Task 7: Verificar regresion completa (AC: #1, #2)
  - [x] 7.1 Ejecutar `npx nx test api` — 300 tests passing (290 existentes + 10 nuevos)
  - [x] 7.2 Ejecutar `npx nx test web` — 164 tests passing, cero regresion
  - [x] 7.3 Ejecutar `npx nx lint api` — sin errores nuevos (2 errores pre-existentes en integration.spec.ts)

---

## Dev Notes

### Contexto clave: la cache actual y su estructura

El `LeaderboardService` (leaderboard.service.ts:10) usa un TTL de 43200 segundos (12 horas). El formato de cache key es:

```
leaderboard:level:{level|ALL}:country:{country|ALL}:period:{period|all}:page:{page}:limit:{limit}
```

Metodo `buildCacheKey` en linea 248-257 de `leaderboard.service.ts`.

La cache se setea despues de un query exitoso (linea 118-122) y se lee antes del query (linea 49-50). Si Redis falla, el servicio degrada gracefully (ya implementado).

### RedisService.keys() usa SCAN internamente

`RedisService.keys(pattern)` (redis.service.ts:49-58) ya implementa cursor-based SCAN con COUNT 100. Es seguro usarlo en produccion — no bloquea Redis como el comando KEYS nativo. Devuelve `string[]`.

### Punto de integracion: `persistResults` en MatchResultsService

El metodo `persistResults` (match-results.service.ts:31-126) es fire-and-forget desde el gateway (game.gateway.ts linea ~1134). Recibe `matchCode`, `level`, `results[]`. Actualmente:

1. Filtra guests (verifica userIds en tabla users)
2. Sanitiza datos numericos
3. Inserta individualmente con `Promise.allSettled`
4. Loguea resultado

La invalidacion debe ir DESPUES del paso 3, usando los records que se insertaron exitosamente.

### Inyeccion de dependencia: sin circularidad

`MatchResultsModule` necesita importar `LeaderboardModule` para acceder a `LeaderboardService`. No hay circularidad:
- `LeaderboardModule` exporta `LeaderboardService` y NO importa `MatchResultsModule`
- `MatchResultsModule` actualmente no importa nada (solo tiene providers y controllers)
- El `GameModule` (gateway) ya importa ambos modulos separadamente

### Estrategia de deteccion de nuevo personal best

Despues de insertar el record nuevo, consultar el mejor score del usuario para ese nivel EXCLUYENDO el matchCode actual:

```typescript
const previousBest = await this.prisma.matchResult.findFirst({
  where: { userId, level, NOT: { matchCode: currentMatchCode } },
  orderBy: { score: 'desc' },
  select: { score: true },
});
// Si previousBest es null (primera partida en nivel) o newScore > previousBest.score → invalidar
```

NOTA: No excluir por matchCode sino por el record actual podria ser problematico si el mismo usuario tiene multiples records en la misma partida (no deberia pasar, pero es mas seguro excluir por matchCode).

Alternativa aun mas simple: no pasar matchCode, solo comparar contra el MAX score. Si el score recien insertado ES el max, es PB. Pero esto requiere que el query incluya el record recien insertado, lo cual ya lo hace porque el insert ya ocurrio.

```typescript
const best = await this.prisma.matchResult.aggregate({
  where: { userId, level },
  _max: { score: true },
  _count: { id: true },
});
// Si best._count.id === 1 (primera partida) o newScore >= best._max.score → invalidar
// Usar >= porque el record recien insertado ya esta incluido
```

**Elegir la alternativa que resulte mas clara.** Ambas son correctas.

### Patron de invalidacion por SCAN + DEL

```typescript
async invalidateForLevel(level: number): Promise<void> {
  try {
    const levelKeys = await this.redis.keys(`leaderboard:level:${level}:*`);
    const allKeys = await this.redis.keys(`leaderboard:level:ALL:*`);
    const keysToDelete = [...levelKeys, ...allKeys];

    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
      this.logger.log(`Leaderboard cache invalidated: ${keysToDelete.length} keys deleted for level ${level}`);
    }
  } catch (error) {
    this.logger.warn(`Failed to invalidate leaderboard cache for level ${level}: ${(error as Error).message}`);
  }
}
```

### Regresiones a prevenir

- **NO tocar** el frontend — esta story es 100% backend
- **NO tocar** `leaderboard.controller.ts` — los endpoints no cambian
- **NO modificar** la firma publica de `persistResults` — el gateway lo llama fire-and-forget sin cambios
- **NO tocar** `getUserPosition` — no esta cacheado, no necesita invalidacion
- Los tests existentes de `LeaderboardService` (10 tests) y `MatchResultsService` (~15 tests) deben seguir pasando
- `createMockRedis()` en `leaderboard.service.spec.ts` necesita `keys` y `del` en el mock

### Aprendizajes de Stories 4.1-4.4

- Fire-and-forget pattern: `persistResults` se llama sin await desde el gateway — la invalidacion tambien debe ser no-bloqueante dentro de ese flujo
- Graceful degradation: Redis failures no deben afectar la persistencia de resultados (ya implementado en `getLeaderboard`)
- Testing: `vi.fn()` + `mockResolvedValue` para mocks de Prisma y Redis. Tests unitarios puros sin integracion real de DB/Redis
- Promise.allSettled para operaciones independientes que no deben fallar en cadena

### Project Structure Notes

Archivos a modificar (4) y ninguno nuevo:

```
apps/api/src/
├── modules/
│   ├── leaderboard/
│   │   ├── leaderboard.service.ts        <- MODIFICAR: agregar invalidateForLevel()
│   │   └── leaderboard.service.spec.ts   <- MODIFICAR: agregar tests de invalidation
│   └── match-results/
│       ├── match-results.service.ts      <- MODIFICAR: agregar checkAndInvalidateLeaderboard(), integrar en persistResults
│       ├── match-results.service.spec.ts <- MODIFICAR: agregar tests de invalidation trigger
│       └── match-results.module.ts       <- MODIFICAR: agregar imports: [LeaderboardModule]
```

**Cero cambios en el frontend. Cero nuevos archivos.**

### References

- [Source: apps/api/src/modules/leaderboard/leaderboard.service.ts] — servicio con cache, buildCacheKey, CACHE_TTL
- [Source: apps/api/src/modules/leaderboard/leaderboard.service.spec.ts] — 10 tests existentes, mock pattern
- [Source: apps/api/src/modules/match-results/match-results.service.ts] — persistResults, punto de integracion
- [Source: apps/api/src/modules/match-results/match-results.service.spec.ts] — tests existentes, mock pattern
- [Source: apps/api/src/modules/match-results/match-results.module.ts] — modulo a modificar
- [Source: apps/api/src/modules/leaderboard/leaderboard.module.ts] — exporta LeaderboardService
- [Source: apps/api/src/redis/redis.service.ts] — keys() con SCAN, del(), set(), get()
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.5] — ACs originales
- [Source: _bmad-output/implementation-artifacts/4-4-leaderboard-filtering-level-country-period.md] — story previa, patrones

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (create-story + dev-story, 2026-04-04)

### Debug Log References

### Completion Notes List

- Story 100% backend — cero cambios en el frontend.
- `LeaderboardService.invalidateForLevel(level)` agregado: usa SCAN para encontrar keys `leaderboard:level:{level}:*` y `leaderboard:level:ALL:*`, luego DEL. Try/catch con warn log en fallo.
- `MatchResultsService.checkAndInvalidateLeaderboard(userId, level, newScore, matchCode)` agregado como metodo privado: consulta mejor score previo excluyendo matchCode actual. Si es PB (null o score mayor), llama invalidateForLevel.
- Integracion en `persistResults`: despues de insertar records exitosamente, recolecta los persistidos y llama checkAndInvalidateLeaderboard para cada uno via Promise.allSettled.
- `MatchResultsModule` actualizado con `imports: [LeaderboardModule]` para DI de LeaderboardService.
- Tests: 300 API tests passing (290 existentes + 4 invalidateForLevel + 6 cache invalidation en match-results). 164 web tests sin regresion.
- Lint: sin errores nuevos introducidos.

### Change Log

- 2026-04-04: Story 4-5 implemented — automated leaderboard cache invalidation on new personal best

### File List

- apps/api/src/modules/leaderboard/leaderboard.service.ts (modificado: agregar invalidateForLevel)
- apps/api/src/modules/leaderboard/leaderboard.service.spec.ts (modificado: agregar 4 tests de invalidateForLevel, keys/del al mock de Redis)
- apps/api/src/modules/match-results/match-results.service.ts (modificado: inyectar LeaderboardService, agregar checkAndInvalidateLeaderboard, integrar en persistResults)
- apps/api/src/modules/match-results/match-results.service.spec.ts (modificado: agregar mock de LeaderboardService, 6 tests de cache invalidation)
- apps/api/src/modules/match-results/match-results.module.ts (modificado: agregar imports: [LeaderboardModule])
