# Story 3.3: Live Spectator View

Status: done

## Story

As a spectator,
I want to see the live text canvas, all moving carets, and a real-time ranking of players during the race without the UI fading out on me,
so that I can enjoy the competition as a full audience experience.

## Acceptance Criteria (BDD)

### AC1: Espectador ve el canvas y carets en tiempo real (ya implementado)

**Given** un espectador en una partida activa
**When** los jugadores tipean
**Then** el cliente del espectador recibe y renderiza los broadcasts `caret:sync` idénticamente a los jugadores
**And** el input de teclado es ignorado (el espectador no tiene caret propio)

> **Nota:** AC1 ya implementado en Story 3-1 via `ArenaPage isSpectator={true}`. Esta story no requiere cambios para este AC.

### AC2: Sin Focus Fade para espectadores

**Given** un espectador durante una partida activa (`matchStatus === 'playing'`)
**When** la carrera está en curso
**Then** la clase `arena-active` NO se agrega al `document.body` para espectadores
**And** el div de UI perimetral NO recibe la clase `focus-faded`
**And** el `FocusWPMCounter` NO se renderiza para espectadores (muestra WPM propio del jugador, que sería 0 — inútil para espectadores)

### AC3: Leaderboard en vivo visible para espectadores

**Given** un espectador en una partida activa
**When** la partida está en estado `playing`
**Then** el espectador ve un panel "Clasificación en vivo" arriba del canvas
**And** los jugadores se muestran ordenados por posición de carácter descendente (el que más avanzó primero)
**And** cada fila muestra: número de posición, círculo de color del jugador, nombre, barra de progreso y porcentaje `(position / textContent.length * 100)`
**And** el ranking se reordena en tiempo real conforme llegan los eventos `caret:sync`
**And** los jugadores desconectados (`disconnected: true`) son excluidos del ranking en vivo

### AC4: Resultados finales visibles para espectadores

**Given** un espectador cuando la partida termina (`matchStatus === 'finished'`)
**When** se muestra el `MatchResultsOverlay`
**Then** el espectador lo ve correctamente (ya funciona porque `matchResults` se setea desde `MATCH_END` broadcast)
**And** el botón de Revancha está disponible para espectadores también (para poder solicitar revancha desde su rol de espectador — mantenido del comportamiento existente)

> **Nota:** AC4 ya funciona. Mencionado para claridad, sin cambios requeridos.

---

## Tasks / Subtasks

### Task 1: Fix Focus Fade para espectadores (AC: 2)

- [x] 1.1 **`apps/web/src/components/arena/arena-page.tsx`** — Condicionar `arena-active` body class:
  ```tsx
  // ANTES (línea ~186):
  if (isPlaying) {
    document.body.classList.add('arena-active');
  } else {
    document.body.classList.remove('arena-active');
  }

  // DESPUÉS:
  if (isPlaying && !isSpectator) {
    document.body.classList.add('arena-active');
  } else {
    document.body.classList.remove('arena-active');
  }
  ```

- [x] 1.2 **`arena-page.tsx`** — Condicionar clase `focus-faded` en el div de UI perimetral:
  ```tsx
  // ANTES (línea ~198):
  <div className={`w-full max-w-3xl ${isPlaying ? 'focus-faded' : ''}`}>

  // DESPUÉS:
  <div className={`w-full max-w-3xl ${isPlaying && !isSpectator ? 'focus-faded' : ''}`}>
  ```

- [x] 1.3 **`arena-page.tsx`** — Ocultar `FocusWPMCounter` para espectadores:
  ```tsx
  // ANTES (línea ~195):
  <FocusWPMCounter matchStatus={matchStatus} />

  // DESPUÉS:
  {!isSpectator && <FocusWPMCounter matchStatus={matchStatus} />}
  ```

### Task 2: Nuevo componente SpectatorLeaderboard (AC: 3)

- [x] 2.1 **Crear `apps/web/src/components/arena/spectator-leaderboard.tsx`**:
  - Lee `players` y `textContent` del `arenaStore` vía `useArenaStore`
  - Filtra jugadores desconectados (`!p.disconnected`)
  - Ordena por `position` descendente
  - Calcula `progress = textLength > 0 ? Math.round((position / textLength) * 100) : 0`
  - Usa `PLAYER_COLORS[colorIndex]` de `@ultimatype-monorepo/shared` para el color dot
  - No requiere props — toda la data viene del store
  - Implementación de referencia:
    ```tsx
    import { useArenaStore } from '../../hooks/use-arena-store';
    import { PLAYER_COLORS } from '@ultimatype-monorepo/shared';

    export function SpectatorLeaderboard() {
      const players = useArenaStore((s) => s.players);
      const textLength = useArenaStore((s) => s.textContent.length);

      const sorted = Object.entries(players)
        .filter(([, p]) => !p.disconnected)
        .sort(([, a], [, b]) => b.position - a.position);

      if (sorted.length === 0) return null;

      return (
        <div className="mb-4 w-full max-w-3xl rounded-xl bg-surface-raised px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold text-text-muted">Clasificación en vivo</h3>
          <div className="flex flex-col gap-1.5">
            {sorted.map(([id, player], index) => {
              const progress = textLength > 0 ? Math.round((player.position / textLength) * 100) : 0;
              const color = PLAYER_COLORS[player.colorIndex] ?? PLAYER_COLORS[0];
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-right text-xs text-text-muted">{index + 1}</span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="flex-1 truncate text-xs text-text-main">{player.displayName}</span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-base">
                    <div
                      className="h-full rounded-full transition-[width] duration-200"
                      style={{ width: `${progress}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-text-muted">{progress}%</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    ```

- [x] 2.2 **`arena-page.tsx`** — Integrar `SpectatorLeaderboard` en la UI perimetral:
  ```tsx
  // Importar el nuevo componente
  import { SpectatorLeaderboard } from './spectator-leaderboard';

  // En el div de UI perimetral (justo dentro del div con class focus-faded):
  <div className={`w-full max-w-3xl ${isPlaying && !isSpectator ? 'focus-faded' : ''}`}>
    {/* Leaderboard en vivo para espectadores durante la carrera */}
    {isSpectator && matchStatus === 'playing' && <SpectatorLeaderboard />}
    {/* Room header / player list area — populated by future stories */}
  </div>
  ```

### Task 3: Tests (AC: 2, 3)

- [x] 3.1 **Crear `apps/web/src/components/arena/spectator-leaderboard.spec.tsx`**:

  Setup del store antes de cada test: usar `arenaStore.getState().initArena(...)` para inicializar estado

  Tests requeridos:
  - **"renders players sorted by position descending"**: inicializar store con 3 jugadores con posiciones distintas, verificar que el orden en el DOM es correcto (el de mayor posición primero)
  - **"shows correct progress percentage"**: jugador con `position=50` y `textLength=100` → debe mostrar `50%`
  - **"excludes disconnected players"**: jugador con `disconnected: true` no aparece en el leaderboard
  - **"returns null when no active players"**: store vacío sin jugadores → no renderiza nada

- [x] 3.2 **`apps/web/src/components/arena/arena-page.spec.tsx`** (si existe) o tests inline:
  - **"does not add arena-active class for spectators"**: render `ArenaPage` con `isSpectator={true}`, simular `matchStatus = 'playing'`, verificar que `document.body` NO tiene `arena-active`
  - **"does not render FocusWPMCounter for spectators"**: render con `isSpectator={true}`, verificar que el elemento con `data-wpm` no existe en el DOM

- [x] 3.3 Verificar que todos los tests existentes siguen pasando (189 API + 86 web)

### Review Findings

- [x] [Review][Decision] LobbyPage confirmation modal incluido fuera de scope de story 3-3 — absorbido en este commit (cambios correctos, overhead de reescribir historial no justificado)
- [x] [Review][Patch] Progress bar puede mostrar >100% — `Math.min(Math.round(...), 100)` aplicado. [spectator-leaderboard.tsx:19]
- [x] [Review][Dismiss] Test de FocusWPMCounter solo valida countdown — falso positivo: condición `!isSpectator` es estática, independiente de matchStatus. Test correcto tal como está.
- [x] [Review][Patch] Test de jugadores desconectados no valida que Carol siga en el ranking — `expect(screen.getByText('Carol')).toBeTruthy()` agregado. [spectator-leaderboard.spec.tsx:52]
- [x] [Review][Patch] Falta test que verifique ausencia del SpectatorLeaderboard cuando `matchStatus !== 'playing'` — test "NO renderiza SpectatorLeaderboard cuando matchStatus es countdown" agregado. [arena-page.spec.tsx]
- [x] [Review][Defer] `textLength === 0` muestra 0% para todos antes de que llegue el texto (diseño esperado, guard en place) [spectator-leaderboard.tsx] — deferred, pre-existing
- [x] [Review][Defer] Sort inestable para jugadores con igual position (cosmético, V8 es estable en práctica) [spectator-leaderboard.tsx] — deferred, pre-existing
- [x] [Review][Defer] Ghost caret del espectador si el server incluye su ID en el array `players` de MATCH_START — pre-existente desde story 3-1 [arena-page.tsx] — deferred, pre-existing
- [x] [Review][Defer] `caret:sync`-driven reordering no cubierto en unit tests (requeriría mock de socket events, fuera del alcance de tests unitarios) — deferred, pre-existing

---

## Dev Notes

### Contexto crítico: qué está YA implementado (no reinventar)

El core de la story ya existe desde 3-1 y 3-2. Lo que falta es incremental:

**Ya implementado — NO tocar:**
- `ArenaPage isSpectator={true}` → read-only, keyboard disabled, todos los carets visibles [Source: `arena-page.tsx`]
- `useCaretSync` recibe `CARET_SYNC` y actualiza `arenaStore.players[id].position` para todos [Source: `use-caret-sync.ts`]
- `MATCH_END` trigger → `MatchResultsOverlay` visible para espectadores (AC4 ya funciona) [Source: `arena-page.tsx`]
- Rol switching lobby: `switchToSpectator()` / `switchToPlayer()` ya emiten `LOBBY_SWITCH_TO_SPECTATOR` / `LOBBY_SWITCH_TO_PLAYER` [Source: `use-lobby.ts:254-261`]
- Backend: `handleSwitchToSpectator` / `handleSwitchToPlayer` en gateway ya implementados [Source: `game.gateway.ts:763-821`]
- Spectator rejoin durante partida activa: `buildSpectatorMatchState` ya implementado [Source: `game.gateway.ts:1173-1208`]

**NO hay trabajo de backend en esta story.**

### Focus Fade — cómo funciona

La clase `arena-active` se agrega al `document.body` y controla una CSS variable `--focus-fade-opacity`. Los elementos con clase `focus-faded` reducen su opacidad a este valor durante la carrera. El `FocusWPMCounter` también baja su opacidad cuando `matchStatus === 'playing'`.

Para espectadores: no deben ver ningún fade — ven la UI completa + el leaderboard siempre visible.

El fix es en `useEffect` de `arena-page.tsx` que depende de `[isPlaying]`:
```tsx
// La dependencia del efecto NO incluye isSpectator actualmente — agregar
useEffect(() => {
  if (isPlaying && !isSpectator) {
    document.body.classList.add('arena-active');
  } else {
    document.body.classList.remove('arena-active');
  }
  return () => document.body.classList.remove('arena-active');
}, [isPlaying, isSpectator]);  // ← agregar isSpectator a las deps
```

### SpectatorLeaderboard — patrón de data

El store `arenaStore` (Zustand vanilla) expone:
- `players: Record<string, { position, displayName, colorIndex, disconnected }>` — actualizado en tiempo real por `useCaretSync`
- `textContent: string` — el texto de la partida

Para rankings en vivo:
- `Object.entries(players)` devuelve `[playerId, PlayerState][]`
- Ordenar por `position` descendente = el jugador que más avanzó aparece primero
- `progress = Math.round((position / textContent.length) * 100)` — progreso como %
- Cuando `textContent.length === 0` (antes de que llegue MATCH_START), mostrar 0%
- PLAYER_COLORS es un array de strings de color hex: `PLAYER_COLORS[colorIndex]`

Importar `PLAYER_COLORS` de `@ultimatype-monorepo/shared` (ya importado en `arena-page.tsx`).

### Archivo `spectator-leaderboard.tsx` — dónde va

- Directorio: `apps/web/src/components/arena/` (misma carpeta que `arena-page.tsx`, `live-text-canvas.tsx`, etc.)
- Archivo: `spectator-leaderboard.tsx` (kebab-case estricto, como el resto)
- El spec: `spectator-leaderboard.spec.tsx` en la misma carpeta (patrón del proyecto: co-located specs)

### Integración en arena-page.tsx

El leaderboard va dentro del div de UI perimetral, que es el primer div principal después del FocusWPMCounter. Lo condicionamos a `isSpectator && matchStatus === 'playing'` — durante countdown y finished no se muestra (countdown: nada útil aún; finished: MatchResultsOverlay ya cubre ese caso).

### Tests — patrones del proyecto

Vitest + jsdom. Los tests de componentes React usan `@testing-library/react`. Para manipular el arenaStore en tests:
```ts
import { arenaStore } from '../../hooks/use-arena-store';
// Antes de cada test:
arenaStore.getState().initArena('texto de prueba', [
  { id: 'p1', displayName: 'Player 1', colorIndex: 0 },
  { id: 'p2', displayName: 'Player 2', colorIndex: 1 },
]);
// Para actualizar posición:
arenaStore.getState().updatePlayerPosition('p1', 10);
// Para limpiar:
arenaStore.getState().reset();
```

Ejemplo de patrón de tests existente: ver `apps/web/src/components/lobby/player-avatar-pill.spec.tsx` y `apps/web/src/components/lobby/lobby-page.spec.tsx`.

Para testear `arena-page.tsx` con spectator mode, los mocks de `use-arena-store` y `getSocket` son necesarios — ver cómo los tests existentes mockean estas dependencias.

### Convenciones clave del proyecto

- Archivos: `kebab-case.ts` / `kebab-case.tsx` — sin excepciones
- CSS: Tailwind con custom properties `var(--color-*)` — no valores hardcodeados
- No instalar nuevas librerías — `PLAYER_COLORS` ya está disponible en shared, `useArenaStore` ya disponible
- Código en TypeScript estricto: `PascalCase` para componentes, `camelCase` para funciones

### Project Structure Notes

- Todos los cambios son en `apps/web/src/components/arena/` — sin tocar backend, shared, ni otras carpetas
- Solo se crea 1 archivo nuevo: `spectator-leaderboard.tsx` + su spec
- `arena-page.tsx` recibe 3 cambios pequeños (1.1, 1.2, 1.3) y 1 integración (2.2)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: _bmad-output/implementation-artifacts/3-1-spectator-mode-room-capacity-management.md#Review Findings]
- [Source: _bmad-output/implementation-artifacts/3-2-lobby-race-fixes-and-host-controls.md#File List]
- [Source: memory/project_epic3_design_decisions.md] — Focus Fade: No para espectadores; Live leaderboard: Sí
- [Source: apps/web/src/components/arena/arena-page.tsx#184-191] — Focus Fade useEffect
- [Source: apps/web/src/components/arena/arena-page.tsx#198] — focus-faded class
- [Source: apps/web/src/hooks/use-arena-store.ts] — PlayerState, ArenaState, arenaStore
- [Source: apps/web/src/hooks/use-caret-sync.ts] — CARET_SYNC handler → updatePlayerPosition
- [Source: libs/shared/src/constants/player-colors.ts] — PLAYER_COLORS array

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- AC2: `arena-active` body class condicionado a `isPlaying && !isSpectator`. Dependencia `isSpectator` agregada al array de deps del useEffect. `FocusWPMCounter` oculto para espectadores (`{!isSpectator && <FocusWPMCounter />}`). Clase `focus-faded` del div perimetral también condicionada.
- AC3: Nuevo componente `SpectatorLeaderboard` lee `players` y `textContent` de `arenaStore` vía `useArenaStore`. Ordena por `position` descendente, filtra `disconnected`, calcula `Math.round(position/textLength*100)`. Integrado en `arena-page.tsx` dentro del div de UI perimetral, visible solo cuando `isSpectator && matchStatus === 'playing'`.
- Tests: 4 tests en `spectator-leaderboard.spec.tsx` (ordenamiento, %, desconectados, vacío) + 4 tests en `arena-page.spec.tsx` (body class no agregada para espectadores, FocusWPMCounter no renderizado).
- Resultado: 189 API + 94 web tests pasando (8 tests nuevos). 0 errores de lint.

### File List

- `apps/web/src/components/arena/arena-page.tsx`
- `apps/web/src/components/arena/spectator-leaderboard.tsx` (nuevo)
- `apps/web/src/components/arena/spectator-leaderboard.spec.tsx` (nuevo)
- `apps/web/src/components/arena/arena-page.spec.tsx` (nuevo)
