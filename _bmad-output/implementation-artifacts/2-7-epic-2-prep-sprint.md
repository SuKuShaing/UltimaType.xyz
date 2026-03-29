# Story 2.7: Epic 2 Prep Sprint — Deuda Tecnica y Hardening

Status: done

## Story

As the development team,
We want to resolve critical technical debt from Epic 2 and harden the platform against attacks,
So that Epic 3 (Spectator Experience) builds on a solid, secure foundation.

## Context

This story was created during the Epic 2 retrospective (2026-03-28). It consolidates all action items identified during the review of 29 deferred items. Only items requiring actual changes are included — 21 items were analyzed and deliberately left as-is.

## Acceptance Criteria (BDD)

### AC1: Atomic endMatch via Lua script (Critico #1)

**Given** multiple concurrent paths can trigger `endMatch()` (all_finished, timeout, checkMatchEndAfterDisconnect)
**When** two paths race to end the same match
**Then** only the first one succeeds, using an atomic Lua script `set-status-if-playing` that checks and sets room status in a single Redis operation
**And** the second caller receives `nil` and aborts without emitting `MATCH_END`

**Implementation:**
- Create Lua script in `RoomsService`: `HGET status` → if `playing` then `HSET status finished` → return `ok`, else return `nil`
- Replace `getRoomState` + `setRoomStatus` guard in `game.gateway.ts:endMatch()` with the new atomic method
- `endMatch` aborts if the atomic call returns null
- Room state for `playerInfoMap` must be fetched separately after acquiring the "lock"

**Files:** `rooms.service.ts`, `game.gateway.ts`

---

### AC2: Remove server-side finish detection from CARET_UPDATE (Patch 2-5.1)

**Given** the `CARET_UPDATE` handler detects player finish and calls `handlePlayerFinishInternal(roomCode, userId, 0, 0)`
**When** this path triggers, it passes zero keystrokes causing precision to always be 100%
**Then** remove lines `game.gateway.ts:372-384` (the `textLength` check and `handlePlayerFinishInternal` call from `handleCaretUpdate`)
**And** rely solely on the client emitting `PLAYER_FINISH` with real keystroke data
**And** the 5-minute match timeout serves as safety net if the client fails to emit

**Files:** `game.gateway.ts`

---

### AC3: Score clamped to 0 + "Faltantes" column in results (Patch 2-5.5)

**Given** a player who did not finish the text (DNF)
**When** match results are calculated and displayed
**Then** the server clamps `score` to `Math.max(score, 0)` — never negative
**And** the server includes `missingChars` in the `PlayerResult` payload
**And** the results table shows ALL players with real WPM, real precision, and real score (no more `—` or `DNF` text)
**And** a new column "Faltantes" shows the number of missing characters (0 for players who finished)
**And** the local player's large stats block shows real WPM, real precision, clamped score, and "X caracteres faltantes" if > 0

**Implementation — Server (`match-state.service.ts:calculateResults`):**
- Change: `const score = Math.max(trunc2(wpm * 10 * precisionDecimal - missingChars * 2), 0);`
- Add `missingChars` to the returned `PlayerResult` object

**Implementation — Shared (`libs/shared`):**
- Add `missingChars: number` to `PlayerResult` interface

**Implementation — Client (`match-results-overlay.tsx`):**
- Remove ternaries `r.finished ? r.wpm : '—'` and `r.finished ? r.score : 'DNF'`
- Always show `r.wpm`, `r.precision`, `r.score`
- Add column header "Faltantes" between "Prec." and "Puntos"
- Show `r.missingChars` in that column (0 for finished players)
- In the large local stats block: show WPM and precision always, show "X caracteres faltantes" if `missingChars > 0`

**Files:** `match-state.service.ts`, `libs/shared` (PlayerResult), `match-results-overlay.tsx`

---

### AC4: Guard for NaN/undefined startTime in calculateResults (Patch 2-5.6)

**Given** a corrupted or missing `startedAt` value in Redis match data
**When** `calculateResults` processes a player
**Then** it skips that player with a warning log instead of producing NaN values

**Implementation:**
- In the `for` loop of `calculateResults`, add: `if (!startTime) { this.logger.warn(...); continue; }`

**Files:** `match-state.service.ts`

---

### AC5: Rate limiting — Cloudflare + @nestjs/throttler + WebSocket guards (Moderado #8)

**Given** the hackathon is worldwide and previous editions had attacks targeting participants
**When** the platform is deployed
**Then** three layers of defense are active:

**Layer 1 — Cloudflare (config only, no code):**
- DNS proxy mode enabled (orange cloud)
- Rate limiting rule: `/api/auth/*` → max 30 requests/minute per IP
- Rate limiting rule: `/api/*` → max 200 requests/minute per IP
- Security Level: Medium
- "Under Attack Mode" available for manual activation during active attacks
- Document: `TRUST_PROXY=true` must be set so NestJS reads `CF-Connecting-IP` / `X-Forwarded-For`

**Layer 2 — @nestjs/throttler (code):**
- Install `@nestjs/throttler`
- Global throttle: 120 requests/minute per IP
- `/auth/refresh`, `/auth/code`: 10 requests/minute per IP
- `/rooms` POST: 5 requests/minute per IP
- Configure to read real IP from proxy headers (Cloudflare)

**Layer 3 — WebSocket guards (code):**
- Max 3 simultaneous WebSocket connections per userId
- Max 2 rooms created per userId
- Server-side throttle on `CARET_UPDATE`: drop if > 25 events/second per socket (client sends at 20Hz, 25% margin)

**Adjusted limits rationale:** Accommodate shared IPs (university, office, cafe). 20 users behind same IP should not be affected. Limits are per-IP for HTTP layers and per-userId for WebSocket layer.

**Files:** `package.json` (new dep), `app.module.ts`, `game.gateway.ts`, new throttler config, Cloudflare dashboard (manual)

---

### AC6: onModuleDestroy for timer cleanup (Moderado #10)

**Given** the NestJS server is shutting down (SIGTERM/SIGINT) or hot-reloading in development
**When** `onModuleDestroy` is called on the gateway
**Then** all `matchTimeouts` and `graceTimers` are cleared via `clearTimeout`
**And** both Maps are emptied
**And** a warning is logged if there are active connections at shutdown time
**And** NO Redis state is modified (matches remain in their current status so players can reconnect after restart)

**Implementation:**
- Add `OnModuleDestroy` to `GameGateway` implements clause
- Implement `onModuleDestroy()` that clears all timers and logs active connections
- Do NOT mark matches as finished in Redis — this would destroy active matches during production deploys

**Files:** `game.gateway.ts`

---

### AC7: Update deferred-work.md (housekeeping)

**Given** the retrospective identified that many deferred items were already resolved but not updated in tracking
**When** this story is completed
**Then** `deferred-work.md` is updated to mark resolved items:
- Critico #3 (`getPlayers` JSON.parse) — resolved in Story 2-6
- Critico #4 (`markPlayerFinished` atomicity) — resolved in Story 2-6 via Lua script
- Patches 2-5.3, 2-5.4, 2-5.7, 2-5.8, 2-5.10, 2-5.11, 2-5.12 — resolved in code
- Item #19 (desempate ranking) — resolved, `finishedAt` tiebreaker exists
**And** a note is added for Moderado #7: "When scaling to multiple instances, implement refresh token rotation with Redis blacklist (Option B from Epic 2 retro)"

**Files:** `deferred-work.md`

---

## Technical Notes

- The Lua script pattern for atomic Redis operations is already established in the project (anti-cheat in `UPDATE_POSITION_LUA`, finish marking in `MARK_PLAYER_FINISHED_LUA`). AC1 follows the same pattern.
- AC2 (removing CARET_UPDATE finish detection) also eliminates 2 Redis calls from the hot path (`getTextLength` + `isPlayerFinished`), indirectly improving Moderado #6.
- AC5 Layer 1 (Cloudflare) is configuration only — document the settings but the actual config is done in the Cloudflare dashboard, not in code.
- AC6 must NOT touch Redis on shutdown. Players reconnect after server restart and resume matches from Redis state.
- Reminder: `NODE_ENV=production` must be set in Dokploy/Docker production environment variables.

## Dev Checklist

- [x] AC1: Create `setRoomStatusAtomically` Lua script in RoomsService
- [x] AC1: Refactor `endMatch()` to use atomic status transition
- [x] AC1: Add tests for concurrent endMatch scenarios
- [x] AC2: Remove finish detection from `handleCaretUpdate`
- [x] AC2: Verify client-only finish path works correctly
- [x] AC3: Clamp score to 0 in `calculateResults`
- [x] AC3: Add `missingChars` to `PlayerResult` in shared lib
- [x] AC3: Update `match-results-overlay.tsx` with new column and remove finished ternaries
- [x] AC3: Update large local stats block for DNF display
- [x] AC4: Add startTime null guard in `calculateResults`
- [x] AC5: Install and configure `@nestjs/throttler`
- [x] AC5: Implement WebSocket connection limit per userId
- [x] AC5: Implement room creation limit per userId
- [x] AC5: Implement server-side CARET_UPDATE throttle per socket
- [x] AC5: Document Cloudflare configuration settings
- [x] AC5: Verify trust proxy + real IP resolution with Cloudflare headers
- [x] AC6: Implement `onModuleDestroy` in GameGateway (timers only, no Redis)
- [x] AC7: Update deferred-work.md with resolved items
- [x] All existing tests pass (173 API + 83 web)
- [x] New tests for AC1, AC3, AC5 throttling, AC6 cleanup

## File List

- `ultimatype-monorepo/apps/api/src/modules/rooms/rooms.service.ts` — Added `SET_STATUS_IF_PLAYING_LUA` and `setRoomStatusAtomically()`
- `ultimatype-monorepo/apps/api/src/gateway/game.gateway.ts` — Refactored `endMatch()` to use atomic Lua, removed CARET_UPDATE finish detection, added `onModuleDestroy`, WS connection limit, caret throttle
- `ultimatype-monorepo/apps/api/src/modules/matches/match-state.service.ts` — Clamped score to 0, added `missingChars` to results, added startTime null guard
- `ultimatype-monorepo/libs/shared/src/dto/match-result.dto.ts` — Added `missingChars: number` to `PlayerResult`
- `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx` — Added "Faltantes" column, removed DNF ternaries, added missing chars in local stats
- `ultimatype-monorepo/apps/api/src/app/app.module.ts` — Added `ThrottlerModule` and global `ThrottlerGuard`
- `ultimatype-monorepo/apps/api/src/modules/auth/auth.controller.ts` — Added `@Throttle`/`@SkipThrottle` decorators
- `ultimatype-monorepo/apps/api/src/modules/rooms/rooms.controller.ts` — Added `@Throttle` on POST, room creation limit per userId
- `docs/cloudflare-rate-limiting.md` — New: Cloudflare configuration documentation
- `ultimatype-monorepo/apps/api/src/gateway/game.gateway.spec.ts` — Added tests for AC1, AC2, AC5, AC6
- `ultimatype-monorepo/apps/api/src/modules/rooms/rooms.service.spec.ts` — Added test for `setRoomStatusAtomically`
- `ultimatype-monorepo/apps/api/src/modules/matches/match-state.service.spec.ts` — Added tests for score clamp and startTime guard
- `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.spec.tsx` — Updated tests for Faltantes column
- `_bmad-output/implementation-artifacts/deferred-work.md` — Marked resolved items
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status

## Change Log

- **2026-03-29**: Story 2-7 implemented. All 7 ACs completed: atomic endMatch via Lua script, removed server-side CARET_UPDATE finish detection, score clamped to 0 with missingChars/Faltantes column, startTime null guard, @nestjs/throttler + WebSocket rate limits, onModuleDestroy timer cleanup, deferred-work.md updated. 173 API + 83 web tests passing (256 total).

## Review Findings

- [x] [Review][Decision] `userRoomCount` en `RoomsController` nunca decrementa y es in-memory — Resuelto: opción A, eliminado `userRoomCount` y `MAX_ROOMS_PER_USER` de `RoomsController` y `GameGateway`. Depende solo del `@Throttle` de 5 req/min. [rooms.controller.ts, game.gateway.ts]
- [x] [Review][Patch] Código muerto: `userRoomCount` y `MAX_ROOMS_PER_USER` en `GameGateway` — eliminados [game.gateway.ts]
- [x] [Review][Patch] `createRoom` lanza `Error` genérico — resuelto al eliminar el bloque [rooms.controller.ts]
- [x] [Review][Defer] `SET_STATUS_IF_PLAYING_LUA` no refresca el TTL de la room tras transición de estado — pre-existente, baja probabilidad en matches normales (<24h) [rooms.service.ts] — deferred, pre-existing
- [x] [Review][Defer] Race pre-existente: `handlePlayerFinishInternal` llama `getMatchStartedAt` en query separada después de que `cleanupMatch` puede haber borrado el key — pre-existente, wpm=0 en PLAYER_FINISH broadcast [game.gateway.ts] — deferred, pre-existing
- [x] [Review][Defer] `roomState` puede ser null entre adquirir lock atómico y `getRoomState` — playerInfoMap queda vacío, results muestran 'Unknown' sin log de warning [game.gateway.ts:658] — deferred, pre-existing

## Dev Agent Record

### Implementation Notes
- AC1: Created `SET_STATUS_IF_PLAYING_LUA` following the existing Lua script pattern in the project. `endMatch()` now acquires the "lock" atomically before fetching player info.
- AC2: Removed 13 lines from `handleCaretUpdate` that called `getTextLength` and `isPlayerFinished`, also eliminating 2 Redis calls from the hot path.
- AC3: Score clamping uses `Math.max(..., 0)`. `missingChars` added to both server `PlayerResult` and client overlay. The "Faltantes" column shows between "Prec." and "Puntos".
- AC4: Guard added at the top of the for-loop in `calculateResults`, before any computation.
- AC5: Three layers implemented — global ThrottlerGuard (120/min), per-endpoint overrides (10/min for auth, 5/min for room creation), WS guards (3 connections/user, 25 caret events/sec/socket, 2 rooms/user).
- AC6: `onModuleDestroy` clears all `matchTimeouts` and `graceTimers` maps. Does NOT touch Redis — matches remain for reconnection after restart.
- AC7: Marked 9 resolved items in deferred-work.md, added note for Moderado #7 refresh token rotation.
