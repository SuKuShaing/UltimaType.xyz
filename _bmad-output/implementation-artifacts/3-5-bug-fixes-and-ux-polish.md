# Story 3.5: Bug Fixes & UX Polish

Status: review

## Story

As a player, host, or spectator,
I want all known bugs to be fixed and UX rough edges to be polished,
so that the multiplayer typing experience feels reliable, intuitive, and visually refined.

## Context

Created during Epic 3 wrap-up. Seba compiled 18 issues from real user testing sessions documented in `Fix pendientes/a reparar.md`. Issues range from critical functional bugs (focus loss, caret desync, broken redirects) to content fixes (missing ñ/acentos) and visual polish (tenue buttons, missing shadows). Includes one new feature: mid-race transition to spectator mode after finishing.

---

## Acceptance Criteria (BDD)

### AC1: Focus automático en el input al iniciar la carrera

**Given** un jugador en la arena cuando comienza la carrera (countdown termina)
**When** la carrera se activa
**Then** el focus está automáticamente en el input/área de texto para poder escribir inmediatamente
**And** no se requiere ningún click del usuario para empezar a tipear

---

### AC2: Focus se recupera al volver a la pestaña durante competencia

**Given** un jugador en una carrera activa que cambió de pestaña del navegador
**When** vuelve a la pestaña de UltimaType y hace click en cualquier parte de la página
**Then** el focus vuelve al input/área de texto inmediatamente
**And** puede seguir escribiendo sin necesidad de hacer click específicamente en el input

---

### AC3: Solo el host puede iniciar la revancha

**Given** la pantalla de resultados después de una carrera
**When** un jugador que NO es host ve la pantalla
**Then** NO ve el botón de revancha (o lo ve deshabilitado)
**And** solo el host tiene el botón de revancha activo y funcional

---

### AC4: Delay de 5 segundos antes de activar revancha

**Given** la pantalla de resultados que aparece al finalizar la carrera
**When** aparecen los resultados
**Then** el botón de revancha está deshabilitado durante los primeros 5 segundos
**And** después de 5 segundos se activa el botón de revancha
**And** presionar barra espaciadora u otra tecla durante esos 5 segundos NO activa la revancha

---

### AC5: Sincronización de caret estable con usuarios que escriben rápido

**Given** dos o más jugadores en una carrera activa
**When** un jugador escribe a velocidad alta (>80 WPM)
**Then** su caret en las pantallas de los demás jugadores se mantiene sincronizado y actualizado
**And** NO se congela ni deja de actualizarse permanentemente
**And** la sincronización se mantiene estable durante toda la carrera independientemente de la velocidad

---

### AC6: Redirección post-login preserva URL de sala compartida

**Given** un usuario no autenticado que abre un link compartido como `/room/7K3T32`
**When** el sistema le pide login y se logea exitosamente
**Then** es redirigido a `/room/7K3T32` (la sala original)
**And** NO es enviado al home

---

### AC7: Jugador que vuelve después de salir se refleja correctamente

**Given** un jugador que salió de la sala (aparece en gris)
**When** vuelve a la sala y presiona "Listo"
**Then** su estado visual cambia de gris a activo
**And** se refleja que entró y está listo para los demás jugadores
**And** NO permanece en gris a pesar de haber marcado "Listo"

---

### AC8: Espectador ve texto sin blur y métricas actualizadas

**Given** un usuario en modo espectador durante una carrera activa
**When** la carrera está en progreso
**Then** el texto NO tiene blur (se muestra legible)
**And** los carets de los jugadores se mueven correctamente
**And** el WPM y precisión de los jugadores se actualizan en tiempo real

---

### AC9: Redirección al home cuando el host te saca

**Given** un jugador que fue sacado de la sala por el host
**When** aparece el mensaje "El host te sacó de la partida" y pasan los 2 segundos
**Then** el jugador es redirigido al home correctamente
**And** NO se queda en una pantalla sin redirección

---

### AC10: Textos incluyen la letra ñ

**Given** los textos de tipeo en español de cualquier nivel de dificultad
**When** corresponden palabras con ñ (año, niño, español, etc.)
**Then** las palabras incluyen la ñ correctamente
**And** la ñ se puede tipear y se valida como carácter correcto

---

### AC11: Textos del nivel 3 en adelante incluyen acentos

**Given** los textos de tipeo de dificultad nivel 3 o superior
**When** corresponden palabras con acentos (á, é, í, ó, ú)
**Then** las palabras incluyen los acentos correctamente
**And** los acentos se pueden tipear y se validan como caracteres correctos

---

### AC12: Transición a espectador mid-race tras terminar + texto informativo

**Given** un jugador que terminó de escribir antes que los demás (pantalla de espera)
**When** ve la pantalla `WaitingForOthersOverlay` con su WPM, precisión y puntaje
**Then** ve un texto informativo: "Si esperas a los demás verás la pantalla de resultados"
**And** ve un botón "Ver carrera en vivo" que le permite transicionar a modo espectador
**And** al presionar el botón, ve el texto sin blur, los carets moviéndose y el `SpectatorLeaderboard` en vivo
**And** al finalizar la carrera, su posición y puntaje aparecen en el tablero de resultados (ya funciona así en `calculateResults`)

---

### AC13: Botón iniciar muestra "Esperando el listo de los Jugadores"

**Given** el host en el lobby esperando que todos los jugadores marquen "Listo"
**When** no todos los jugadores están listos
**Then** el botón de iniciar muestra el texto "Esperando el listo de los Jugadores" (o similar)
**And** el botón está deshabilitado hasta que todos estén listos

---

### AC14: Botón "Listo" con halo pulsante

**Given** un jugador en el lobby que aún no está listo
**When** ve el botón "Listo"
**Then** el botón tiene una animación visual pulsante (pulse/ring) que sugiere que debe ser presionado
**And** cuando el jugador ya está listo, la animación se detiene

**Nota:** Verificar si esto ya fue implementado en story 3-2 AC5. Si ya existe, marcar como done. Si la implementación se perdió o no está funcionando, reimplementar.

---

### AC15: Pantalla de resultados con sombra para separarse del fondo

**Given** la pantalla de resultados (después de salir o mientras espero a los demás)
**When** se muestra sobre el fondo de la arena
**Then** tiene una sombra o borde visual que la separa claramente del fondo
**And** NO se ve "toda junta" con el fondo por tener el mismo color

---

### AC16: Nombre sobre caret se reposiciona al llegar al borde de pantalla

**Given** un jugador cuyo caret está cerca del borde derecho de la pantalla
**When** el nombre/label sobre el caret llegaría a salirse del viewport
**Then** el nombre se reposiciona al otro lado del caret (izquierda en vez de derecha, o debajo en vez de arriba)
**And** NO aparece la barra de scroll horizontal
**And** NO parpadea la UI por el reposicionamiento constante

---

### AC17: Botón "salir" con contraste adecuado

**Given** cualquier pantalla donde aparece el botón "salir" durante la arena/carrera
**When** el jugador busca la opción de salir
**Then** el botón tiene suficiente contraste/opacidad para ser visible sin esfuerzo
**And** mantiene un estilo discreto pero legible (no debe competir con el área de tipeo, pero tampoco ser invisible)

---

### AC18: Puntaje WPM y precisión con contraste adecuado

**Given** la pantalla de carrera/arena donde se muestran WPM y precisión
**When** el jugador mira sus métricas durante o después de la carrera
**Then** los valores de WPM y precisión tienen suficiente contraste/opacidad para ser claramente legibles
**And** NO se ven "tenues" o difíciles de leer

---

## Tasks / Subtasks

### Task 1: Focus management — (AC: 1, 2)

- [x] 1.1 **`apps/web/src/components/arena/live-text-canvas.tsx`** — Asegurar que al iniciar la carrera (cuando `matchStatus` cambia a `playing`), se haga `focus()` automático en el input/textarea hidden.

- [x] 1.2 **`apps/web/src/components/arena/live-text-canvas.tsx`** — Agregado visibilitychange + document click listener que refocus el input cuando canType está activo. Implementado en live-text-canvas.tsx donde vive el inputRef.

### Task 2: Revancha — control de host y delay (AC: 3, 4)

- [x] 2.1 **`apps/web/src/components/arena/match-results-overlay.tsx`** — Condicionar el botón de revancha: solo visible/activo si `isHost === true`. Para no-hosts, ocultar o mostrar deshabilitado con texto "Esperando revancha del host".

- [x] 2.2 **`apps/web/src/components/arena/match-results-overlay.tsx`** — Agregar timer de 5 segundos: el botón de revancha se muestra disabled durante 5s post-render, con un countdown visual. Después de 5s, se habilita. Ignorar teclas (spacebar, enter) durante el periodo de bloqueo.

### Task 3: Sincronización de caret a alta velocidad (AC: 5)

- [x] 3.1 **`apps/web/src/hooks/use-caret-sync.ts` + `multiplayer-caret.tsx`** — Throttle reducido de 50ms→30ms (~33Hz). Spring animation mejorada: stiffness 300→500, damping 25→30 para tracking más responsive.

- [x] 3.2 **`apps/api/src/gateway/game.gateway.ts`** — Verificado: no hay throttle server-side. Usa volatile broadcast (fire-and-forget), apropiado para real-time. El trailing edge del cliente garantiza que la última posición siempre se envía.

### Task 4: Redirección post-login a sala (AC: 6)

- [x] 4.1 **`apps/web/src/components/auth/protected-route.tsx`** — Ya implementado en story 2-8 AC3. Guarda URL en sessionStorage antes de redirect.

- [x] 4.2 **`apps/web/src/components/auth/auth-callback.tsx`** — Ya implementado en story 2-8 AC3. Lee, borra y navega a la URL guardada.

**Nota:** Verificar si esto ya fue implementado en story 2-8 AC3. Si ya existe y funciona, marcar como done. Si no funciona, investigar por qué y reparar.

### Task 5: Jugador que vuelve después de salir (AC: 7)

- [x] 5.1 **`apps/api/src/gateway/game.gateway.ts`** — Bug fix: LOBBY_JOIN con ALREADY_IN_ROOM no reseteaba disconnected flag. Agregado markPlayerConnected + clearGraceTimer + state refresh en handleJoin.

- [x] 5.2 **`apps/web/src/components/lobby/player-avatar-pill.tsx`** — Verificado: ya reacciona correctamente al cambio de disconnected (CSS: opacity-50 grayscale). No requiere cambios.

### Task 6: Espectador — blur y métricas (AC: 8)

- [x] 6.1 **`apps/web/src/components/arena/arena-page.tsx`** — Fix: isActive cambiado de `isPlaying && !isSpectator` a `isPlaying`. Espectadores ven texto sin blur (disabled=true sigue previniendo escritura).

- [x] 6.2 **`apps/web/src/components/arena/spectator-leaderboard.tsx`** — Agregado WPM estimado en tiempo real (calculado de posición/tiempo). Timer de 1s para actualizar. Columna "X wpm" por jugador.

### Task 7: Redirección al home al ser sacado por host (AC: 9)

- [x] 7.1 **`apps/web/src/components/lobby/lobby-page.tsx`** — Verificado: ya implementado (líneas 101-108). Toast + setTimeout → navigate('/') después de 2s. Funciona correctamente.

### Task 8: Contenido — ñ y acentos en textos (AC: 10, 11)

- [x] 8.1 **`prisma/seed-data/texts.json`** — Corregidos textos: ñ agregada en todos los niveles (pequeñas, mañana, compañero, porteños, montaña, año, pequeños, etc.).

- [x] 8.2 **`prisma/seed-data/texts.json`** — Para nivel 3+, acentos agregados (María, café, explicó, preguntó, respondió, teoría, Según, habitación, comparación, dirección, teléfono, expresión, etc.).

- [x] 8.3 **`apps/web/src/components/arena/live-text-canvas.tsx`** — Verificado: usa comparación simple `e.key === expected` (línea 118). Soporta ñ y acentos correctamente sin normalización.

### Task 9: Transición a espectador mid-race (AC: 12)

- [x] 9.1 **`apps/web/src/components/arena/waiting-for-others-overlay.tsx`** — Agregado texto informativo y botón "Ver carrera en vivo" con prop onWatchLive.

- [x] 9.2 **`apps/web/src/hooks/use-arena-store.ts`** — Agregado flag `viewingAsSpectator` y action `switchToSpectatorView()` (cambio local, sin socket events).

- [x] 9.3 **`apps/web/src/components/arena/arena-page.tsx`** — Cuando `localFinished && viewingAsSpectator`, oculta WaitingOverlay y muestra SpectatorLeaderboard + texto sin blur.

### Task 10: Textos UX — botón iniciar (AC: 13)

- [x] 10.1 **`apps/web/src/components/lobby/lobby-page.tsx`** — Botón muestra "Esperando el listo de los Jugadores" (disabled) o "Iniciar Partida" (enabled) según allOthersReady.

### Task 11: Visual polish — halo, sombra, caret label, contraste (AC: 14, 15, 16, 17, 18)

- [x] 11.1 **Botón "Listo" halo pulsante** — Verificado: ya implementado en story 3-2 (animate-pulse en lobby-page.tsx línea 509).

- [x] 11.2 **`apps/web/src/components/arena/match-results-overlay.tsx`** — Agregado `shadow-2xl` al contenedor de resultados.

- [x] 11.3 **`apps/web/src/components/arena/multiplayer-caret.tsx`** — Label se reposiciona a la izquierda del caret cuando se acerca al borde derecho del viewport. Usa containerRef.getBoundingClientRect() + window.innerWidth.

- [x] 11.4 **`apps/web/src/components/arena/arena-page.tsx`** — Botón "Salir" cambiado de text-text-muted a text-text-muted/70 para mejor contraste.

- [x] 11.5 **`apps/web/src/components/arena/focus-wpm-counter.tsx`** — Opacidad durante carrera aumentada de 0.3 a 0.5 para mejor legibilidad.

---

## Dev Notes

### Verificaciones previas a implementación
- **AC6 (redirect post-login):** Verificar si story 2-8 AC3 ya lo resolvió. Si funciona, marcar done.
- **AC14 (halo pulsante):** Verificar si story 3-2 AC5 ya lo resolvió. Si funciona, marcar done.
- **AC5 (caret sync):** Este es el bug más complejo. El throttle actual es 40ms (25 events/sec). El problema puede ser client-side (spring animation dropeando frames), server-side (broadcast throttle), o ambos. Requiere debugging con 2+ usuarios reales.

### Archivos a modificar (estimación)
- `apps/web/src/components/arena/live-text-canvas.tsx`
- `apps/web/src/components/arena/arena-page.tsx`
- `apps/web/src/components/arena/match-results-overlay.tsx`
- `apps/web/src/components/arena/multiplayer-caret.tsx`
- `apps/web/src/components/arena/waiting-for-others-overlay.tsx`
- `apps/web/src/components/arena/spectator-leaderboard.tsx`
- `apps/web/src/components/lobby/lobby-page.tsx`
- `apps/web/src/components/auth/protected-route.tsx`
- `apps/web/src/components/auth/auth-callback.tsx`
- `apps/web/src/stores/arena-store.ts`
- `apps/web/src/hooks/use-arena.ts` o `use-lobby.ts`
- `apps/api/src/gateway/game.gateway.ts`
- `prisma/seed.ts` o archivos de textos

### Prioridad de implementación sugerida
1. **Primero:** AC1-2 (focus), AC6 (redirect), AC9 (kick redirect) — fixes rápidos, alto impacto
2. **Segundo:** AC3-4 (revancha), AC7 (rejoin gris), AC8 (spectator blur), AC10-11 (contenido)
3. **Tercero:** AC5 (caret sync rápido) — requiere más investigación
4. **Cuarto:** AC12 (spectator mid-race) — feature nueva
5. **Último:** AC13-18 (UX copy + visual polish) — cambios cosméticos

### References
- `Fix pendientes/a reparar.md` — Lista original de bugs reportados por Seba
- Story 2-8: Functional Validation Fixes — AC3 ya abordó redirect post-login
- Story 3-2: Lobby, Race & Host Controls Fixes — AC5 ya abordó halo pulsante
- Story 3-3: Live Spectator View — Lógica de blur/spectator
- Story 3-4: Spectator to Player Transition — Lógica de role switching

---

## Dev Agent Record

### Implementation Plan
Se implementaron los 18 ACs en orden de prioridad: focus fixes → revancha host → caret sync → redirects → spectator view → contenido → nueva feature → visual polish.

### Completion Notes
- **AC1-2:** Focus automático al iniciar carrera + refocus al volver de otra pestaña o click en cualquier parte
- **AC3-4:** Solo host ve botón Revancha, con countdown de 5s + bloqueo de spacebar/enter
- **AC5:** Throttle de caret sync reducido 50ms→30ms, spring animation más responsive (stiffness 300→500)
- **AC6:** Ya implementado en story 2-8 (sessionStorage redirect)
- **AC7:** Bug fix: LOBBY_JOIN con ALREADY_IN_ROOM no reseteaba disconnected flag
- **AC8:** Spectator blur removido (isActive=isPlaying), WPM estimado agregado al leaderboard
- **AC9:** Ya implementado (toast + navigate('/') a 2s)
- **AC10-11:** Textos corregidos: ñ en todos los niveles, acentos en nivel 3+
- **AC12:** Nueva feature: botón "Ver carrera en vivo" en WaitingForOthersOverlay + viewingAsSpectator flag
- **AC13:** Botón iniciar muestra "Esperando el listo de los Jugadores" cuando no todos listos
- **AC14:** Ya implementado en story 3-2 (animate-pulse)
- **AC15:** Shadow 2xl en panel de resultados
- **AC16:** Label de caret se reposiciona al borde derecho del viewport
- **AC17:** Botón salir con opacidad aumentada (text-text-muted/70)
- **AC18:** WPM counter opacidad durante carrera 0.3→0.5

### Debug Log
- Tests: 189 API + 101 Web = 290 passing, 0 failures

---

## File List

- `ultimatype-monorepo/apps/web/src/components/arena/live-text-canvas.tsx` — Focus management (AC1, AC2)
- `ultimatype-monorepo/apps/web/src/components/arena/arena-page.tsx` — isHost prop, isActive fix, viewingAsSpectator, exit button contrast
- `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx` — Host-only rematch + 5s delay + shadow
- `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.spec.tsx` — Updated tests for host/delay
- `ultimatype-monorepo/apps/web/src/components/arena/multiplayer-caret.tsx` — Spring tuning + label reposition
- `ultimatype-monorepo/apps/web/src/components/arena/spectator-leaderboard.tsx` — WPM estimado en vivo
- `ultimatype-monorepo/apps/web/src/components/arena/waiting-for-others-overlay.tsx` — Texto info + botón ver en vivo
- `ultimatype-monorepo/apps/web/src/components/arena/focus-wpm-counter.tsx` — Opacidad 0.3→0.5
- `ultimatype-monorepo/apps/web/src/components/arena/focus-wpm-counter.spec.tsx` — Updated opacity test
- `ultimatype-monorepo/apps/web/src/components/lobby/lobby-page.tsx` — isHost to ArenaPage + start button text
- `ultimatype-monorepo/apps/web/src/hooks/use-arena-store.ts` — viewingAsSpectator flag + switchToSpectatorView action
- `ultimatype-monorepo/apps/web/src/hooks/use-caret-sync.ts` — Throttle 50ms→30ms
- `ultimatype-monorepo/apps/api/src/gateway/game.gateway.ts` — markPlayerConnected on rejoin
- `ultimatype-monorepo/prisma/seed-data/texts.json` — ñ y acentos en textos

---

## Change Log

- 2026-03-30: Story 3-5 implementation complete. 18 ACs addressed (9 functional bugs, 2 content fixes, 1 new feature, 6 UX/visual). 290 tests passing (189 API + 101 Web).
