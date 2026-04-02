# Story 4.1: Match Results Persistence

Status: done

## Story

As a player,
I want my match results to be saved securely after every race,
so that my historical performance is properly recorded in the database.

## Context

Primera story de Epic 4 (Global Progression & Rankings). Actualmente los resultados de partida se calculan en `endMatch()` del gateway, se emiten por WebSocket como `match:end`, y se borran de Redis. No existe persistencia — esta story agrega el esquema Prisma, la migración, el servicio de persistencia, y los integration tests contra PostgreSQL real.

**Decisiones técnicas de la retro Epic 3:**
- Persistencia desde el gateway: event emitter interno (recomendado por Winston) para desacoplar el gateway del servicio de persistencia
- Integration tests contra PostgreSQL real (no mocks) — es el riesgo real de Epic 4
- Deploy de migraciones ya resuelto: `entrypoint.sh` ejecuta `prisma migrate deploy` automáticamente

---

## Acceptance Criteria (BDD)

### AC1: Modelo MatchResult en Prisma

**Given** el schema Prisma actual (solo modelos User y Text)
**When** se ejecuta la migración
**Then** se crea la tabla `match_results` con columnas: id (UUID PK), matchCode (string), userId (FK → users), wpm (float), precision (int 0-100), score (float), missingChars (int), level (int), finished (boolean), finishedAt (timestamp nullable), rank (int), createdAt (timestamp default now)
**And** existe un índice compuesto en `(userId, createdAt)` para queries de historial personal
**And** existe un índice compuesto en `(level, createdAt)` para queries de leaderboard
**And** existe un índice en `(userId, level, createdAt)` para filtros combinados
**And** la relación User ↔ MatchResult es 1:N con cascade delete

### AC2: Persistencia al finalizar partida

**Given** una partida activa con jugadores que terminan o se agota el timeout
**When** `endMatch()` calcula los resultados finales (`calculateResults()`)
**Then** el sistema persiste un registro `MatchResult` por cada jugador (no espectadores) antes de hacer cleanup de Redis
**And** los campos WPM, precision, score, rank, missingChars, finished, finishedAt, level coinciden exactamente con los valores del `PlayerResult` calculado
**And** el matchCode corresponde al código de la sala
**And** el userId corresponde al id del jugador en la tabla users

### AC3: Usuarios guest no se persisten

**Given** una partida con jugadores guest (no autenticados, sin registro en la tabla users)
**When** se persisten los resultados
**Then** solo se guardan resultados de jugadores con userId válido en la tabla users
**And** los resultados de guests se omiten silenciosamente (sin error)

### AC4: Fallo de persistencia no bloquea el flujo de juego

**Given** una partida que termina correctamente
**When** la persistencia a PostgreSQL falla (ej: DB caída, constraint violation)
**Then** el evento `match:end` se emite normalmente a los clientes con los resultados
**And** el error se loguea con nivel `error` incluyendo matchCode y motivo
**And** el cleanup de Redis procede normalmente
**And** los jugadores no perciben ningún problema

### AC5: Endpoint REST para consultar resultados de un usuario

**Given** un usuario autenticado
**When** hace `GET /api/matches?page=1&limit=20`
**Then** recibe sus resultados paginados ordenados por `createdAt` DESC
**And** el response sigue el formato envelope: `{ data: MatchResult[], meta: { total, page, limit, totalPages } }`
**And** solo puede ver sus propios resultados (filtro por JWT userId)

### AC6: Integration tests contra PostgreSQL real

**Given** el entorno de test con Docker PostgreSQL
**When** se ejecutan los tests de integración del servicio de persistencia
**Then** validan: creación de registros, paginación, filtro por usuario, cascade delete con usuario, manejo de matchCode duplicado (múltiples resultados por partida), manejo de userId inexistente (FK violation graceful)

---

## Edge Cases a Considerar

1. **Partida con un solo jugador** — debe persistir igualmente con rank=1
2. **Timeout con 0 keystrokes** — jugador con wpm=0, precision=0, score=0, finished=false debe persistirse
3. **Jugador desconectado que no terminó** — se incluye en results con finished=false; debe persistirse
4. **Partida con mezcla de guests y registrados** — solo registrados se persisten
5. **matchCode colisión** — múltiples MatchResult con el mismo matchCode es correcto (uno por jugador)
6. **Usuario eliminado después** — cascade delete borra sus MatchResults (AC1)
7. **Persistencia parcial** — si falla a mitad de un batch, los que se guardaron quedan; loguear cuáles fallaron
8. **Concurrencia en endMatch** — ya protegido por lock atómico existente, pero la persistencia debe ser idempotente (no duplicar si se llama dos veces)

---

## Tasks / Subtasks

- [x] Task 1: Schema Prisma y migración (AC: #1)
  - [x] Agregar modelo `MatchResult` a `schema.prisma`
  - [x] Relación `User` 1:N `MatchResult` con `onDelete: Cascade`
  - [x] Índices compuestos para historial y leaderboard
  - [x] Ejecutar `npx prisma migrate dev` y `npx prisma generate`

- [x] Task 2: MatchResultsService (AC: #2, #3, #4)
  - [x] Crear módulo `match-results` en `apps/api/src/modules/match-results/`
  - [x] `MatchResultsService` con método `persistResults(matchCode, level, results)` — simplificado: filtra guests con query a users table en vez de Map externo
  - [x] Filtrar guests (sin userId válido en DB) — via findMany + Set de IDs válidos
  - [x] Usar `prisma.matchResult.createMany()` para batch insert
  - [x] Wrap en try/catch — loguea error, no lanza excepción
  - [x] Inyectar en `GameGateway` vía `MatchResultsModule` importado en `GameModule`

- [x] Task 3: Integración en el gateway (AC: #2, #4)
  - [x] En `endMatch()`, después de `calculateResults()` y ANTES de `cleanupMatch()`
  - [x] Llamar `matchResultsService.persistResults()` con fire-and-forget (.catch() sin await)
  - [x] Pasar el level desde `roomState.level`
  - [x] playerId === userId directamente (JWT sub = DB UUID para auth users, guestId para guests; filtrado en service)

- [x] Task 4: Endpoint REST de consulta (AC: #5)
  - [x] `MatchResultsController` con `GET /api/matches` protegido por `JwtAuthGuard`
  - [x] Query params: `page` (default 1), `limit` (default 20, max 100)
  - [x] Response envelope `{ data, meta: { total, page, limit, totalPages } }`
  - [x] Filtro automático por userId del JWT

- [x] Task 5: DTOs compartidos (AC: #5)
  - [x] Agregar `MatchResultDto` en `libs/shared/src/dto/match-result.dto.ts`
  - [x] Agregar `PaginatedResponse<T>` y `PaginatedMeta` en `libs/shared/src/dto/match-result.dto.ts`

- [x] Task 6: Tests (AC: #6)
  - [x] Tests de `MatchResultsService`: persistencia, filtrado guests, error handling, paginación, edge cases
  - [x] Tests de `MatchResultsController`: auth guard params, pagination, default values, clamping, null handling
  - [x] Fix de `game.gateway.spec.ts` para inyectar nuevo servicio

### Review Findings

- [x] [Review][Decision→Patch] AC6: Integration tests contra PostgreSQL real — 7 tests implementados: creación, paginación, filtro por usuario, cascade delete, idempotencia, FK violation graceful
- [x] [Review][Decision→Patch] createMany → inserts individuales con Promise.allSettled — persistencia parcial con logging por record
- [x] [Review][Patch] @@unique([matchCode, userId]) para idempotencia — migración aplicada
- [x] [Review][Patch] Corregir tipo de retorno findByUser — MatchResultRecord interface, dot notation en controller
- [x] [Review][Patch] Warning log cuando roomState null en endMatch
- [x] [Review][Patch] Remover .catch muerto del gateway
- [x] [Review][Patch] Guards NaN/undefined + logger.warn en PlayerResult
- [x] [Review][Patch] Validar finishedAt + warn si inválido
- [x] [Review][Patch] Assertion persistResults en gateway spec
- [x] [Review][Patch] Bajar max limit de 100 a 20 en paginación
- [x] [Review][Patch] try/finally en endMatch para garantizar emit de match:end
- [x] [Review][Dismiss] Ruta 'matches' — se mantiene, partidas en curso se filtrarán por status
- [x] [Review][Dismiss] Sin constraints DB-level — filosofía del proyecto es validar en app
- [x] [Review][Defer] Sin campo updatedAt en MatchResult — match results son inmutables
- [x] [Review][Defer] Controller spec no ejercita JwtAuthGuard — patrón estándar NestJS unit tests
- [x] [Review][Defer] matchCode sin índice standalone — agregar cuando se implemente vista por partida
- [x] [Review][Defer] Sin rate-limiting específico — throttle global cubre; revisar para leaderboard endpoints

---

## Dev Notes

### Arquitectura y patrones

- **Módulo NestJS vertical**: crear `apps/api/src/modules/match-results/` con `match-results.module.ts`, `match-results.service.ts`, `match-results.controller.ts`
- **Naming**: archivos en `kebab-case`, tabla PostgreSQL `match_results` (snake_case), modelo Prisma `MatchResult` (PascalCase), campos TypeScript `camelCase`
- **Inyección en gateway**: `MatchResultsModule` debe exportar `MatchResultsService`, e importarse en el módulo que provee `GameGateway` (verificar `AppModule` o el módulo del gateway)
- **Patrón fire-and-forget**: la persistencia NO debe bloquear el emit de `match:end`. Opciones: (a) `persistResults().catch(logger.error)` sin await, o (b) NestJS EventEmitter — la retro recomendó event emitter pero para una V1 simple, fire-and-forget con catch es suficiente y más directo. Si se usa EventEmitter, crear un listener en `MatchResultsService`
- **PrismaService** es global — ya inyectable en cualquier módulo sin re-importar `PrismaModule`

### Mapeo playerId → userId

El gateway usa `socket.data.user` que contiene `{ id, displayName, ... }` del JWT. El `id` ahí es el UUID de la tabla `users`. El `PlayerResult.playerId` que viene de `calculateResults()` es el `odolId` del socket. Hay que mapear usando la info de room players (`room:{code}:players` hash en Redis) que tiene el `id` real del user.

**Verificar**: en el hash `room:{code}:players`, cada entrada tiene un campo `id` que es el userId de la DB. Usar eso para el mapeo.

### Punto de inyección en endMatch()

```
// Flujo actual en game.gateway.ts endMatch():
1. setRoomStatusAtomically() — lock
2. getRoomState() + getPlayersInfo() — fetch data
3. calculateResults() — compute results
4. cleanupMatch() — delete Redis state
5. emit('match:end', results) — broadcast

// Flujo con persistencia:
1. setRoomStatusAtomically() — lock
2. getRoomState() + getPlayersInfo() — fetch data
3. calculateResults() — compute results
4. persistResults() — NEW: fire-and-forget to PostgreSQL
5. cleanupMatch() — delete Redis state
6. emit('match:end', results) — broadcast
```

### Schema Prisma propuesto

```prisma
model MatchResult {
  id          String    @id @default(uuid())
  matchCode   String    @map("match_code")
  userId      String    @map("user_id")
  wpm         Float
  precision   Int
  score       Float
  missingChars Int      @map("missing_chars")
  level       Int
  finished    Boolean
  finishedAt  DateTime? @map("finished_at")
  rank        Int
  createdAt   DateTime  @default(now()) @map("created_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([level, createdAt])
  @@index([userId, level, createdAt])
  @@map("match_results")
}
```

Y en el modelo User agregar: `matchResults MatchResult[]`

### Testing

- **Integration tests**: usar una base de datos de test real (misma instancia Docker, database diferente o la misma con cleanup entre tests)
- **Prisma test setup**: ejecutar `prisma migrate deploy` contra la DB de test antes de correr tests, o usar `prisma db push` para sync rápido
- **Cleanup**: truncar tablas entre tests o usar transacciones rollback
- **Unit tests del controller**: mockear `MatchResultsService` para testear auth guard y pagination logic

### Convenciones de API Response

Seguir el patrón de la arquitectura:
```json
{
  "data": [{ "id": "...", "matchCode": "...", "wpm": 85.5, ... }],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### Project Structure Notes

- Alineado con la estructura vertical por dominio de NestJS
- Nuevo módulo `match-results` paralelo a `matches` (que maneja estado en Redis)
- `matches` = estado efímero en Redis durante partida; `match-results` = persistencia post-partida en PostgreSQL
- Shared DTOs van en `libs/shared/src/dto/match-result.dto.ts` (ya existe `match-result.dto.ts` con `PlayerResult` — extender o crear archivo separado)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1] — AC original
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — PostgreSQL + Prisma patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — snake_case tables, camelCase TS
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats] — envelope pattern
- [Source: _bmad-output/implementation-artifacts/epic-3-retro-2026-04-01.md#Decisiones para Epic 4] — event emitter, integration tests, agent model
- [Source: ultimatype-monorepo/apps/api/src/gateway/game.gateway.ts#endMatch()] — punto de inyección
- [Source: ultimatype-monorepo/apps/api/src/modules/matches/match-state.service.ts#calculateResults()] — cálculo de resultados
- [Source: ultimatype-monorepo/libs/shared/src/dto/match-result.dto.ts] — PlayerResult, MatchEndPayload existentes

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- Modelo `MatchResult` creado en Prisma con 3 índices compuestos, relación cascade con User, migración aplicada exitosamente
- `MatchResultsService` filtra guests automáticamente consultando la tabla users (single query), elimina la necesidad de pasar un Map externo
- Persistencia integrada en `endMatch()` como fire-and-forget (`.catch()` sin await) — no bloquea emisión de `match:end`
- `PrismaService` extendido con getter `matchResult` siguiendo el patrón existente de `user` y `text`
- Controller con paginación, clamping de parámetros, y formato envelope estándar
- DTOs compartidos (`MatchResultDto`, `PaginatedResponse<T>`, `PaginatedMeta`) en shared library
- Decisión: `PlayerResult.playerId` === `socket.data.user.sub` === DB UUID para auth users. No se necesitó mapeo adicional.
- 209 API tests passing (19 nuevos: 10 service + 9 controller), 101 web tests passing, 0 regresiones

### Change Log

- 2026-04-02: Story 4-1 implementada — schema, servicio, controller, gateway integration, tests

### File List

- `ultimatype-monorepo/prisma/schema.prisma` — Agregado modelo MatchResult con relación User, 3 índices
- `ultimatype-monorepo/prisma/migrations/20260402175938_add_match_results/migration.sql` — Migración SQL generada
- `ultimatype-monorepo/apps/api/src/prisma/prisma.service.ts` — Agregado getter `matchResult`
- `ultimatype-monorepo/apps/api/src/modules/match-results/match-results.module.ts` — NUEVO: módulo NestJS
- `ultimatype-monorepo/apps/api/src/modules/match-results/match-results.service.ts` — NUEVO: persistencia y consulta
- `ultimatype-monorepo/apps/api/src/modules/match-results/match-results.controller.ts` — NUEVO: GET /api/matches
- `ultimatype-monorepo/apps/api/src/modules/match-results/match-results.service.spec.ts` — NUEVO: 10 tests
- `ultimatype-monorepo/apps/api/src/modules/match-results/match-results.controller.spec.ts` — NUEVO: 9 tests
- `ultimatype-monorepo/apps/api/src/gateway/game.module.ts` — Agregado import MatchResultsModule
- `ultimatype-monorepo/apps/api/src/gateway/game.gateway.ts` — Agregado import, constructor injection, persistResults() en endMatch()
- `ultimatype-monorepo/apps/api/src/gateway/game.gateway.spec.ts` — Agregado mock de MatchResultsService
- `ultimatype-monorepo/libs/shared/src/dto/match-result.dto.ts` — Agregados MatchResultDto, PaginatedMeta, PaginatedResponse
