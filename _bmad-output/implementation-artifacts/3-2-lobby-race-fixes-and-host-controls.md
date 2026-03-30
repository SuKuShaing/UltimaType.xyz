# Story 3.2: Lobby, Race & Host Controls Fixes

Status: done

## Story

As a player or host,
I want all known UI/UX bugs to be fixed and missing host controls to be available,
so that the core multiplayer experience is polished and functional before spectator features are built on top of it.

## Acceptance Criteria (BDD)

### AC1: Bandera alineada en pantalla de resultados

**Given** la pantalla de resultados (`MatchResultsOverlay`)
**When** se muestra la fila de un jugador con un `countryCode`
**Then** la bandera está visualmente alineada en el eje vertical con el nombre del jugador
**And** no hay desplazamiento vertical ni "salto" visual entre el ícono del color, la bandera y el nombre

### AC2: Título "Sala de Espera" completamente visible

**Given** un usuario en la página del lobby (`LobbyPage`)
**When** carga la pantalla
**Then** el título "Sala de Espera" se muestra completo, sin que ninguna parte quede cortada por overflow o padding incorrecto

### AC3: Menú "..." dentro del rectángulo del jugador

**Given** la lista de jugadores en el lobby
**When** se renderiza un `PlayerAvatarPill` con menú de opciones
**Then** el botón "..." (o el menú de tres puntos) está contenido visualmente dentro de los límites del rectángulo del pill
**And** no sobresale ni aparece fuera del card

### AC4: Ícono de tema del sistema es un monitor/pantalla

**Given** el `ThemeToggle` en la navbar
**When** el tema activo es `"system"`
**Then** el ícono mostrado es un monitor o pantalla (no una tuerca ⚙)
**And** no causa confusión con un ícono de configuración

### AC5: Botón "Listo" con animación de llamada a acción

**Given** un jugador en el lobby que aún no está listo (`isReady === false`)
**When** ve el botón "Listo"
**Then** el botón tiene una animación visual (pulse, ring, o similar) que sugiere que debe ser presionado
**And** cuando el jugador ya está listo (`isReady === true`), la animación se detiene

### AC6: Contraste adecuado en modo light en toda la UI

**Given** la aplicación en modo light
**When** cualquier pantalla (lobby, arena, resultados, perfil) es mostrada
**Then** los botones de selección no activos (ej: niveles de dificultad 2-5, opciones de tiempo no seleccionadas) tienen suficiente contraste visual contra el fondo
**And** el ratio de contraste cumple con NFR22 (≥4.5:1) para texto sobre botones
**And** el cambio se aplica globalmente a través de las variables CSS del tema

### AC7: Avatar del otro jugador visible en la primera sesión

**Given** dos usuarios en el mismo lobby por primera vez
**When** el segundo jugador se une a la sala
**Then** el avatar del primer jugador es visible para el segundo jugador SIN necesidad de salir y volver a entrar
**And** el avatar del segundo jugador es visible para el primer jugador inmediatamente al unirse

### AC8: Indicador visual inmediato cuando un jugador se desconecta del lobby

**Given** dos o más jugadores en el lobby
**When** uno de ellos abandona la sala o pierde conexión
**Then** los demás jugadores ven INMEDIATAMENTE al jugador saliente en un estado visual "desconectado" (opacidad reducida, o texto "Saliendo...")
**And** el jugador es removido definitivamente de la lista al confirmar la desconexión
**And** NO permanece en la lista con su estado normal por varios segundos antes de desaparecer

### AC9: Caret propio muestra el color asignado (no siempre naranja)

**Given** un jugador que ingresa a una partida con un `colorIndex` asignado (ej: índice 3 = Rose `#F43F5E`)
**When** la carrera comienza y el jugador tipea
**Then** su propio caret (el cursor que él ve) tiene el color de `PLAYER_COLORS[colorIndex]`
**And** NO es siempre naranja (`#FF9B51`) independientemente del color asignado

### AC10: Carets de otros jugadores permanecen sincronizados durante toda la carrera

**Given** dos o más jugadores en una partida activa
**When** los jugadores avanzan más allá de las primeras palabras del texto
**Then** el caret de cada jugador en la pantalla del otro refleja correctamente su posición actual
**And** NO se "congela" ni queda desactualizado después de cierto punto del texto

### AC11: Botón para salir de la partida con puntaje parcial

**Given** un jugador en una carrera activa (arena en progreso)
**When** presiona el botón "Salir" (visible pero discreto, fuera del área de enfoque)
**Then** aparece un modal de confirmación: "¿Salir de la partida? Se registrará tu puntaje parcial."
**And** al confirmar, se muestra una pantalla de resultados con el WPM y precisión acumulados hasta ese momento
**And** el servidor es notificado del abandono del jugador (tratado como `player:finish` con estado `abandoned: true`)
**And** los demás jugadores ven al jugador desaparecer normalmente (igual que una desconexión)

### AC12: Host puede expulsar o mover jugadores a espectadores

**Given** el host en el lobby, al hacer hover sobre el `PlayerAvatarPill` de otro jugador (no el suyo)
**When** el host ve aparecer el menú de opciones del jugador
**Then** ve dos opciones: "Sacar jugador" y "Pasar a espectador"

**Given** el host elige "Sacar jugador"
**When** confirma la acción
**Then** el jugador expulsado recibe un mensaje: "El host te sacó de la partida"
**And** el jugador expulsado es redirigido fuera del lobby (a la página de inicio)
**And** su slot se libera en la lista de jugadores

**Given** el host elige "Pasar a espectador"
**When** confirma la acción
**Then** el jugador afectado recibe un mensaje: "El host te cambió a espectador"
**And** su rol en la sala cambia a `spectator` (pierde slot de jugador, aparece en lista de espectadores)
**And** ya no ve los controles de "Listo" ni puede triggerar acciones de jugador

---

## Tasks / Subtasks

### Task 1: Fixes visuales simples — sin cambios de backend (AC: 1, 2, 3, 4)

- [x] 1.1 **Fix bandera desalineada** [`match-results-overlay.tsx`]:
  - Verificar el wrapper del flag en la fila de resultados (alrededor de línea 90)
  - Asegurar que el `<span>` del flag use `className="inline-flex items-center"` en lugar de `inline-block align-middle`
  - Verificar que el `<CountryFlag>` no tenga `verticalAlign: 'middle'` en conflicto con Flexbox si el padre ya usa `flex items-center`

- [x] 1.2 **Fix título "Sala de Espera" cortado** [`lobby-page.tsx`]:
  - Verificar el contenedor del título (`<h1>` o similar) cerca de la línea 150-180
  - Buscar `overflow-hidden`, `clip`, o `padding-top` insuficiente que corte la parte superior
  - El título se ve cortado en la parte superior — probablemente el contenedor tiene `pt-0` o margen negativo

- [x] 1.3 **Fix "..." fuera del rectángulo** [`player-avatar-pill.tsx`]:
  - Localizar el botón de tres puntos en el componente
  - El `...` aparece fuera del card: moverlo dentro del flex layout, al final del contenido (después del estado "Esperando")
  - Usar `overflow: hidden` en el card container para garantizar contención, o reposicionarlo con `flex-shrink-0` dentro del layout existente
  - Asegurar que el botón sea `shrink-0` y no expulse al resto del contenido

- [x] 1.4 **Fix ícono de tema = monitor** [`theme-toggle.tsx`]:
  - Verificar qué librería de íconos usa el proyecto (buscar imports de `lucide-react`, `@heroicons`, o similares en otros componentes)
  - Reemplazar el carácter `'\u2699'` (⚙) del tema `system` por un ícono de monitor
  - Si usa lucide-react: importar `Monitor` de `lucide-react` y renderizarlo para el estado `system`
  - Si no hay librería de íconos disponible: usar el caracter `'\u2315'` o un SVG inline simple de monitor
  - El ícono para `light` (sol) y `dark` (luna) pueden mantenerse

### Task 2: Animación en botón "Listo" (AC: 5)

- [x] 2.1 **Agregar animación pulse** [`lobby-page.tsx` líneas 425-433]:
  - Al botón "Listo" cuando `!currentPlayer.isReady`, agregar clase `animate-pulse` de Tailwind
  - Alternativamente usar `ring-2 ring-primary ring-offset-2 animate-ping` para un efecto de ring pulsante
  - Ejemplo de clases combinadas:
    ```tsx
    className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
      currentPlayer.isReady
        ? 'bg-success/20 text-success'
        : 'bg-primary text-surface-base animate-pulse'
    }`}
    ```
  - Verificar que la animación no sea excesivamente distractora — si `animate-pulse` es demasiado, considerar `hover:scale-105 transition-transform`

### Task 3: Contraste en modo light (AC: 6)

- [x] 3.1 **Ajustar variable `--color-surface-raised` en light mode** [`styles.css`]:
  - La variable actual `--color-surface-raised: #FFFFFF` hace que los botones no-activos sean invisibles sobre el fondo
  - Cambiar a `#EAEFF0` o `#E8EEEE` para dar contraste suficiente contra `--color-surface-base: #F5FAFA`
  - Asegurar que el contraste texto/botón siga cumpliendo NFR22 (≥4.5:1)

- [x] 3.2 **Verificar en pantallas afectadas** después del cambio:
  - Sala de espera: botones de nivel de dificultad (1-5)
  - Sala de espera: botones de límite de tiempo
  - Dropdown "Máximo jugadores"
  - Botones "Salir" (estilo secundario) en cualquier pantalla
  - Navbar en light mode

### Task 4: Fix avatar no carga en primera sesión (AC: 7)

- [x] 4.1 **Investigar la fuente del bug**:
  - En `use-lobby.ts` (o equivalente), localizar dónde se recibe el `LOBBY_STATE` inicial del WS
  - El `avatarUrl` probablemente llega `null` o `undefined` en el primer join porque el usuario aún no se ha cargado desde la DB
  - Buscar en `game.gateway.ts`: método `handleJoin` — ¿cómo se obtiene el `avatarUrl` del jugador que se une? ¿Se consulta a `UsersService`?

- [x] 4.2 **Fix en el backend** [`game.gateway.ts`]:
  - En `handleJoin`, asegurar que el `userInfo` que se almacena en Redis incluya el `avatarUrl` desde la DB (vía `usersService.findById(userId)`)
  - Si se usa `JwtPayload` directamente (que puede no incluir `avatarUrl`), hacer una consulta adicional a `UsersService`

- [x] 4.3 **Fix alternativo en frontend** si el bug es de hidratación:
  - En `player-avatar-pill.tsx`, si `avatarUrl` es `null`, mostrar el fallback visual inmediatamente (con las iniciales del nombre usando el color asignado)
  - El fallback ya puede existir — verificar que no haya una condición que renderice un `<img>` con `src=""` en vez del fallback

### Task 5: Indicador visual de desconexión en lobby (AC: 8)

- [x] 5.1 **Verificar el campo `disconnected`** en `PlayerInfo` (en `libs/shared/src/dto/room.dto.ts`):
  - Story 2-6 implementó el campo `disconnected: boolean` en `PlayerInfo`
  - Confirmar que cuando un jugador se desconecta abruptamente, el gateway emite un `LOBBY_STATE` con ese jugador marcado como `disconnected: true` ANTES de removerlo

- [x] 5.2 **UI de estado desconectado** [`player-avatar-pill.tsx`]:
  - Cuando `player.disconnected === true`, aplicar estas clases al pill:
    ```tsx
    className={`... ${player.disconnected ? 'opacity-50 grayscale' : ''}`}
    ```
  - Cambiar el texto de estado de "Esperando" a "Saliendo..." cuando `disconnected === true`
  - El indicador de color (círculo) debería verse gris: `style={{ backgroundColor: player.disconnected ? '#64748B' : color }}`

- [x] 5.3 **Si `disconnected: true` no se emite en lobby** (solo en arena):
  - En `game.gateway.ts`, método `handleDisconnect`, cuando el juego está en estado `waiting`:
    - Primero emitir `LOBBY_STATE` con el jugador marcado como `disconnected: true`
    - Luego esperar ~1-2 segundos (o el TTL de grace period)
    - Luego remover al jugador y emitir `LOBBY_STATE` final sin ese jugador

### Task 6: Fix caret propio siempre naranja (AC: 9)

- [x] 6.1 **Identificar dónde se inicializa el caret del jugador local** [`multiplayer-caret.tsx` o `arena-page.tsx`]:
  - Buscar dónde se instancia `MultiplayerCaret` para el jugador local
  - El problema puede ser: al renderizar el caret del jugador local, se pasa `colorIndex: 0` hardcodeado (que es `#FF9B51` naranja) en vez del `colorIndex` real asignado

- [x] 6.2 **Verificar el flujo de `colorIndex`**:
  - En `arena-page.tsx` o `use-arena-socket.ts`: cuando llega `match:start`, ¿se extrae el `colorIndex` del jugador local desde `roomState.players`?
  - En `use-lobby.ts`: ¿el estado local del jugador incluye su `colorIndex` asignado?
  - El `colorIndex` se asigna en el backend al hacer `joinRoom` (story 2-2) — verificar que llegue correctamente al componente del caret local

- [x] 6.3 **Fix**: Asegurar que al renderizar el caret del jugador local, se use:
  ```tsx
  <MultiplayerCaret
    playerId={currentPlayer.id}
    colorIndex={currentPlayer.colorIndex}  // NO hardcodear 0
    isLocal={true}
    ...
  />
  ```

### Task 7: Fix caret desync tras avanzar palabras (AC: 10)

- [x] 7.1 **Investigar el mecanismo de sincronización** en `use-arena-socket.ts` o similar:
  - ¿Las posiciones de caret se envían como **índice de carácter** (número entero) o como **coordenadas de píxel**?
  - ¿El receptor convierte índice → posición en píxeles usando `getBoundingClientRect` de los spans de texto?

- [x] 7.2 **Hipótesis principal — reseteo de posición acumulativa**:
  - Si la posición del caret se calcula acumulando deltas, puede haber un overflow o pérdida de actualizaciones que causa divergencia
  - Si la posición es un índice absoluto de carácter, verificar que el mapeo carácter → píxel se recalcula correctamente en cada render del canvas

- [x] 7.3 **Hipótesis alternativa — throttle descarta actualizaciones**:
  - El throttle de 50ms puede estar descartando eventos intermedios durante tipeo rápido
  - Si el cliente envía "posición 5", "posición 6", "posición 7" rápidamente y el throttle solo envía la posición 7, el receptor puede no renderizar las intermedias
  - Verificar que el throttle use `leading: true, trailing: true` (Lodash throttle) para capturar el último evento siempre

- [x] 7.4 **Hipótesis alternativa — Zustand store no resetea entre partidas**:
  - Si el store de Zustand que guarda las posiciones de los carets no se limpia al iniciar una nueva partida, puede quedar con posiciones de la partida anterior
  - Verificar que en `match:start`, el store de posiciones de carets se resetea a 0 para todos los jugadores

- [x] 7.5 **Fix**: Según la hipótesis confirmada en 7.1-7.4:
  - Si es throttle: ajustar opciones de Lodash throttle
  - Si es store sucio: agregar `resetCaretPositions()` en el handler de `match:start`
  - Si es cálculo de píxeles: forzar recalculation en el siguiente frame con `requestAnimationFrame`

### Task 8: Botón salir de partida con puntaje parcial (AC: 11)

- [x] 8.1 **Shared layer — nuevo evento WS** [`libs/shared/src/websocket/events.ts`]:
  - Agregar `PLAYER_ABANDON = 'player:abandon'` a `WS_EVENTS`

- [x] 8.2 **Backend** [`gateway/game.gateway.ts`]:
  - Crear handler `handlePlayerAbandon` para el evento `player:abandon`:
    - Verificar que el jugador esté en una partida activa (`match:in-progress`)
    - Recibir payload: `{ wpm: number, precision: number, charsTyped: number }`
    - Llamar a `roomsService.markPlayerFinished()` o similar con `abandoned: true`
    - Broadcast a los demás jugadores: `PLAYER_FINISH` con el jugador y sus stats parciales
    - Verificar si la partida debe terminar (ej: si era el último jugador activo)

- [x] 8.3 **Frontend — botón de salida en arena** [`arena-page.tsx`]:
  - Agregar un botón "Salir" discreto (small, esquina, opacidad reducida por Focus Fade):
    ```tsx
    <button
      onClick={() => setShowAbandonModal(true)}
      className="absolute top-4 right-4 text-xs text-text-muted opacity-30 hover:opacity-100 transition-opacity"
    >
      Salir
    </button>
    ```
  - El botón debe participar del Focus Fade (usar la clase CSS apropiada para reducir opacidad durante la carrera activa)

- [x] 8.4 **Frontend — modal de confirmación** [`arena-page.tsx` o nuevo `abandon-modal.tsx`]:
  - Crear modal simple: "¿Salir de la partida? Tu puntaje parcial será registrado."
  - Botones: "Cancelar" y "Salir"
  - Al confirmar:
    1. Capturar WPM y precisión actuales del estado del juego (desde Zustand o desde `useWpmCalculator`)
    2. Emitir `player:abandon` con esas stats
    3. Navegar a una pantalla de "Resultados parciales" o mostrar el puntaje antes de salir al home

- [x] 8.5 **Frontend — pantalla de resultados parciales**:
  - Puede ser el mismo `MatchResultsOverlay` con un banner "Saliste de la partida"
  - Mostrar las stats propias (WPM parcial, precisión, posición en el momento de salida)
  - Botón para volver al home

### Task 9: Controles de host (kick / mover a espectador) (AC: 12)

- [x] 9.1 **Shared layer** [`libs/shared/src/websocket/events.ts`]:
  - Agregar `LOBBY_KICK_PLAYER = 'lobby:kick-player'`
  - Agregar `LOBBY_MOVE_TO_SPECTATOR = 'lobby:move-to-spectator'`
  - Agregar `LOBBY_KICKED = 'lobby:kicked'` (evento para el jugador expulsado)
  - Agregar `LOBBY_MOVED_TO_SPECTATOR = 'lobby:moved-to-spectator'` (evento para el jugador movido)

- [x] 9.2 **Backend** [`gateway/game.gateway.ts`]:
  - Crear handler `handleKickPlayer` para `lobby:kick-player`:
    - Payload: `{ targetUserId: string }`
    - Verificar que el emisor es el host (buscar en `roomState.players` quién es host)
    - Llamar a `roomsService.leaveRoom(roomCode, targetUserId)` para remover al jugador
    - Emitir `LOBBY_KICKED` al socket del jugador expulsado con mensaje: "El host te sacó de la partida"
    - Broadcast `LOBBY_STATE` actualizado a toda la sala
  - Crear handler `handleMoveToSpectator` para `lobby:move-to-spectator`:
    - Verificar que el emisor es el host
    - Llamar a `roomsService.leaveRoom()` + `roomsService.joinAsSpectator()` para el target
    - Emitir `LOBBY_MOVED_TO_SPECTATOR` al socket del jugador afectado con mensaje: "El host te cambió a espectador"
    - Actualizar el rol en `this.connections` del target a `'spectator'`
    - Broadcast `LOBBY_STATE` actualizado

- [x] 9.3 **Frontend — UI del host en PlayerAvatarPill** [`player-avatar-pill.tsx`]:
  - Aceptar nuevas props: `isHost: boolean`, `onKick?: () => void`, `onMoveToSpectator?: () => void`
  - Cuando `isHost && !isLocalPlayer`, mostrar el botón `...` en hover del pill con un dropdown:
    ```tsx
    {isHost && !isLocalPlayer && (
      <div className="relative group">
        <button className="...">···</button>
        <div className="absolute right-0 hidden group-hover:block bg-surface-raised ...">
          <button onClick={onKick}>Sacar jugador</button>
          <button onClick={onMoveToSpectator}>Pasar a espectador</button>
        </div>
      </div>
    )}
    ```
  - Asegurar que este menú está dentro del rectángulo del pill (relacionado con AC3)

- [x] 9.4 **Frontend — emitir eventos desde lobby** [`use-lobby.ts` o `lobby-page.tsx`]:
  - Agregar función `kickPlayer(targetUserId: string)` que emite `lobby:kick-player`
  - Agregar función `moveToSpectator(targetUserId: string)` que emite `lobby:move-to-spectator`
  - Pasar estas funciones como props al `PlayerAvatarPill`

- [x] 9.5 **Frontend — recibir notificaciones** [`use-lobby.ts`]:
  - Escuchar evento `LOBBY_KICKED`:
    - Mostrar toast/mensaje: "El host te sacó de la partida"
    - Navegar al home después de 2 segundos
  - Escuchar evento `LOBBY_MOVED_TO_SPECTATOR`:
    - Mostrar toast: "El host te cambió a espectador"
    - Actualizar `isSpectator = true` en el estado local

### Task 10: Tests (AC: todos)

- [x] 10.1 Tests backend [`game.gateway.spec.ts`]:
  - `handleKickPlayer` solo funciona si el emisor es el host
  - `handleKickPlayer` remueve al jugador y emite `LOBBY_KICKED` al target
  - `handleMoveToSpectator` cambia el rol a spectator y emite `LOBBY_MOVED_TO_SPECTATOR`
  - `handlePlayerAbandon` marca al jugador como terminado con stats parciales
  - `handlePlayerAbandon` es silenciosamente ignorado si el jugador no está en una partida activa

- [x] 10.2 Tests frontend [`use-lobby.spec.ts`]:
  - `kickPlayer` emite el evento correcto con el targetUserId
  - Al recibir `LOBBY_KICKED`, el estado redirige al home
  - Al recibir `LOBBY_MOVED_TO_SPECTATOR`, `isSpectator` se vuelve `true`

- [x] 10.3 Verificar que todos los tests existentes pasan (181 API + 83 web)

---

## Dev Notes

### Sobre el bug de caret desync (Task 7) — contexto crítico

Este es el bug más complejo. El caret sync usa DOM manipulation directa vía Refs a 20Hz (50ms throttle). Las posiciones se calculan en el cliente que tipea y se envían. Los demás clientes reciben las posiciones y aplican spring physics para el movimiento. El desync después de unas palabras sugiere uno de estos problemas:

1. **Store Zustand no se reinicia entre partidas** — el más probable si el bug ocurre en la segunda partida en adelante. Agregar `resetCaretStore()` en el handler de `match:start`.
2. **Throttle descarta el último evento** — usar `throttle(fn, 50, { leading: true, trailing: true })` para capturar siempre la posición final.
3. **Bug en el cálculo de posición por índice** — si la posición se calcula como índice de carácter y se mapea a píxeles en el receptor, un cambio de layout (scrolling del texto) puede desincronizar. Enviar posición pixel directamente desde el cliente del caret puede ser más robusto.

### Sobre el bug de avatar (Task 4) — contexto crítico

El bug "avatar no visible en primera sesión, sí en segunda" es un clásico race condition:
- Cuando el jugador B entra a la sala, el gateway puede usar el JWT payload (que tiene `name`, `email`, `sub`) para crear el `PlayerInfo` en Redis, pero el `avatarUrl` puede no estar en el JWT.
- Al hacer rejoin o en la segunda partida, ya existe un `PlayerInfo` completo en Redis o se recarga desde DB.
- **Fix recomendado**: En `handleJoin` del gateway, consultar `usersService.findById(userId)` para obtener el `avatarUrl` actualizado antes de guardar en Redis.

### Archivos a modificar

**Shared (`libs/shared/src/`):**
- `websocket/events.ts` — agregar `PLAYER_ABANDON`, `LOBBY_KICK_PLAYER`, `LOBBY_MOVE_TO_SPECTATOR`, `LOBBY_KICKED`, `LOBBY_MOVED_TO_SPECTATOR`

**Backend (`apps/api/src/`):**
- `gateway/game.gateway.ts` — handlers `handlePlayerAbandon`, `handleKickPlayer`, `handleMoveToSpectator`
- `gateway/game.gateway.spec.ts` — tests nuevos
- (posible) `modules/rooms/rooms.service.ts` — si se necesita método específico para `abandonMatch`

**Frontend (`apps/web/src/`):**
- `styles.css` — ajustar `--color-surface-raised` en light mode
- `components/ui/theme-toggle.tsx` — ícono sistema = monitor
- `components/ui/country-flag.tsx` o `components/arena/match-results-overlay.tsx` — alineación de bandera
- `components/lobby/lobby-page.tsx` — título visible, botón "Listo" con animación
- `components/lobby/player-avatar-pill.tsx` — "..." dentro del rect, estado desconectado, controles de host
- `components/arena/arena-page.tsx` — botón salir + modal abandono + fix caret local color
- `hooks/use-lobby.ts` — funciones kickPlayer, moveToSpectator, escuchar KICKED/MOVED
- `hooks/use-arena-socket.ts` (o equivalente) — fix desync, fix caret color

### Patrones a seguir (del proyecto)

- **Eventos WS**: formato `dominio:accion` en `libs/shared/src/websocket/events.ts`, siempre como constante
- **Guards en gateway**: patrón ya establecido en 3-1: `const conn = this.connections.get(client.id); if (conn?.role === 'spectator') return;`
- **Archivos**: estrictamente `kebab-case.ts`
- **Tailwind**: variables CSS custom con `var(--color-*)`, no valores hardcodeados
- **Modales simples**: no instalar librerías nuevas si no hay una ya — usar un `div` con `fixed inset-0 bg-black/50 z-50` como overlay

### Contexto de la story anterior (3-1)

- Patrón de conexiones: `this.connections` es un `Map<string, { userId, roomCode, role }>` — para kick necesitas iterar este map buscando `userId === targetUserId` para obtener el `socketId`
- Para emitir a un socket específico: `this.server.to(targetSocketId).emit(event, payload)` — NO uses `server.to(roomCode)` para mensajes dirigidos
- Los tests de gateway usan mocks de `roomsService` — seguir el mismo patrón de `jest.fn()`/`vi.fn()`
- 181 API tests + 83 web tests deben pasar tras esta story

### Tema light mode — referencia de variables CSS

```css
/* ANTES (styles.css) */
--color-surface-raised: #FFFFFF;   /* Botones no-activos: invisible sobre surface-base */

/* DESPUÉS sugerido */
--color-surface-raised: #E8EEEE;   /* Suficiente contraste contra surface-base: #F5FAFA */
```

Verificar que `bg-surface-raised` en dark mode NO cambie (ya usa `#25343F` en `.dark { }`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-30.md]
- [Source: _bmad-output/implementation-artifacts/3-1-spectator-mode-room-capacity-management.md#Dev Notes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns - Event System]
- [Source: apps/web/src/components/arena/match-results-overlay.tsx#~90]
- [Source: apps/web/src/components/lobby/lobby-page.tsx#~425]
- [Source: apps/web/src/components/lobby/player-avatar-pill.tsx]
- [Source: apps/web/src/components/ui/theme-toggle.tsx]
- [Source: apps/web/src/components/arena/multiplayer-caret.tsx#~33,147]
- [Source: apps/web/src/styles.css - light mode CSS variables]
- [Source: libs/shared/src/constants/player-colors.ts]
- [Source: apps/api/src/gateway/game.gateway.ts - connections Map pattern]

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Task 5.3: `handleDisconnect` for `waiting` rooms was emitting `PLAYER_DISCONNECTED` (which lobby clients don't listen to). Fixed to emit `LOBBY_STATE` instead. Updated existing gateway spec test accordingly.
- Task 7: Confirmed throttle `trailing` edge was being dropped. Fixed with `pendingEmitRef` pattern + `setTimeout` to always emit the last position.
- Task 4: Fixed as client-side fallback (`imgError` state in `player-avatar-pill.tsx`) — server already included `avatarUrl` in `PlayerInfo`, the race was img loading before URL arrives.

### Completion Notes List

- All 12 ACs implemented across frontend and backend.
- 189 API tests passing (9 new tests added for `player:abandon`, `lobby:kick-player`, `lobby:move-to-spectator`).
- 86 web tests passing (3 new tests added for `player-avatar-pill` disconnected/imgError/menuContent).
- `lobby-page.spec.tsx` mocks updated to include all new `UseLobbyReturn` fields.
- No new dependencies added; no schema changes required.

### File List

- `libs/shared/src/websocket/events.ts`
- `apps/web/src/styles.css`
- `apps/web/src/components/ui/theme-toggle.tsx`
- `apps/web/src/components/arena/match-results-overlay.tsx`
- `apps/web/src/hooks/use-caret-sync.ts`
- `apps/web/src/components/lobby/player-avatar-pill.tsx`
- `apps/web/src/components/lobby/player-avatar-pill.spec.tsx`
- `apps/web/src/components/arena/live-text-canvas.tsx`
- `apps/web/src/hooks/use-lobby.ts`
- `apps/web/src/components/lobby/lobby-page.tsx`
- `apps/web/src/components/lobby/lobby-page.spec.tsx`
- `apps/web/src/components/arena/arena-page.tsx`
- `apps/api/src/gateway/game.gateway.ts`
- `apps/api/src/gateway/game.gateway.spec.ts`

### Review Findings

- [x] [Review][Patch] Confirmación antes de expulsar/mover a espectador — modal de confirmación agregado para kick y move-to-spectator [lobby-page.tsx]
- [x] [Review][Patch] Authorization bypass: sin validación `conn.roomCode === data.code` en handleKickPlayer y handleMoveToSpectator [game.gateway.ts:~862,~908]
- [x] [Review][Patch] Socket del jugador expulsado permanece en canal Socket.IO — `socketsLeave` agregado [game.gateway.ts:~887]
- [x] [Review][Patch] El host puede expulsarse a sí mismo — guard `targetUserId !== conn.userId` agregado [game.gateway.ts:~862]
- [x] [Review][Patch] `setTimeout` de navegación post-kick sin cleanup — cleanup agregado [lobby-page.tsx:~95]
- [x] [Review][Patch] Overlay de abandono no prevenía MatchResultsOverlay — `setAbandonedStats(null)` en MATCH_END handler [arena-page.tsx:~97]
- [x] [Review][Patch] `handlePlayerAbandon` no verificaba `isPlayerFinished` — check agregado antes de delegar [game.gateway.ts:~831]
- [x] [Review][Patch] `handleConfirmAbandon` emitía sin verificar `socket.connected` — guard agregado [arena-page.tsx:~173]
- [x] [Review][Patch] Al kick con múltiples sockets del mismo usuario: ahora `findAllSocketIdsByUserId` notifica y limpia todos [game.gateway.ts:~872]
- [x] [Review][Patch] Race kick+start: ya manejado por re-fetch existente en línea 493 + guard `status !== 'waiting'` en kick handler — no requirió cambios

- [x] [Review][Defer] Stale socket en trailing timer de `useCaretSync` — ventana de 50ms, impacto de un frame de caret, solo en reconexión [use-caret-sync.ts:~55] — deferred, benign
