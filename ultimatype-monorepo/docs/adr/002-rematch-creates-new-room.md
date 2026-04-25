# ADR-002: Revancha crea un nuevo room (no reutiliza el actual)

**Fecha:** 2026-04-24
**Estado:** Aprobado
**Contexto:** Las partidas jugadas tras una revancha no se persistían en la base de datos. Solo quedaba guardada la primera partida del room. Adicionalmente, el link de un room finalizado permitía que terceros entraran al lobby muerto.

## Decision

Cada vez que el host inicia una revancha, el backend **crea un room nuevo** con un código distinto y migra a todos los jugadores y espectadores conectados al nuevo room. El room viejo queda en estado `finished` (TTL 24h en Redis) y sirve únicamente como referencia histórica para la URL pública `/match/<code>`.

Como complemento, los joins (jugador o espectador) a un room en estado `finished` son rechazados y el cliente es redirigido al home.

## Motivacion

- La tabla `match_results` tiene `@@unique([matchCode, userId])`. Reutilizar el `roomCode` como `matchCode` provocaba colisión en la segunda partida → solo persistía la primera.
- El modelo de datos actual no tiene entidad `Match` separada: el `matchCode` es derivado del `roomCode`. Cambiarlo requeriría migración de schema y refactor extenso.
- Crear un room nuevo aprovecha `RoomsService.createRoom()` que ya existe y ya genera códigos únicos via `nanoid`.
- Mantiene la semántica `1 room = 1 match persistido`, lo que vuelve cada link `/match/<code>` un evento histórico inmutable.
- ~30-50 LOC vs ~200 LOC de la alternativa de generar `matchId` separado del `roomCode`.

## Cambios realizados

### Backend

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/gateway/game.gateway.ts` (handleRematch, ~líneas 675-805) | Reescritura: crea nuevo room, copia `level`/`timeLimit`/`maxPlayers`, migra jugadores no-host conectados via `joinRoom`, migra espectadores via `joinAsSpectator`, mueve sockets Socket.IO con `server.in(oldCode).socketsJoin/socketsLeave`, actualiza `connections` map, emite `ROOM_MIGRATED` + `LOBBY_STATE` al room nuevo. Validaciones añadidas: solo el host puede iniciar revancha; rechaza si la partida no está `finished`; idempotencia ante doble-click; try/catch con rollback best-effort si `createRoom` falla. |
| `apps/api/src/gateway/game.gateway.ts` (handleJoin) | Chequeo temprano: si el room está `finished`, emite `LOBBY_ERROR { code: ROOM_NOT_FOUND, message: ROOM_NOT_FOUND }` y retorna sin tocar Redis. Cierra el bug del "link huérfano" (`JOIN_SPECTATOR_LUA` no validaba status, así que el auto-spectate triunfaba sobre rooms muertos). |
| `apps/api/src/gateway/game.gateway.ts` (handleSpectateJoin) | Mismo chequeo temprano que `handleJoin`. |

### Shared

| Archivo | Cambio |
|---------|--------|
| `libs/shared/src/websocket/events.ts` | Nuevo evento `WS_EVENTS.ROOM_MIGRATED: 'room:migrated'`. |
| `libs/shared/src/dto/room.dto.ts` | Nueva interfaz `RoomMigratedPayload { oldCode: string; newCode: string }`. |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/hooks/use-lobby.ts` | Nuevo listener para `ROOM_MIGRATED`: resetea `arenaStore`, limpia `matchStarted`/`matchData`, navega a `/room/<newCode>` con `replace: true`. Ref `isMigratingRef` evita que el cleanup del effect desconecte el socket durante la migración (mantiene la conexión viva). Refs `hasReceivedStateRef` + `finishedRedirectRef`: si llega `LOBBY_ERROR { code: ROOM_NOT_FOUND }` antes del primer `LOBBY_STATE`, programa `navigate('/', { replace: true })` tras 2 s para mostrar el mensaje y luego redirigir. |

## Flujo de la revancha

```
1. Host hace click en "Revancha" → frontend emite MATCH_REMATCH
2. Backend valida: host correcto + room.status === 'finished' + no migrado todavía
3. Backend crea nuevo room (createRoom) → newCode generado por nanoid
4. Backend copia settings (level, timeLimit, maxPlayers) al nuevo room
5. Backend agrega jugadores no-host conectados al nuevo room (joinRoom)
6. Backend agrega espectadores al nuevo room (joinAsSpectator)
7. Backend mueve los sockets Socket.IO: server.in(oldCode).socketsJoin(newCode) + socketsLeave(oldCode)
8. Backend actualiza connections map: cada conn.roomCode === oldCode → newCode
9. Backend emite ROOM_MIGRATED { oldCode, newCode } + LOBBY_STATE al room nuevo
10. Frontend (use-lobby) recibe ROOM_MIGRATED → resetea arena, navega /room/<newCode> con replace
11. Cleanup del effect detecta isMigratingRef === true → NO desconecta el socket
12. Nuevo render con newCode → LOBBY_STATE ya está en estado, lobby UI lista
13. Room viejo queda con status='finished', removido de active:rooms (vía endMatch previo), TTL 24h
```

## Defensa del room finalizado

| Capa | Mecanismo | Archivo:linea |
|------|-----------|---------------|
| Endpoint `/rooms/active` | Filtra `status === 'finished'` | `rooms.controller.ts:38` |
| Set `active:rooms` | `endMatch` removió el código vía `setRoomStatusAtomically` | `rooms.service.ts:643-644` |
| Lua `JOIN_ROOM_LUA` | Rechaza si `status !== 'waiting'` | `rooms.service.ts:45-47` |
| Gateway `handleJoin` | Chequeo temprano antes del Lua: rechaza con `ROOM_NOT_FOUND` | `game.gateway.ts:249-256` |
| Gateway `handleSpectateJoin` | Mismo chequeo | `game.gateway.ts:347-354` |
| Frontend `useLobby` | `LOBBY_ERROR` con `code === ROOM_NOT_FOUND` antes del primer state → redirect a `/` | `use-lobby.ts` |

## Decisiones descartadas

| Opcion | Razon de rechazo |
|--------|-----------------|
| Generar `matchId` separado del `roomCode` (Opción B en la discusión) | ~200 LOC, requiere migración de schema, cambia URL pública de `/match/:code` a `/match/:matchId`. La Opción A es 1/4 del esfuerzo y mantiene la semántica de URLs históricas. |
| Eliminar el `@@unique([matchCode, userId])` y permitir múltiples filas por `matchCode + userId` | Rompería `findByMatchCode` (en `match-results.controller.ts:89-117`) que asume 1 fila por jugador por match. Hack, no solución. |
| Resetear `setRoomStatus(oldCode, 'waiting')` y reutilizar el room (comportamiento previo) | Causa el bug original. Imposible distinguir partidas distintas en el mismo `matchCode`. |
| Endurecer `JOIN_SPECTATOR_LUA` con un check de status | Posible, pero el chequeo a nivel gateway es más cheap (sin round-trip extra a Lua) y centraliza la decisión. |

## Decisiones futuras (cuando lleguen torneos / best-of-N)

Cuando se implemente "torneo" o "mejor de N", **se creará una estructura nueva** que represente al match como entidad de primera clase (probablemente con `matchId` autoincremental por torneo). El patrón actual (1 room = 1 match) se preservará para partidas casuales y la nueva estructura coexistirá. Esto evita over-engineering hoy y mantiene la opción abierta sin atarse a una solución prematura.

## Edge cases manejados

- **Jugador desconectado al click de revancha**: queda fuera del nuevo room (filtro `!disconnected`). Si reconecta tarde al room viejo, recibe error y vuelve al home.
- **Espectadores**: migran junto con jugadores (`joinAsSpectator(newCode)` por cada uno).
- **Doble click en "Revancha"**: validación host + idempotencia (segundo click ve `conn.roomCode === newCode` con status `waiting`, rechaza).
- **`createRoom` falla**: try/catch, best-effort cleanup del room nuevo parcial via `setRoomStatus(newCode, 'finished')`, room viejo intacto, emite `LOBBY_ERROR`.
- **Link compartido a room finalizado**: chequeo temprano en `handleJoin`/`handleSpectateJoin` rechaza con `ROOM_NOT_FOUND`, frontend muestra mensaje 2 s y redirige al home.

## Tests añadidos

| Archivo | Tests |
|---------|-------|
| `apps/api/src/gateway/game.gateway.spec.ts` (`describe('match:rematch')`) | 11 tests: crea nuevo room, copia settings, migra jugadores, no migra desconectados, migra sockets, actualiza connections map, emite `ROOM_MIGRATED`, rechaza no-host, rechaza no-finished, falla en `createRoom`, idempotencia, error sin conexión. |
| `apps/api/src/gateway/game.gateway.spec.ts` (`describe('lobby:join')` + `describe('lobby:spectate')`) | 2 tests: ambos rechazan rooms `finished` con código `ROOM_NOT_FOUND`. |
| `apps/web/src/hooks/use-lobby.spec.tsx` (`describe('ROOM_MIGRATED')`) | 4 tests: navega al newCode, ignora migración con oldCode no coincidente, NO desconecta socket durante migración, resetea matchStarted/matchData. |
| `apps/web/src/hooks/use-lobby.spec.tsx` (`describe('LOBBY_ERROR ROOM_NOT_FOUND')`) | 3 tests: navega al home tras 2s, no navega si ya recibió LOBBY_STATE, no navega ante otros errores. |

**Total:** 786/786 tests verdes, sin regresiones.

## Rollback

- `git revert <commit-sha>` y deploy backend + frontend simultáneo.
- Sin migración de schema → sin riesgo de datos.
- `match_results` insertados con códigos nuevos (Opción A) son válidos y se mantienen — el endpoint `/matches/:matchCode` los muestra correctamente.
- Rooms `finished` huérfanos en Redis expiran solos por TTL en 24 h.
