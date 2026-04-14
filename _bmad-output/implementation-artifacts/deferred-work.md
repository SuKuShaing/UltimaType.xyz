# Deferred Work

## Deferred from: code review de 5-11-match-results-overlay-redesign (2026-04-13)

- **Sin test de comportamiento para handleShare** — `match-results-overlay.spec.tsx`. No hay test que simule click en "Compartir", mockee navigator.share/clipboard, o verifique el estado transitorio "¡Copiado!". Los tests de la story solo cubren visibilidad del botón. Agregar cuando se amplíe cobertura de edge cases de UI.

## Deferred from: code review de 5-10-arena-visual-restyling (2026-04-10)

- ~~**`backdrop-blur-[20px]` repetido 5 veces sin design token**~~ — RESUELTO en review: extraído como `--blur-glass: 20px` → clase `backdrop-blur-glass` en styles.css. Aplicado en 5 archivos.

## Deferred from: code review de 5-9-lobby-visual-restyling (2026-04-09)

- **`z-[1]` magic number en botón Salir** — `lobby-page.tsx:~524`. El botón "Salir" tiene `relative z-[1]` sin razón documentada. Pre-existente; limpiar cuando se refactorice stacking contexts.
- **Material Symbols font load failure muestra texto literal** — Concern a nivel de app. Si la font de Google Fonts falla, todos los iconos Material Symbols muestran texto literal (e.g., "more_vert", "close"). Pre-existente desde que se adoptó Material Symbols en el proyecto.
- **Host solo en sala → `allOthersReady=true`** — `lobby-page.tsx`. `Array.every()` retorna `true` para arrays vacíos, así que el host sin otros jugadores ve "Iniciar Partida" habilitado. Pre-existente; lógica no modificada por este diff.

## Deferred from: code review de 5-7-player-profile-ranking-card (2026-04-07)

*Sin items diferidos — todos los findings fueron patcheados o resueltos en review.*

## Deferred from: code review de 5-6-global-leaderboard-preview (2026-04-07)

- **`formatScore` duplicado** — Función `formatScore(score: number): string` existe idéntica en `leaderboard-page.tsx` y `leaderboard-preview-section.tsx`. Extraer a utilidad compartida cuando se toque el módulo de leaderboard.
- **Avatar dropdown sin WAI-ARIA focus management completo** — `nav-bar.tsx`. El dropdown `role="menu"` no mueve foco al primer `menuitem` al abrirse, y no soporta navegación con arrow keys. Patrón incompleto del hotfix; resolver en story de accesibilidad futura.

## Deferred from: code review de 5-5-partidas-en-vivo (2026-04-07)

*Sin items diferidos — todos los findings fueron patcheados o descartados.*

## Deferred from: code review de 5-4-game-mode-selector (2026-04-06)

- **Error silencioso en `handleCreateRoom`** — El `catch` solo resetea `isCreating` sin mostrar feedback al usuario (toast, mensaje de error). Patrón pre-existente del `CreateRoomButton` original. Resolver cuando se implemente sistema global de notificaciones de error.
- **Tests faltantes: ramas `if (isCreating) return` y guard de `isFetchingProfile`** — No hay cobertura directa para el double-click guard ni para el path de click durante profile fetch. Agregar cuando se amplíe cobertura de edge cases.

## Deferred from: code review de 5-3-homepage-layout-extraction (2026-04-06)

- **`<main>` landmark faltante en `LeaderboardPage` y `PublicProfilePage`** — Aplicar el mismo cambio `<div>` → `<main>` que se hizo en `HomePage`. Mejora accesibilidad (screen reader shortcut "saltar al contenido principal"). Bajo riesgo, 1 línea por página.

- **No hay ruta 404** — `app.tsx`. `path="*"` devuelve `HomePage` para cualquier URL desconocida (`/gibberish`, etc.). Pre-existing behavior intencional per spec; agregar página 404 dedicada en story de polish futura.
- **Charset del regex de sala ambiguo + display del código en lobby** — `game-actions-section.tsx:7`. El regex `/^[A-Z2-9]{6}$/` incluye O, I visualmente ambiguos con 0, 1. Parcialmente mitigado: el input de código ya usa `font-mono` (IBM Plex Mono) que disambigua 0/O/1/I visualmente. Pendiente: (1) confirmar charset real del servidor y ajustar regex si excluye O/I; (2) aplicar `font-mono` al display del código de sala en `lobby-page` (donde se muestra el código para compartir). Revisar en code review de la story de visual polish del lobby.
- **Sin breakpoint intermedio `md:` en el grid** — `home-page.tsx`. Layout salta de mobile full-width a desktop 8+4 sin paso tablet (768–1023px). Decisión de diseño fuera del scope de 5-3.
- **`HelmetProvider` no verificado en árbol de componentes** — Si el ancestro no tiene `<HelmetProvider>`, Helmet silently no-ops. Concern de setup de app, no de esta story.
- **Sin auth guard en ruta `/room/:code`** — `app.tsx`. Usuario no autenticado puede navegar directamente a una sala por URL sin ser redirigido a login. Pre-existing design decision.

## Deferred from: code review de 5-2-navbar-redesign (2026-04-06)

- **`tabClass`/`isActive` como funciones en el render body** — Micro-optimización; nuevas referencias de función en cada render, sin `useCallback`. Pre-existente como pattern en el proyecto. Revisar si se nota en profiling.
- **`<nav>` sin `aria-label`** — WCAG 2.1: si hay múltiples landmarks `<nav>` en la página (e.g., footer), los lectores de pantalla no pueden distinguirlos. Preocupación a nivel de proyecto; agregar en una story de accesibilidad futura.
- **`setup()` override type `Record<string, unknown>`** — Usar `Partial<ReturnType<typeof useAuth>>` para tipado seguro de los overrides. Patrón pre-existente en los tests del proyecto.
- **Sin `role="menu"` / `role="menuitem"` en dropdown móvil** — El disclosure navigation pattern requiere ARIA roles para screen readers. Fuera del alcance de 5-2; agregar en story de accesibilidad futura.
- **Initials con display names que contienen palabras solo de espacios o caracteres emoji/CJK** — `w[0]` para emoji devuelve el primer UTF-16 code unit (surrogate pair roto). Problema de calidad de datos a nivel OAuth/perfil.
- **Retorno de foco al botón hamburger al cerrar con Escape** — `setMenuOpen(false)` no restaura el foco al botón trigger. WCAG 2.1 §2.4.3. Agregar `hamburgerButtonRef.current?.focus()` en una story de a11y.
- **Sin `touchstart` listener para click-outside** — Solo `mousedown`. El `mousedown` synthesizado cubre la mayoría de los navegadores móviles pero no todos. Revisar si se reportan issues en producción mobile.

## Deferred from: code review de 5-1-design-system-migration (2026-04-06)

- **Guards SSR/localStorage en `use-theme.ts`** — `getSystemTheme()` llama `window.matchMedia` sin verificar si `window` existe; `localStorage.getItem` en el initializer puede lanzar SecurityError. Pre-existente; agregar guards si se agrega SSR o renderizado en entorno sin navegador.
- **`useTheme` fuera de ThemeProvider** — Retorna valores por defecto del contexto sin señalar el error. Pre-existente; agregar throw en producción si se detecta uso incorrecto.
- **Race condition en cleanup del mediaQuery listener** — Si el componente se desmonta mientras un evento de cambio está en cola, el handler puede dispararse post-cleanup. Pre-existente; verificar en React StrictMode.
- **Google Fonts stylesheet es render-blocking** — El patrón `<link rel="stylesheet">` bloquea el render. Pattern definido por spec. Para optimizar, considerar `media="print" onload` trick o font-display swap en una story de performance futura.
- **`removeEventListener` no validado en tests** — El mock de `vi.fn()` para `removeEventListener` no verifica que el cleanup del effect remueva el handler correcto. Cobertura menor; revisar en un ciclo de testing exhaustivo.

## Deferred from: code review de 4-6-public-user-profiles (2026-04-05)

- **usePublicProfile sin staleTime** — El hook no tiene `staleTime` configurado, lo que provoca un re-fetch en cada mount. El perfil público es relativamente estático. Agregar `staleTime: 60_000` para reducir carga en rutas populares.
- **countryPercentile puede ser NaN si globalTotal=0** — `Math.round((1 - (globalRank - 1) / 0) * 100)` produce NaN. Pre-existente en LeaderboardService. Agregar guard `globalTotal > 0 ? ... : 0` cuando se limpie el módulo de leaderboard.
- **profile.id stale desde cache puede disparar queries de stats para el usuario incorrecto** — Durante navegación de `/u/slug-A` a `/u/slug-B`, si React Query tiene una entrada en caché para slug-A, el componente puede renderizar brevemente con el id del usuario anterior. Bajo impacto por los query keys distintos, pero revisitar si se reportan datos cruzados en producción.

## Deferred from: code review de 4-5-automated-leaderboard-updates (2026-04-04)

- **Llamadas redundantes a `invalidateForLevel` cuando N jugadores baten PB** — En una partida donde múltiples jugadores superan su marca personal en el mismo nivel, `invalidateForLevel` se llama N veces ejecutando N×2 SCAN sweeps. La caché queda consistente pero Redis recibe trabajo innecesario. Agregar deduplicación por nivel dentro del loop de `persistResults` si se vuelve un hotspot.
- **Patrón `'leaderboard:level:ALL:*'` hardcodeado en `invalidateForLevel`** — El string está duplicado manualmente en lugar de derivarse de `buildCacheKey`. Si el prefijo de caché cambia, `invalidateForLevel` dejará de limpiar las keys ALL silenciosamente.
- **Test "no lanza excepcion si query previo falla" no verifica si `checkAndInvalidateLeaderboard` fue alcanzado** — El test aserta `not.toHaveBeenCalled()` sobre `invalidateForLevel`, que es verdadero tanto si el error fue atrapado dentro del método como si el método nunca fue llamado. Agregar spy o log assertion para distinguir ambos casos.
- **Spread variádico `redis.del(...keysToDelete)` sin límite de batch** — Teórico para keyspaces grandes. Para esta app el número de keys por nivel está acotado por combinaciones country×period (decenas, no miles). Revisar si el deploy se expone a keyspaces con cientos de keys por nivel.

## Deferred from: code review de 4-4-leaderboard-filtering-level-country-period (2026-04-03)

*Sin items diferidos — todos los findings fueron patcheados.*

## Deferred from: code review de 4-3-global-leaderboard (2026-04-02)

- **getUserPosition ejecuta 4-5 queries secuenciales sin transacción** — Entre query 1 (best score) y las queries de rank, un nuevo match result podría insertarse, haciendo el snapshot inconsistente. Patrón pre-existente en el proyecto.
- **Cálculo de período con `Date.now()` ignora DST** — `Date.now() - N*days` puede cruzar un cambio horario y dar resultados levemente incorrectos. Afecta también match-results, es pre-existente.
- **Sin invalidación activa del cache al guardar nuevo resultado** — Un usuario que gana una partida ve datos stale por hasta 12h. Resuelto en Story 4-5 (automated-leaderboard-updates).
- **Period filter fijo en `'all'` sin UI** — El frontend no expone selector de período en LeaderboardPage. Planificado como feature V2 junto con 4-4 (level-country-period filtering).
- **Endpoint `/leaderboard/position` no cacheado en Redis** — Genera 4 queries DB por cada request de usuario autenticado. Evaluar si agregar cache per-user en 4-5 o 4-4.

## Deferred from: code review de 4-2-personal-history-progression-dashboard (2026-04-02)

- **Sin test HTTP-level de routing GET /matches/stats vs GET /matches** — Controller spec instancia la clase directamente; el orden `@Get('stats')` antes de `@Get()` no está cubierto por ningún test de transporte. Gap e2e pre-existente en el proyecto.
- **Sin respuesta 400 para query params malformados** — `level=abc`, `period=invalid` se descartan silenciosamente y se usan defaults. Patrón por convención del proyecto; ajustar si se agrega validación global con class-validator.

## Deferred from: code review de 4-1-match-results-persistence (2026-04-02)

- **Ruta del controller 'matches' vs 'match-results'** — Naming convention discutible. El controller usa `@Controller('matches')` pero el recurso son match *results*. No bloquea funcionalidad.
- **Sin campo updatedAt en MatchResult** — Inconsistente con modelos User y Text que sí lo tienen. Match results son inmutables, así que no es necesario.
- **Sin constraints DB-level en valores numéricos** — No hay CHECK constraints para missingChars ≥ 0, rank ≥ 1, wpm ≥ 0, precision 0-100. Patrón pre-existente en el proyecto.
- **Controller spec no ejercita JwtAuthGuard** — El test unitario instancia el controller directamente sin pasar por NestJS routing. Patrón estándar para unit tests; guard se valida en e2e.
- **matchCode sin índice standalone** — No hay query actual que busque por matchCode solo. Agregar cuando se implemente vista por partida.
- **Sin rate-limiting específico para GET /matches** — El throttle global (120 req/min) cubre. Ajustar si se detecta abuso.
- **Si cleanupMatch lanza o cuelga, match:end nunca se emite** — Concern arquitectural pre-existente en endMatch(). Aplicar try/catch alrededor de cleanup + emit si se refactoriza.

## V2: Replay de partida terminada (2026-04-01)

- **Replay cuando el usuario llega tarde a una partida** — Cuando un usuario recibe un link de sala y la partida ya terminó (sala expirada en Redis), permitir ver un replay de la partida. Requiere: (1) persistir eventos de match (keystrokes, posiciones, timestamps) en una tabla `match_events` en Postgres al finalizar cada partida, (2) endpoint REST para obtener los datos del replay, (3) reproductor en frontend que reconstruya la partida frame a frame mostrando el progreso de cada jugador. Feature de engagement alto, complejidad media-alta.

## Deferred from: code review de 3-5-bug-fixes-and-ux-polish (2026-03-30)


## Deferred from: code review de 3-4-spectator-to-player-transition (2026-03-30)

- **Socket reference `s` podría estar stale en LOBBY_STATE handler** — `use-lobby.ts:149`. Si el socket se cierra/reconecta mientras el handler registrado en el `useEffect([code])` aún apunta al socket anterior, el `emit(LOBBY_SWITCH_TO_PLAYER)` iría a un socket muerto. Patrón pre-existente desde story 2-2, presente en todos los handlers del mismo `useEffect`. Impacto bajo (Socket.io maneja sockets desconectados gracefully).

## Deferred from: code review de 3-3-live-spectator-view (2026-03-30)

- **`textLength === 0` muestra 0% para todos antes de que llegue el texto** — `spectator-leaderboard.tsx`. La guard `textLength > 0` suprime la división por cero pero no indica que los datos están cargando. Bajo impacto visual (ventana brevísima entre join y MATCH_START).
- **Sort inestable para jugadores con igual position** — `spectator-leaderboard.tsx`. Dos jugadores en 0% al inicio de carrera pueden renderizar en orden arbitrario y causar parpadeo de números. V8 es stable sort en práctica; cosmético.
- **Ghost caret del espectador si server incluye su ID en players array** — `arena-page.tsx`. Si `matchData.players` incluye el `localUserId` del espectador (e.g., jugador promovido a espectador mid-flight), se renderiza un `MultiplayerCaret` que nunca se mueve. Pre-existente desde story 3-1.
- **`caret:sync`-driven reordering no cubierto en unit tests** — `spectator-leaderboard.spec.tsx`. El test usa `updatePlayerPosition` directo al store; no hay cobertura del path socket → `useCaretSync` → store → rerender. Requeriría mock de socket events, fuera del alcance de unit tests.

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

## Deferred from: code review of 5-12-leaderboard-page-visual-design (2026-04-13)

- **Percentil "Top 96% del mundo" del widget Tu Posición Global queda solo en `title` tooltip** — regresión de accesibilidad móvil (no hover touch). El dato `globalTotal` era visible antes del rediseño. Restaurar como texto secundario muted bajo el rank.
- **`material-symbols-outlined` sin fallback textual si la fuente falla** — patrón pre-existente en Epic 5 (arena, lobby, leaderboard). Considerar un polyfill o ligar `@import` Material Symbols a un `visibility: hidden` por defecto con reveal post-load.
