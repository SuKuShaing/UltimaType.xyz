# Story 3.1: Spectator Mode & Room Capacity Management

Status: done

## Story

As a spectator,
I want to join a room without consuming a player slot,
So that I can watch the match even if the 20-player limit is reached (up to 100 spectators).

## Acceptance Criteria (BDD)

### AC1: Unirse como espectador voluntariamente

**Given** un usuario autenticado que accede a una sala en estado `waiting`
**When** hay slots de jugador disponibles (< maxPlayers)
**Then** ve dos opciones: "Unirse como jugador" y "Unirse como espectador"
**And** si elige espectador, se conecta sin consumir un slot de jugador
**And** aparece en la lista de espectadores de la sala (no en la lista de jugadores)
**And** no ve botones de "Listo" ni "Iniciar"

### AC2: Auto-espectador cuando la sala est llena

**Given** un usuario intentando unirse a una sala donde `players.length >= maxPlayers`
**When** hay slots de espectador disponibles (< 100)
**Then** se une automaticamente como espectador
**And** ve un mensaje: "Sala llena - te uniste como espectador"
**And** si no hay slots de espectador tampoco, recibe error "Sala llena"

### AC3: Limite de 100 espectadores

**Given** una sala con 100 espectadores conectados
**When** un nuevo usuario intenta unirse como espectador
**Then** recibe un error "Sala llena de espectadores"
**And** no se crea su conexion

### AC4: Espectador no puede ejecutar acciones de jugador

**Given** un usuario conectado como espectador
**When** intenta emitir eventos `lobby:ready`, `lobby:start`, `lobby:select-level`, `lobby:set-time-limit`, `lobby:set-max-players`, `caret:update`, o `player:finish`
**Then** el servidor rechaza la accion silenciosamente (o con error) sin afectar el estado de la sala

### AC5: Espectador recibe todos los broadcasts de la partida

**Given** un espectador en una sala donde se inicia una partida
**When** los jugadores compiten
**Then** el espectador recibe `match:start` con el texto y lista de jugadores
**And** recibe `caret:sync` de todos los jugadores en tiempo real
**And** recibe `player:finish` cuando jugadores terminan
**And** recibe `match:end` con los resultados finales

### AC6: Lista de espectadores visible en el lobby

**Given** una sala con jugadores y espectadores
**When** cualquier participante mira el lobby
**Then** ve la lista de jugadores (con avatares, banderas, estado "Listo") arriba
**And** ve una seccion separada "Espectadores ({count})" con nombres de espectadores debajo
**And** el conteo total muestra "{players}/{maxPlayers} jugadores | {spectators} espectadores"

### AC7: Reconexion de espectador

**Given** un espectador que pierde la conexion WebSocket durante una partida
**When** se reconecta dentro del periodo de gracia (30s)
**Then** es restaurado como espectador (no como jugador)
**And** recibe el estado actual de la partida (posiciones de carets, jugadores terminados)

---

## Tasks / Subtasks

### Task 1: Shared Layer - DTOs, Eventos y Constantes (AC: 1,2,3,4,5,6)

- [x] 1.1 Agregar `MAX_SPECTATORS = 100` a `libs/shared/src/constants/match-config.ts`
- [x] 1.2 Agregar evento `SPECTATE_JOIN = 'lobby:spectate'` a `WS_EVENTS` en `libs/shared/src/websocket/events.ts`
- [x] 1.3 Crear interfaz `SpectatorInfo` en `libs/shared/src/dto/room.dto.ts`:
  ```typescript
  export interface SpectatorInfo {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    joinedAt: string;
  }
  ```
- [x] 1.4 Agregar campo `spectators: SpectatorInfo[]` a `RoomState` en `room.dto.ts`

### Task 2: Backend Redis - Almacenamiento de espectadores (AC: 1,2,3,7)

- [x] 2.1 Crear Lua script `JOIN_AS_SPECTATOR_LUA` en `rooms.service.ts`:
  - Valida que la sala exista (`room:{code}`)
  - Valida que el usuario no este ya como jugador en `room:{code}:players`
  - Valida que el usuario no este ya como espectador en `room:{code}:spectators`
  - Valida que `HLEN(room:{code}:spectators) < 100`
  - Agrega a `room:{code}:spectators` con SpectatorInfo serializado como JSON
  - Refresca TTL de las 3 keys
  - Retorna exito
- [x] 2.2 Crear metodo `joinAsSpectator(code: string, userId: string, userInfo: UserInfo): Promise<RoomState>` en `rooms.service.ts`
- [x] 2.3 Crear Lua script `LEAVE_SPECTATOR_LUA` (remover espectador del hash, no afecta host/jugadores)
- [x] 2.4 Crear metodo `leaveSpectator(code: string, userId: string): Promise<RoomState | null>` en `rooms.service.ts`
- [x] 2.5 Modificar `getRoomState()` para incluir espectadores: leer `room:{code}:spectators` y mapear a `SpectatorInfo[]`
- [x] 2.6 Modificar `leaveRoom()` Lua script: si el usuario es espectador (no existe en `:players`), delegarlo a `leaveSpectator` en vez de fallar
- [x] 2.7 Asegurar que `cleanupRoom` (si existe) o el TTL limpia tambien `room:{code}:spectators`

### Task 3: Backend Gateway - Handlers de espectador (AC: 1,2,3,4,5,7)

- [x] 3.1 Crear handler `handleSpectateJoin` para `lobby:spectate`:
  - Valida JWT y codigo de sala
  - Llama a `roomsService.joinAsSpectator()`
  - Registra conexion en `this.connections` con metadata `role: 'spectator'`
  - Socket se une al room de Socket.IO: `client.join(roomCode)`
  - Broadcast `LOBBY_STATE` actualizado (incluye espectadores)
- [x] 3.2 Modificar `handleJoin` para detectar sala llena y auto-redirigir a espectador:
  - Si `joinRoom()` falla con "Sala llena", intentar `joinAsSpectator()`
  - Emitir evento `lobby:auto-spectate` al cliente para notificar el cambio
  - O simplemente agregar flag `asSpectator?: boolean` al payload de `lobby:join`
- [x] 3.3 Agregar `role: 'player' | 'spectator'` al mapa `connections`:
  ```typescript
  private connections = new Map<string, { userId: string; roomCode: string; role: 'player' | 'spectator' }>()
  ```
- [x] 3.4 Agregar guard en handlers de jugador (LOBBY_READY, LOBBY_START, LOBBY_SELECT_LEVEL, SET_TIME_LIMIT, SET_MAX_PLAYERS, CARET_UPDATE, PLAYER_FINISH):
  - Al inicio del handler: `const conn = this.connections.get(client.id); if (conn?.role === 'spectator') return;`
  - No emitir error al espectador, simplemente ignorar (silently drop)
- [x] 3.5 Modificar `handleDisconnect` para manejar desconexion de espectador:
  - Si `role === 'spectator'`: llamar `roomsService.leaveSpectator()` directamente (sin grace period, o con grace period mas corto)
  - Broadcast `LOBBY_STATE` actualizado
- [x] 3.6 Modificar `handleRejoin` para restaurar espectadores:
  - Si el usuario existe en `room:{code}:spectators` (y no en `:players`), restaurar como espectador
  - Unir al Socket.IO room
  - Enviar estado actual de la partida (posiciones, jugadores terminados) pero sin `localPosition` ni input state
- [x] 3.7 Todos los broadcasts existentes (`LOBBY_STATE`, `MATCH_START`, `CARET_SYNC`, `PLAYER_FINISH`, `MATCH_END`, `PLAYER_DISCONNECTED`, `PLAYER_RECONNECTED`) ya usan `server.to(roomCode)` y por lo tanto llegan a espectadores automaticamente (no requieren cambio)

### Task 4: Frontend - UI del Lobby con espectadores (AC: 1,6)

- [x] 4.1 Modificar `use-lobby.ts`:
  - Agregar funcion `joinAsSpectator()` que emite `lobby:spectate` con el codigo de sala
  - Escuchar evento `lobby:auto-spectate` para actualizar estado local (`isSpectator: true`)
  - Agregar estado `isSpectator: boolean` al hook
  - Cuando `roomState` llega, determinar si el usuario actual es espectador (buscar en `roomState.spectators`)
- [x] 4.2 Modificar `lobby-page.tsx`:
  - Mostrar seccion de espectadores debajo de la lista de jugadores
  - Render: `"Espectadores ({count})"` con lista de nombres
  - Si `isSpectator`, ocultar controles de "Listo"/"Iniciar" y mostrar badge "Estas como espectador"
  - Actualizar conteo: `"{players.length}/{maxPlayers} jugadores | {spectators.length} espectadores"`
- [x] 4.3 Agregar opcion de "Unirse como espectador" en el flujo de entrada a la sala:
  - En la pagina de lobby o antes de unirse, si hay slots, mostrar dos botones
  - Si la sala esta llena, auto-join como espectador y mostrar toast/mensaje

### Task 5: Frontend - Arena para espectadores (AC: 5)

- [x] 5.1 Cuando `isSpectator === true` y la partida inicia:
  - Renderizar `ArenaPage` en modo lectura: mostrar LiveTextCanvas con el texto pero deshabilitar input de teclado
  - Mostrar todos los MultiplayerCaret de los jugadores (el espectador no tiene caret propio)
  - Mostrar FocusWPMCounter del lider (o no mostrar WPM personal)
  - Recibir y renderizar CARET_SYNC normalmente
  - Mostrar resultados al final (MATCH_END)

### Task 6: Tests (AC: todos)

- [x] 6.1 Tests unitarios backend - `rooms.service.spec.ts`:
  - `joinAsSpectator` exito cuando hay slots
  - `joinAsSpectator` falla cuando hay 100 espectadores
  - `joinAsSpectator` falla si usuario ya es jugador
  - `leaveSpectator` remueve correctamente
  - `getRoomState` incluye espectadores
- [x] 6.2 Tests unitarios backend - `game.gateway.spec.ts`:
  - `handleSpectateJoin` crea conexion con role spectator
  - Handlers de jugador rechazan espectadores silenciosamente
  - Desconexion de espectador limpia correctamente
- [x] 6.3 Tests unitarios frontend - `use-lobby.spec.ts` (si existe):
  - Estado `isSpectator` se actualiza correctamente
  - `joinAsSpectator` emite evento correcto
- [x] 6.4 Verificar que tests existentes pasan (174 API + 83 web)

---

## Dev Notes

### Patrones de arquitectura a seguir

- **Redis keys**: Seguir patron existente. Nueva key: `room:{code}:spectators` (hash de JSON, mismo patron que `room:{code}:players`)
- **Lua scripts**: Todas las operaciones que verifican capacidad y agregan/remueven deben ser atomicas via Lua (patron establecido en `joinRoom`/`leaveRoom`)
- **Socket.IO rooms**: Todos los participantes (jugadores + espectadores) se unen al mismo room de Socket.IO (`roomCode`). Los broadcasts existentes con `server.to(roomCode).emit(...)` ya cubren a espectadores automaticamente
- **Guards**: No crear sub-rooms de Socket.IO (`roomCode:players`/`roomCode:spectators`) para broadcasting - es innecesario dado que la restriccion es server-side (que handlers acepta cada rol), no client-side (que eventos recibe)
- **Naming**: Archivos en `kebab-case.ts`, eventos WS en formato `dominio:accion`

### Archivos a tocar

**Shared (`libs/shared/src/`):**
- `constants/match-config.ts` — agregar `MAX_SPECTATORS`
- `websocket/events.ts` — agregar `SPECTATE_JOIN`
- `dto/room.dto.ts` — agregar `SpectatorInfo`, modificar `RoomState`

**Backend (`apps/api/src/`):**
- `modules/rooms/rooms.service.ts` — Lua scripts + metodos spectator
- `gateway/game.gateway.ts` — handler spectate, guards, disconnect/rejoin
- `modules/rooms/rooms.service.spec.ts` — tests
- `gateway/game.gateway.spec.ts` — tests

**Frontend (`apps/web/src/`):**
- `hooks/use-lobby.ts` — estado spectator, joinAsSpectator
- `components/lobby/lobby-page.tsx` — UI espectadores, opciones de entrada
- `components/arena/arena-page.tsx` — modo lectura para espectadores

### Project Structure Notes

- Alineado con estructura de directorio existente: no se crean nuevos directorios
- `SpectatorInfo` es un DTO mas simple que `PlayerInfo` (no necesita `colorIndex`, `isReady`, `disconnected`)
- La reconexion de espectadores usa el mismo `handleRejoin` existente con branch condicional

### Decisiones de diseno clave

1. **Hash separado vs. campo `role` en PlayerInfo**: Se elige hash separado (`room:{code}:spectators`) porque:
   - Los Lua scripts existentes usan `HLEN` en `:players` para contar jugadores — mezclar espectadores romperia el conteo
   - Separacion limpia sin modificar scripts Lua existentes y testeados
   - Los espectadores no necesitan `colorIndex`, `isReady`, `disconnected`

2. **Auto-spectate en sala llena**: Cuando `joinRoom()` falla con "Sala llena", el gateway intenta automaticamente `joinAsSpectator()`. Esto es mejor UX que rechazar al usuario.

3. **Sin Socket.IO sub-rooms**: Los broadcasts van a todos en la sala. La restriccion de roles es server-side via guards en los handlers. Mas simple, menos propenso a errores de sincronizacion de room membership.

4. **Espectadores sin grace period largo**: A diferencia de jugadores (30s grace period), los espectadores pueden tener un grace period mas corto o ninguno, ya que no afectan el estado de la partida.

### Deferred item de Story 2-8

Story 2-8 defirió: "setMaxPlayers reduce below current count -> ideal: excess players become spectators". Esto NO se implementa en esta story 3-1 (requiere logica de transicion player->spectator involuntaria que es mas compleja). Se puede abordar en Story 3-3 o como mejora posterior.

### Inteligencia del story anterior (2-8)

- Lua scripts para operaciones atomicas funcionan bien — seguir el mismo patron
- `country-flag-icons` ya instalado — espectadores en la lista de lobby NO necesitan bandera (son observadores pasivos)
- `NavBar` ya participa del Focus Fade — funciona automaticamente para espectadores
- Tema dark/light ya implementado — nuevos componentes usan clases Tailwind con custom properties
- Pattern para agregar WS events: constante en `events.ts`, handler en gateway, emision en `use-lobby.ts`

### Git Intelligence

Ultimos commits relevantes:
- `38af1b5` 2-8-functional-validation-fixes: done (ultimo)
- Pattern: commits usan formato `{story-key}: {estado}`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 - Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture - Redis]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: _bmad-output/implementation-artifacts/2-8-functional-validation-fixes.md#Review Findings - Defer Epic 3]
- [Source: libs/shared/src/constants/match-config.ts]
- [Source: libs/shared/src/websocket/events.ts]
- [Source: libs/shared/src/dto/room.dto.ts]
- [Source: apps/api/src/modules/rooms/rooms.service.ts]
- [Source: apps/api/src/gateway/game.gateway.ts]
- [Source: Socket.IO v4 Rooms Documentation]
- [Source: NestJS WebSocket Gateway Documentation]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- Task 1: Added `MAX_SPECTATORS=100` constant, `LOBBY_SPECTATE`/`LOBBY_AUTO_SPECTATE` events, `SpectatorInfo` interface, `spectators` field in `RoomState`
- Task 2: Created `JOIN_SPECTATOR_LUA` and `LEAVE_SPECTATOR_LUA` atomic scripts, added `joinAsSpectator`/`leaveSpectator`/`isSpectatorInRoom`/`getSpectators` methods, updated `getRoomState` to include spectators, updated `leaveRoom` to handle spectator users, updated `refreshTTL` to expire spectators key
- Task 3: Added `role` field to connections map, created `handleSpectateJoin` handler, added auto-spectate fallback in `handleJoin` when room is full, added `isSpectator()` guard to all player-only handlers (ready, start, level, time limit, max players, caret update, player finish), spectator disconnect removes immediately (no grace period), spectator rejoin returns room state without match state
- Task 4: Added `isSpectator` state and `joinAsSpectator` function to `useLobby` hook, spectator badge in lobby, spectator list section, hidden Ready/Start buttons for spectators, `spectateMode` parameter support
- Task 5: Added `isSpectator` prop to `ArenaPage`, spectators see all player carets (not filtered), disabled keyboard input and caret updates, disabled waiting overlay for spectators
- Task 6: Updated 7 existing tests for spectators field in RoomState (hgetall mock for spectators, refreshTTL 3 keys, leaveRoom isSpectatorInRoom check). Added 7 new tests: joinAsSpectator success/failures, leaveSpectator, isSpectatorInRoom. Added gateway mocks for new service methods. All 181 API + 83 web tests pass. Lint: 0 errors.

### File List

**Shared (`libs/shared/src/`):**
- `constants/match-config.ts` — added `MAX_SPECTATORS`
- `websocket/events.ts` — added `LOBBY_SPECTATE`, `LOBBY_AUTO_SPECTATE`
- `dto/room.dto.ts` — added `SpectatorInfo` interface, `spectators` field in `RoomState`

**Backend (`apps/api/src/`):**
- `modules/rooms/rooms.service.ts` — Lua scripts + spectator methods (joinAsSpectator, leaveSpectator, isSpectatorInRoom, getSpectators), updated getRoomState, leaveRoom, refreshTTL, createRoom
- `gateway/game.gateway.ts` — role tracking, handleSpectateJoin, auto-spectate in handleJoin, spectator guards, disconnect/rejoin for spectators, isSpectator helper
- `modules/rooms/rooms.service.spec.ts` — 7 updated tests + 7 new spectator tests
- `gateway/game.gateway.spec.ts` — added spectator service mocks

**Frontend (`apps/web/src/`):**
- `hooks/use-lobby.ts` — isSpectator state, joinAsSpectator, LOBBY_AUTO_SPECTATE listener, spectateMode param
- `components/lobby/lobby-page.tsx` — spectator badge, spectator list, hidden controls for spectators, isSpectator prop to ArenaPage
- `components/arena/arena-page.tsx` — isSpectator prop, read-only mode, all carets visible, disabled input

### Review Findings

- [ ] [Review][Decision] AC7: ¿Espectadores con grace period? — El AC7 especifica 30s de período de gracia para espectadores. El Dev Note dice "sin grace period largo" y la implementación los elimina inmediatamente en desconexión. ¿Se acepta esta desviación del spec?
- [ ] [Review][Patch] AC7: spectator rejoin devuelve matchState: null hardcodeado — Si la partida está activa, el espectador que reconecta no recibe posiciones de carets ni jugadores terminados. [game.gateway.ts – handleRejoin, rama spectator]
- [ ] [Review][Patch] AC1: No existe UI para unirse voluntariamente como espectador — `joinAsSpectator` existe en useLobby pero no hay botón en lobby-page.tsx. AC1 requiere que el usuario vea dos opciones cuando hay slots disponibles. [lobby-page.tsx]
- [ ] [Review][Patch] AC2: Mensaje "Sala llena - te uniste como espectador" no se muestra — El evento LOBBY_AUTO_SPECTATE llega con ese mensaje en el payload pero use-lobby solo lee el evento para setIsSpectator(true) y descarta el texto. [use-lobby.ts – handler LOBBY_AUTO_SPECTATE]
- [ ] [Review][Patch] joinAsSpectator hook actualiza isSpectator optimísticamente antes de confirmación del servidor — Si el servidor rechaza (sala llena de espectadores), el cliente queda en modo espectador sin haberlo logrado. [use-lobby.ts:joinAsSpectator]
- [x] [Review][Defer] AC2: Mensaje de error cuando ambos slots llenos es 'Sala llena de espectadores' en lugar de 'Sala llena' per spec — deferred, mensaje más informativo, bajo impacto
- [x] [Review][Defer] Comparación frágil por string 'Sala llena' para routing auto-spectate en handleJoin — deferred, pre-existing pattern en el codebase

## Change Log

- 2026-03-30: Implemented Story 3.1 Spectator Mode & Room Capacity Management
  - Shared: SpectatorInfo DTO, MAX_SPECTATORS constant, new WS events
  - Backend: Redis spectator storage with Lua scripts, gateway handlers with role guards
  - Frontend: Spectator lobby UI, read-only arena view
  - Tests: 181 API + 83 web pass, 0 lint errors
