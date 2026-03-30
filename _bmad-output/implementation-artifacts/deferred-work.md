# Deferred Work

## Deferred from: code review of 3-2-lobby-race-fixes-and-host-controls (2026-03-30)

- **Stale socket en closure del trailing timer de useCaretSync** — `use-caret-sync.ts`. Si el socket cambia (reconexión) mientras hay un timer pendiente (≤50ms), el emit va al socket antiguo. Socket.io maneja sockets desconectados gracefully; impacto: un frame de caret congelado durante reconexión. Resolver si se implementa reconexión mid-arena.

## Deferred from: code review of 3-1-spectator-mode-room-capacity-management (2026-03-30)

- **AC2: Mensaje de error cuando ambos slots llenos es 'Sala llena de espectadores' en lugar de 'Sala llena' per spec** — `game.gateway.ts / rooms.service.ts`. Cuando la sala está llena de jugadores Y espectadores, el error que recibe el cliente es 'Sala llena de espectadores' pero AC2 especifica solo 'Sala llena'. Mensaje más informativo, bajo impacto; ajustar si se quiere conformidad estricta con el spec.
- **Comparación frágil por string 'Sala llena' para routing auto-spectate en handleJoin** — `game.gateway.ts`. El auto-spectate se activa comparando `joinErr.message === 'Sala llena'`. Si el mensaje del Lua script cambia (i18n, refactor), el auto-spectate se rompe silenciosamente. Pre-existing pattern en el codebase; resolver cuando se estandaricen los error codes.

## Deferred from: code review of 2-8-functional-validation-fixes (2026-03-29)

- **Race condition no-atómica entre `hset` y `hgetall` en setMaxPlayers/setTimeLimit** — `rooms.service.ts` / `game.gateway.ts`. El `hset` y el posterior `hgetall`+broadcast son dos llamadas Redis separadas. Otro evento WS entre ambas podría causar un broadcast con snapshot parcialmente stale. Bajo riesgo en práctica; mismo patrón que otros handlers existentes.
- **`disconnectedLabelRef` queda stale si el jugador reconecta** — `multiplayer-caret.tsx`. La posición del label de desconexión solo se actualiza cuando `disconnectedRef.current === true`. Si el jugador reconecta y desconecta de nuevo, el label puede saltar. Bajo impacto visual.
- **Inconsistencia en sistemas de coordenadas: local caret (`offsetLeft/offsetTop`) vs multiplayer caret (`getBoundingClientRect`)** — `live-text-canvas.tsx` vs `multiplayer-caret.tsx`. Si un ancestro CSS aplica `transform`, los sistemas divergen. Funciona actualmente sin transforms.
- **NavBar brevemente visible en `/auth/callback`** — `app.tsx`. Si el profile fetch resuelve antes del `navigate('/')` en AuthCallback, `isAuthenticated` se vuelve true y NavBar se renderiza momentáneamente en la página de callback. Transient, sin impacto funcional.
- **Local caret visible en estado blurred (countdown/post-match)** — `live-text-canvas.tsx`. El caret es sibling dentro del div que recibe `filter: blur(8px)`, así que se blur junto con el texto. Pero queda visible en posición final post-match sin indicador de que el typing terminó.
- **`setMaxPlayers` debería transicionar jugadores excedentes a espectador** — `rooms.service.ts`. Actualmente, si el host reduce `maxPlayers` por debajo del count actual, se lanza error. El comportamiento ideal: los últimos jugadores en entrar pasan a rol espectador. Requiere infraestructura de espectador de Epic 3 (rol `spectator`, broadcast diferenciado, UI espectador). Implementar junto con Story 3-1 (spectator-mode-room-capacity-management) o en retrospectiva de Epic 3.

## Deferred from: code review of 2-7-epic-2-prep-sprint (2026-03-29)

- **`SET_STATUS_IF_PLAYING_LUA` no refresca TTL** — `rooms.service.ts`. La transición atómica `playing → finished` no llama `EXPIRE` sobre las keys de la room, a diferencia de los otros scripts Lua del proyecto (`JOIN_ROOM_LUA`, `LEAVE_ROOM_LUA`). En matches de larga duración cerca del TTL (24h), la room podría expirar antes de que los jugadores actúen en la pantalla de resultados. Baja probabilidad en hackathon normal.
- **Race en `handlePlayerFinishInternal` con `getMatchStartedAt`** — `game.gateway.ts`. Si `cleanupMatch` borra el key de match entre la llamada a `getMatchState` y `getMatchStartedAt`, el `startedAt` queda null → `elapsedMs=0` → `wpm=0` en el broadcast `PLAYER_FINISH`. Pre-existente antes de story 2-7. El resultado de `MATCH_END` (vía `calculateResults`) sí es correcto ya que está protegido por el lock atómico.
- **`roomState` null entre lock atómico y `getRoomState`** — `game.gateway.ts:658`. Muy baja probabilidad (requiere que la room expire entre las dos llamadas Redis). Si ocurre, `playerInfoMap` queda vacío y los resultados muestran 'Unknown' para todos los jugadores. No hay log de warning en este path. Pre-existente, el spec describe explícitamente este patrón de two-step fetch.

## Deferred from: retrospectiva Epic 1 (2026-03-27)

- **Enforcement de `kebab-case` sin herramienta automática** — La convención de que todos los archivos deben usar `kebab-case.ts` / `kebab-case.tsx` es una regla crítica del proyecto pero no está enforced por ningún linter ni Nx constraint. Actualmente depende de la disciplina manual del agente dev. Impacto: cualquier archivo creado con `camelCase` o `PascalCase` viola la convención sin que nadie lo detecte automáticamente. Solución propuesta: configurar una regla ESLint personalizada (`check-file` plugin) o un custom Nx generator que valide nombres de archivo en CI. Tratar en una historia de mejora de calidad antes del Epic 3.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

## Deferred from: code review of 1-3-auto-detect-user-country-on-first-login (2026-03-26)

- **P2002 race condition — loser pierde countryCode** — En logins concurrentes simultáneos del mismo usuario nuevo, el request que pierde la carrera (P2002) retorna al usuario creado por el ganador. Si el ganador tenía IP sin geo (null) y el perdedor tenía IP con país, el countryCode se descarta. Baja frecuencia, aceptable para MVP.
- **geoip-lite DB estática sin mecanismo de actualización** — La base de datos MaxMind incluida en el paquete se desactualiza con el tiempo. Sin `updatedb.js` periódico, las IPs de rangos recién asignados retornarán null o país incorrecto. Considerar cron de actualización en producción.
- **req:any / res:any en auth.controller.ts** — Typing débil en métodos del controller. Pre-existente desde story 1-2. Refactorizar a tipos NestJS/Express correctos en limpieza futura.
- **@types/geoip-lite v1.4.x con runtime v2.0.x** — Los tipos son de la API v1 pero el runtime es v2. Funcionalmente compatible para el uso actual (`lookup()`). Actualizar si la API diverge.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

- **Refresh token sin rotación ni invalidación** — `auth.service.ts`. No hay persistencia de refresh tokens (tabla o Redis). Imposible revocar tokens robados. Requiere diseño de tabla/Redis para token blacklist (post-MVP). **Nota (Epic 2 retro):** al escalar a múltiples instancias, implementar rotación de refresh tokens con Redis blacklist (Opción B del retrospectiva Epic 2).
- ~~**Rate limiting ausente en endpoints auth**~~ — ✅ RESUELTO en Story 2-7 (AC5): @nestjs/throttler configurado globalmente (120 req/min) con límites estrictos en `/auth/refresh` y `/auth/code` (10 req/min) y `/rooms` POST (5 req/min). WebSocket guards: max 3 conexiones/userId, throttle CARET_UPDATE 25/sec. Cloudflare config documentada.

## Deferred from: code review of 2-1-text-content-management (2026-03-27)

- **Race condition count()+findMany() en getRandomByLevel** — `texts.service.ts`. Limitación conocida de Prisma (sin ORDER BY RANDOM()). Entre las dos llamadas, textos pueden ser eliminados. Actualmente manejado gracefully (results[0] ?? null → 404). Con datos de seed estáticos el riesgo es mínimo. Resolver si los textos se administran dinámicamente.
- **Test débil "acepta niveles validos 1 a 5"** — `texts.controller.spec.ts`. Solo verifica que result != undefined, no verifica shape ni que el level correcto fue enviado al service. Suficiente para MVP dado que otros tests cubren el contrato.
- **Sin tests e2e/integración** — Gap pre-existente en todos los módulos. Las rutas HTTP, parsing de query-params, y status codes no se verifican en capa de transporte.
- **Sin documentación Swagger en endpoints de textos** — Gap pre-existente si Swagger está configurado. Agregar `@ApiProperty` decorators en limpieza futura.
- **Seed script sin guard de ambiente** — `prisma/seed.ts`. deleteMany ejecuta incondicionalmente sin verificar NODE_ENV. Añadir guard antes de deploy a producción.

## Deferred from: code review of 1-4-profile-dashboard-country-management (2026-03-27)

- **Ruta `/profile` sin guard a nivel de ruta** — `app.tsx:12`. La protección interna en `ProfilePage` es suficiente para MVP (redirect a `/`). Riesgo: flash de UI antes del redirect. Implementar `ProtectedRoute` wrapper en limpieza post-MVP.
- **`updateCountryCode` sin manejo de Prisma P2025** — `users.service.ts:54`. Si el userId no existe en DB, Prisma lanza P2025 sin transformar. Patrón consistente con otros métodos del servicio; añadir manejo global de errores Prisma en post-MVP.
- **Estado visual stale de `effectiveCountry` cuando refetch falla** — `profile-page.tsx`. Si `invalidateQueries` falla por red, el dropdown puede mostrar el valor seleccionado pero `user.countryCode` del cache puede diferir. Requiere Background Sync API (Service Worker) para encolar la mutación y enviarla al reconectarse — tratar junto con capacidades PWA post-MVP.

## Deferred from: code review of 2-3-real-time-caret-sync-engine (2026-03-27)

- **LiveTextCanvas: readOnly en hidden input impide teclado virtual en móvil** — `live-text-canvas.tsx`. Fix completo requiere input visible + `inputmode="text"` + gestión de scroll al enfocar. Móvil no es target de esta historia; retomar cuando se decida soportar móvil.
- **springInterpolate sin tipos TypeScript** — `multiplayer-caret.tsx`. Parámetros con tipos implícitos `any`. Cosmético, no afecta runtime. Agregar tipos en limpieza de código futuro.
- **Tests faltantes para ArenaPage, useCaretSync, y spring/rAF de MultiplayerCaret** — Los tests actuales solo cubren renders estáticos. No hay cobertura de la animación rAF ni de la suscripción transient. Expandir en historia de calidad post-MVP.
- **handleCaretUpdate llama getRoomState en cada evento (20Hz × N jugadores)** — Hot path Redis sin cache. Viable para MVP con pocos usuarios. Optimizar con cache in-process o TTL corto cuando se escale.
- **ArenaPage sin lógica de reconexión ante desconexión de socket** — Falla silenciosa. Pre-existente en arquitectura del lobby. Tratar con estrategia de reconexión global post-MVP.

## Deferred from: code review of 2-2-room-creation-lobby (2026-03-27)

- **connections Map in-memory vs multi-instancia** — `game.gateway.ts`. El Map `connections` que asocia socketId → {userId, roomCode} es per-instance. Con el RedisIoAdapter configurado para multi-instancia, si un cliente se conecta en instancia A y se desconecta en instancia B, el cleanup no ocurre. Aceptado como limitación single-instance para el deploy actual. Resolver cuando se escale a múltiples instancias almacenando el tracking en Redis.

## Deferred from: code review of 2-5-real-time-scoring-match-end (2026-03-28)

- **WPM en PLAYER_FINISH vs MATCH_END pueden divergir** — `game.gateway.ts:handlePlayerFinishInternal` y `match-state.service.ts:calculateResults` calculan WPM independientemente con diferentes timestamps. El valor intermedio (PLAYER_FINISH) puede diferir del final (MATCH_END). Aceptado para MVP; si se detectan diferencias notables, unificar en un único punto de cálculo.
- ~~**markPlayerFinished no es atómico**~~ — ✅ RESUELTO en Story 2-6: reemplazado con Lua script `MARK_PLAYER_FINISHED_LUA` que es atómico.
- ~~**areAllPlayersFinished no considera jugadores desconectados**~~ — ✅ RESUELTO en Story 2-6: `checkMatchEndAfterDisconnect` verifica solo jugadores activos.
- ~~**Disconnect mid-match con jugadores restantes**~~ — ✅ RESUELTO en Story 2-6: grace period + `checkMatchEndAfterDisconnect`.
- **Parámetros sin tipo en métodos privados del gateway** — `game.gateway.ts:handlePlayerFinishInternal`, `endMatch`. Parámetros `roomCode`, `userId` etc. sin anotación TypeScript. Cosmético, agregar en limpieza futura.
- ~~**matchTimeouts no se limpia en reinicio del servidor**~~ — ✅ RESUELTO en Story 2-7 (AC6): `onModuleDestroy` implementado en GameGateway, limpia `matchTimeouts` y `graceTimers`.
- ~~**Empates en ranking sin criterio de desempate**~~ — ✅ RESUELTO: `finishedAt` tiebreaker ya existe en `calculateResults` (DNF siempre después de los que terminaron, y entre finished, el que terminó antes gana).
- **PLAYER_FINISH usado bidireccional (C→S y S→C)** — `libs/shared/src/websocket/events.ts`. El comentario dice "Client → Server" pero el servidor también emite este evento a los clientes. Funciona correctamente porque el listener del cliente filtra por `playerId !== localUserId`. Actualizar comentario en limpieza.

## Deferred from: code review of 2-6-disconnection-handling (2026-03-28)

- ~~**`endMatch()` TOCTOU**~~ — ✅ RESUELTO en Story 2-7 (AC1): `endMatch` ahora usa `setRoomStatusAtomically` con Lua script `SET_STATUS_IF_PLAYING_LUA`. Solo el primer caller gana la race.
- ~~**`isPlayerFinished` + `markPlayerFinished` no atómico**~~ — ✅ RESUELTO en Story 2-6: reemplazado con Lua script `MARK_PLAYER_FINISHED_LUA`.
- ~~**`getPlayers()` sin manejo de `JSON.parse`**~~ — ✅ RESUELTO en Story 2-6: `getPlayers()` usa try/catch con `flatMap` y `logger.error` para datos corruptos.
- **Socket singleton destruido en cleanup de `useLobby`** — `socket.ts + use-lobby.ts`. `disconnectSocket()` nulifica el singleton. Referencias directas `const socket = getSocket()` en `ArenaPage` apuntan al socket muerto tras un cambio de sala. Pre-existente; mitigar cuando se refactorice la gestión de ciclo de vida del socket.
- **Sistema de revancha y transferencia de host (historia futura)** — Pre-existente desde story 2-5. El diseño correcto difiere del `MATCH_REMATCH` actual:
  - **Revancha**: solo el host puede iniciarla. Crea una **sala nueva** (no resetea la actual) con los mismos jugadores y espectadores; todos son redirigidos a esa sala. Requiere `createRoom` + join masivo + notificación WS a todos los presentes.
  - **Transferencia de host**: nuevo evento `HOST_TRANSFER` — el host designa a otro jugador como nuevo host. El host original pasa a ser jugador normal. Actualiza `hostId` en Redis y emite `LOBBY_STATE` actualizado.
  - Mientras no se implemente, el `MATCH_REMATCH` actual (sin guard de host) sigue activo — cualquier jugador puede dispararlo. Añadir guard `hostId === userId` como parche mínimo al inicio de la historia.
- **`areAllPlayersFinished` retorna `false` para match vacío** — `match-state.service.ts`. Si `cleanupMatch` ya corrió, `getMatchState` retorna `{}` y el método retorna `false` en lugar de una señal más explícita. Frágil pero correcto para el flujo actual gracias a las guards de `status !== 'playing'` aguas arriba.
