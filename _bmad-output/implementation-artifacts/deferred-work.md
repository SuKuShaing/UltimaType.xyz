# Deferred Work

## Deferred from: retrospectiva Epic 1 (2026-03-27)

- **Enforcement de `kebab-case` sin herramienta automática** — La convención de que todos los archivos deben usar `kebab-case.ts` / `kebab-case.tsx` es una regla crítica del proyecto pero no está enforced por ningún linter ni Nx constraint. Actualmente depende de la disciplina manual del agente dev. Impacto: cualquier archivo creado con `camelCase` o `PascalCase` viola la convención sin que nadie lo detecte automáticamente. Solución propuesta: configurar una regla ESLint personalizada (`check-file` plugin) o un custom Nx generator que valide nombres de archivo en CI. Tratar en una historia de mejora de calidad antes del Epic 3.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

## Deferred from: code review of 1-3-auto-detect-user-country-on-first-login (2026-03-26)

- **P2002 race condition — loser pierde countryCode** — En logins concurrentes simultáneos del mismo usuario nuevo, el request que pierde la carrera (P2002) retorna al usuario creado por el ganador. Si el ganador tenía IP sin geo (null) y el perdedor tenía IP con país, el countryCode se descarta. Baja frecuencia, aceptable para MVP.
- **geoip-lite DB estática sin mecanismo de actualización** — La base de datos MaxMind incluida en el paquete se desactualiza con el tiempo. Sin `updatedb.js` periódico, las IPs de rangos recién asignados retornarán null o país incorrecto. Considerar cron de actualización en producción.
- **req:any / res:any en auth.controller.ts** — Typing débil en métodos del controller. Pre-existente desde story 1-2. Refactorizar a tipos NestJS/Express correctos en limpieza futura.
- **@types/geoip-lite v1.4.x con runtime v2.0.x** — Los tipos son de la API v1 pero el runtime es v2. Funcionalmente compatible para el uso actual (`lookup()`). Actualizar si la API diverge.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

- **Refresh token sin rotación ni invalidación** — `auth.service.ts`. No hay persistencia de refresh tokens (tabla o Redis). Imposible revocar tokens robados. Requiere diseño de tabla/Redis para token blacklist (post-MVP).
- **Rate limiting ausente en endpoints auth** — `/auth/refresh`, `/auth/me`. Sin protección contra brute force. Requiere infraestructura de rate limiting (post-MVP).

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
- **markPlayerFinished no es atómico** — `match-state.service.ts:markPlayerFinished`. El patrón hget→parse→hset sin atomicidad Redis puede causar doble-write en condiciones de carrera. La deduplicación via `isPlayerFinished` mitiga el impacto práctico. Reemplazar con Lua script si se detectan problemas en producción.
- **areAllPlayersFinished no considera jugadores desconectados** — `match-state.service.ts:areAllPlayersFinished`. Si un jugador se desconecta mid-match y sigue en el hash Redis sin `finishedAt`, el match nunca termina (hasta timeout). Cubierto por Story 2-6 (disconnection handling).
- **Disconnect mid-match con jugadores restantes** — `game.gateway.ts:handleDisconnect`. Si el jugador que se desconecta era el único sin terminar, el match queda atascado esperando que expire el timeout de 5 minutos. Cubierto por Story 2-6.
- **Parámetros sin tipo en métodos privados del gateway** — `game.gateway.ts:handlePlayerFinishInternal`, `endMatch`. Parámetros `roomCode`, `userId` etc. sin anotación TypeScript. Cosmético, agregar en limpieza futura.
- **matchTimeouts no se limpia en reinicio del servidor** — `game.gateway.ts`. No hay `onModuleDestroy` para limpiar los `NodeJS.Timeout` pendientes. Relevante si NestJS se recarga en caliente (hot reload). Sin impacto en deploy normal.
- **Empates en ranking sin criterio de desempate** — `match-state.service.ts:calculateResults`. Dos jugadores con igual score reciben rankeo arbitrario (orden del hash Redis). El campo `finishedAt` está disponible y sería el desempate natural. Agregar en refinamiento de UX post-MVP.
- **PLAYER_FINISH usado bidireccional (C→S y S→C)** — `libs/shared/src/websocket/events.ts`. El comentario dice "Client → Server" pero el servidor también emite este evento a los clientes. Funciona correctamente porque el listener del cliente filtra por `playerId !== localUserId`. Actualizar comentario en limpieza.
