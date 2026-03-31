# Story 3.4: Spectator to Player Transition

Status: done

## Story

As a spectator viewing the post-match results screen,
I want to click a button to join the next match as a player,
so that I can seamlessly transition from watching to competing if a player slot is available.

## Acceptance Criteria (BDD)

### AC1: Botón "Unirse a la partida" visible para espectadores en el overlay de resultados

**Given** un espectador que está viendo el `MatchResultsOverlay` (matchStatus === 'finished')
**When** la partida termina
**Then** el espectador ve el botón "Unirse a la partida" en el overlay de resultados
**And** los jugadores normales NO ven ese botón (solo existe para espectadores)

### AC2: Click registra intención de unirse a la siguiente partida

**Given** un espectador que hace click en "Unirse a la partida"
**When** hace click en el botón
**Then** el botón cambia a estado "Inscrito para la siguiente ✓" (deshabilitado, sin spinner)
**And** el intent queda almacenado en el hook `useLobby` via `pendingJoinAsPlayerRef`

### AC3: Transición automática cuando el lobby se resetea a 'waiting'

**Given** un espectador con intent registrado (pendingJoinAsPlayerRef.current === true)
**When** llega un evento `LOBBY_STATE` con `status === 'waiting'` (alguien disparó Revancha)
**And** `matchStartedRef.current === true` (confirma que veníamos de una partida)
**Then** se emite automáticamente `LOBBY_SWITCH_TO_PLAYER` con el roomCode
**And** `pendingJoinAsPlayerRef` y el estado se resetean a false
**And** `isSwitchingRole` se setea a true (spinner en el lobby mientras el servidor responde)

### AC4: Slot disponible — espectador pasa a jugador

**Given** el servidor procesa el `LOBBY_SWITCH_TO_PLAYER` y hay slots disponibles
**When** el servidor responde con `LOBBY_STATE` actualizado
**Then** el espectador aparece en la lista de jugadores (no en espectadores)
**And** `isSpectator` pasa a false en el lobby
**And** el lobby muestra al usuario como jugador con el botón "Listo"

### AC5: Sala llena — error visible en lobby

**Given** el servidor procesa el `LOBBY_SWITCH_TO_PLAYER` pero la sala está llena
**When** el servidor responde con `LOBBY_ERROR`
**Then** el error "Sala llena" se muestra en el lobby (comportamiento ya existente via `error` state de `useLobby`)
**And** el espectador permanece como espectador

---

## Tasks / Subtasks

### Task 1: `useLobby.ts` — deferred intent + auto-emit (AC: 2, 3)

- [x] 1.1 **`apps/web/src/hooks/use-lobby.ts`** — Agregar ref y estado para el intent:
  ```ts
  // Dentro de la función useLobby, junto al resto de refs:
  const pendingJoinAsPlayerRef = useRef(false);
  const [pendingJoinAsPlayer, setPendingJoinAsPlayer] = useState(false);
  ```

- [x] 1.2 **`use-lobby.ts`** — Agregar función `requestJoinAsPlayer`:
  ```ts
  const requestJoinAsPlayer = useCallback(() => {
    pendingJoinAsPlayerRef.current = true;
    setPendingJoinAsPlayer(true);
  }, []);
  ```

- [x] 1.3 **`use-lobby.ts`** — En el handler de `LOBBY_STATE` (dentro del `useEffect`), agregar la lógica deferred ANTES del bloque que resetea `matchStarted`:
  ```ts
  s.on(WS_EVENTS.LOBBY_STATE, (state: RoomState) => {
    setRoomState(state);
    setError(null);
    setIsSwitchingRole(false);
    if (userId) {
      setIsSpectator(state.spectators.some((sp) => sp.id === userId));
    }
    // NUEVA LÓGICA: deferred switch-to-player
    if (state.status === 'waiting' && matchStartedRef.current) {
      if (pendingJoinAsPlayerRef.current) {
        pendingJoinAsPlayerRef.current = false;
        setPendingJoinAsPlayer(false);
        s.emit(WS_EVENTS.LOBBY_SWITCH_TO_PLAYER, { code });
        setIsSwitchingRole(true); // override el false de arriba
      }
      setMatchStarted(false);
      setMatchData(null);
    }
  });
  ```
  > **Crítico:** `setIsSwitchingRole(true)` llama después de `setIsSwitchingRole(false)` — React batching hace que el resultado final sea `true`. No reordenar.

- [x] 1.4 **`use-lobby.ts`** — Agregar `pendingJoinAsPlayer` y `requestJoinAsPlayer` al objeto de retorno:
  ```ts
  return {
    // ...existentes
    pendingJoinAsPlayer,
    requestJoinAsPlayer,
  };
  ```
  > Agregar `pendingJoinAsPlayer: boolean` y `requestJoinAsPlayer: () => void` a `UseLobbyReturn` interface.

### Task 2: `lobby-page.tsx` — propagar callback a ArenaPage (AC: 1, 2)

- [x] 2.1 **`apps/web/src/components/lobby/lobby-page.tsx`** — Destructurar las nuevas keys:
  ```ts
  const {
    // ...existentes
    pendingJoinAsPlayer,
    requestJoinAsPlayer,
  } = useLobby(code, user?.id);
  ```

- [x] 2.2 **`lobby-page.tsx`** — Pasar `onJoinAsPlayer` a `ArenaPage`:
  ```tsx
  // ANTES:
  if (matchStarted && matchData && user) {
    return (
      <ArenaPage
        matchData={matchData}
        localUserId={user.id}
        isSpectator={isSpectator}
      />
    );
  }

  // DESPUÉS:
  if (matchStarted && matchData && user) {
    return (
      <ArenaPage
        matchData={matchData}
        localUserId={user.id}
        isSpectator={isSpectator}
        onJoinAsPlayer={isSpectator && !pendingJoinAsPlayer ? requestJoinAsPlayer : undefined}
      />
    );
  }
  ```
  > Solo se pasa `onJoinAsPlayer` cuando es espectador Y todavía no ha registrado el intent. Cuando hace click, `pendingJoinAsPlayer` se vuelve true y el prop pasa a `undefined` — el botón desaparece/se desactiva (ver Task 3).

### Task 3: `arena-page.tsx` — aceptar y forward `onJoinAsPlayer` (AC: 1)

- [x] 3.1 **`apps/web/src/components/arena/arena-page.tsx`** — Agregar prop a interface:
  ```ts
  interface ArenaPageProps {
    matchData: MatchStartPayload;
    localUserId: string;
    isSpectator?: boolean;
    onJoinAsPlayer?: () => void; // NUEVA
  }
  ```

- [x] 3.2 **`arena-page.tsx`** — Desestructurar y forward a `MatchResultsOverlay`:
  ```tsx
  export function ArenaPage({
    matchData,
    localUserId,
    isSpectator = false,
    onJoinAsPlayer,     // NUEVA
  }: ArenaPageProps) {
  ```

  ```tsx
  // En el bloque del MatchResultsOverlay (línea ~253):
  {matchStatus === 'finished' && matchResults && matchEndReason && (
    <MatchResultsOverlay
      results={matchResults}
      localUserId={localUserId}
      reason={matchEndReason}
      onRematch={handleRematch}
      onExit={handleGoHome}
      onJoinAsPlayer={onJoinAsPlayer}  // NUEVA
    />
  )}
  ```

### Task 4: `match-results-overlay.tsx` — botón "Unirse a la partida" (AC: 1, 2)

- [x] 4.1 **`apps/web/src/components/arena/match-results-overlay.tsx`** — Agregar prop a interface:
  ```ts
  interface MatchResultsOverlayProps {
    results: PlayerResult[];
    localUserId: string;
    reason: 'all_finished' | 'timeout';
    onRematch: () => void;
    onExit: () => void;
    onJoinAsPlayer?: () => void; // NUEVA — undefined para jugadores, función para espectadores
  }
  ```

- [x] 4.2 **`match-results-overlay.tsx`** — Agregar estado local y lógica del botón:
  ```tsx
  export function MatchResultsOverlay({
    results,
    localUserId,
    reason,
    onRematch,
    onExit,
    onJoinAsPlayer,  // NUEVA
  }: MatchResultsOverlayProps) {
    const localResult = results.find((r) => r.playerId === localUserId);
    const [joined, setJoined] = useState(false);  // NUEVA

    const handleJoin = () => {
      onJoinAsPlayer?.();
      setJoined(true);
    };
  ```

- [x] 4.3 **`match-results-overlay.tsx`** — Agregar botón/confirmación en el bloque de action buttons:
  ```tsx
  {/* Action buttons */}
  <div className="flex items-center justify-center gap-4">
    <button
      type="button"
      onClick={onExit}
      className="rounded-lg bg-surface-raised px-6 py-3 text-lg font-medium text-text-muted transition-colors hover:text-text-main"
    >
      Salir
    </button>
    {/* Botón "Unirse" solo para espectadores — aparece si onJoinAsPlayer está definido */}
    {onJoinAsPlayer && !joined && (
      <button
        type="button"
        onClick={handleJoin}
        className="rounded-lg bg-surface-raised px-8 py-3 text-lg font-medium text-text-main transition-colors hover:bg-surface-base"
      >
        Unirse a la partida
      </button>
    )}
    {joined && (
      <span className="px-8 py-3 text-lg font-medium text-success">
        Inscrito para la siguiente ✓
      </span>
    )}
    {!onJoinAsPlayer && (
      <button
        type="button"
        onClick={onRematch}
        autoFocus
        className="rounded-lg bg-primary px-8 py-3 text-xl font-bold text-surface-base transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Revancha
      </button>
    )}
    {onJoinAsPlayer && joined && (
      <button
        type="button"
        onClick={onRematch}
        className="rounded-lg bg-primary px-8 py-3 text-xl font-bold text-surface-base transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Revancha
      </button>
    )}
  </div>
  ```
  > **Simplificación:** La lógica anterior puede simplificarse. Ver nota abajo.

  **SIMPLIFICACIÓN RECOMENDADA** para el bloque de action buttons:
  ```tsx
  <div className="flex items-center justify-center gap-4">
    <button type="button" onClick={onExit} className="...">
      Salir
    </button>
    {onJoinAsPlayer && !joined ? (
      <button type="button" onClick={handleJoin} className="rounded-lg bg-surface-raised px-8 py-3 text-lg font-medium text-text-main transition-colors hover:bg-surface-base">
        Unirse a la partida
      </button>
    ) : onJoinAsPlayer && joined ? (
      <span className="px-8 py-3 text-lg font-medium text-success">
        Inscrito para la siguiente ✓
      </span>
    ) : (
      <button type="button" onClick={onRematch} autoFocus className="rounded-lg bg-primary px-8 py-3 text-xl font-bold text-surface-base transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50">
        Revancha
      </button>
    )}
  </div>
  ```
  > Espectadores ven "Unirse" → "Inscrito ✓" (sin Revancha). Jugadores ven "Revancha". No se muestra "Revancha" para espectadores porque ellos no iniciaron la partida.

### Task 5: Tests — `match-results-overlay.spec.tsx` (AC: 1, 2)

- [x] 5.1 **`apps/web/src/components/arena/match-results-overlay.spec.tsx`** — Agregar tests para el botón de espectador:
  ```tsx
  it('muestra botón "Unirse a la partida" cuando onJoinAsPlayer está definido', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="spectator-1"  // no está en mockResults
        reason="all_finished"
        onRematch={vi.fn()}
        onJoinAsPlayer={vi.fn()}
      />,
    );
    expect(screen.getByText('Unirse a la partida')).toBeDefined();
  });

  it('NO muestra botón "Unirse a la partida" cuando onJoinAsPlayer no está definido (jugador)', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p1"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );
    expect(screen.queryByText('Unirse a la partida')).toBeNull();
  });

  it('al hacer click en "Unirse", llama onJoinAsPlayer y muestra confirmación "Inscrito"', () => {
    const onJoinAsPlayer = vi.fn();
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="spectator-1"
        reason="all_finished"
        onRematch={vi.fn()}
        onJoinAsPlayer={onJoinAsPlayer}
      />,
    );
    fireEvent.click(screen.getByText('Unirse a la partida'));
    expect(onJoinAsPlayer).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Unirse a la partida')).toBeNull();
    expect(screen.getByText(/Inscrito para la siguiente/)).toBeDefined();
  });
  ```

- [x] 5.2 Verificar que los tests existentes de `match-results-overlay.spec.tsx` siguen pasando (no pasar `onExit` es el patrón existente — no lo cambiamos).

- [x] 5.3 Verificar que todos los tests existentes siguen pasando (189 API + 94 web tests).

---

## Dev Notes

### Lo que YA está implementado — NO reinventar

- **`switchToPlayer()` en `useLobby.ts` (línea 259-262):** emite `LOBBY_SWITCH_TO_PLAYER`. NO llamar esto directamente desde el UI del overlay (el room está en 'finished' en ese momento).
- **`handleSwitchToPlayer` en `game.gateway.ts` (línea 793):** procesa el evento en el backend. Ya funciona.
- **`SWITCH_TO_PLAYER_LUA` en `rooms.service.ts` (línea 259):** solo permite `status === 'waiting'`. Por eso el patrón es deferred: no llamamos cuando el room es 'finished'.
- **`isSpectator` derivado de `LOBBY_STATE`** en `useLobby.ts` (línea 143-145): el servidor es la fuente de verdad. No se setea `isSpectator` optimistically.
- **Error handling en LOBBY_ERROR:** si la sala está llena cuando se emite `LOBBY_SWITCH_TO_PLAYER`, el servidor envía `LOBBY_ERROR` → `error` state en `useLobby` → se muestra en el lobby.

### Por qué el patrón deferred (no emitir inmediatamente)

`SWITCH_TO_PLAYER_LUA` tiene:
```lua
local status = redis.call('HGET', roomKey, 'status')
if status ~= 'waiting' then
  return redis.error_reply('No puedes cambiar de rol durante una partida')
end
```

Cuando el espectador hace click en "Unirse a la partida", el room está en estado `finished` (post-match). Si intentamos emitir `LOBBY_SWITCH_TO_PLAYER` en ese momento, el servidor rechaza con error. **La solución: guardar la intención y emitir cuando llegue `LOBBY_STATE` con `status === 'waiting'`**.

### Por qué `pendingJoinAsPlayerRef` Y `pendingJoinAsPlayer` state (ambos)

El handler de `LOBBY_STATE` en `useLobby.ts` se registra en `useEffect` con `[code]` como dependency. Dentro de ese closure, los valores de estado (como `pendingJoinAsPlayer`) estarían **stale** (capturados al momento del mount). Para leer el valor actual dentro del handler, se necesita un `ref`:
- **`pendingJoinAsPlayerRef`**: lectura confiable dentro del closure
- **`pendingJoinAsPlayer` state**: para re-render y para que `LobbyPage` pueda ver el cambio (para pasar/no pasar `onJoinAsPlayer` a ArenaPage)

El patrón ref+state ya se usa en el mismo hook: `matchStartedRef` (línea 74-80 de `use-lobby.ts`).

### Orden crítico en el LOBBY_STATE handler (evitar bugs sutiles)

```ts
s.on(WS_EVENTS.LOBBY_STATE, (state: RoomState) => {
  setRoomState(state);
  setError(null);
  setIsSwitchingRole(false);         // 1. resetear role switching
  if (userId) { setIsSpectator(...); } // 2. actualizar spectator status
  if (state.status === 'waiting' && matchStartedRef.current) {
    if (pendingJoinAsPlayerRef.current) {
      pendingJoinAsPlayerRef.current = false;
      setPendingJoinAsPlayer(false);
      s.emit(WS_EVENTS.LOBBY_SWITCH_TO_PLAYER, { code }); // 3. emitir switch
      setIsSwitchingRole(true);  // 4. OVERRIDE el false del paso 1
    }
    setMatchStarted(false);    // 5. lobby visible
    setMatchData(null);        // 6. limpiar match data
  }
});
```

React 18 batching: `setIsSwitchingRole(false)` y `setIsSwitchingRole(true)` en el mismo handler — el estado final es `true` (la última llamada gana). **No reordenar los pasos 1 y 4**.

### UX del flujo completo (para entender la transición)

1. Espectador ve MatchResultsOverlay con botón "Unirse a la partida"
2. Click → botón cambia a "Inscrito para la siguiente ✓" + `pendingJoinAsPlayerRef = true`
3. Alguien (jugador) hace click en "Revancha" → `MATCH_REMATCH` al servidor
4. Servidor resetea room a 'waiting' → emite `LOBBY_STATE` (status: waiting) a todos
5. `useLobby` handler: detecta `pendingJoinAsPlayerRef.current === true` → emite `LOBBY_SWITCH_TO_PLAYER` → resetea matchStarted a false
6. LobbyPage re-renderiza: `matchStarted=false` → muestra lobby UI (isSpectator aún true, isSwitchingRole=true con spinner)
7. Servidor procesa `LOBBY_SWITCH_TO_PLAYER` → emite nuevo `LOBBY_STATE` (espectador en players list)
8. `useLobby` handler: `setIsSpectator(false)`, `setIsSwitchingRole(false)`
9. Lobby muestra al usuario como jugador con botón "Listo"

### `onJoinAsPlayer` en LobbyPage — decisión de cuándo pasarlo

```tsx
onJoinAsPlayer={isSpectator && !pendingJoinAsPlayer ? requestJoinAsPlayer : undefined}
```

- `isSpectator && !pendingJoinAsPlayer` → botón visible y clickeable
- `isSpectator && pendingJoinAsPlayer` → `undefined` → botón desaparece (ya fue clicked, `joined=true` en overlay, muestra "Inscrito ✓")
- `!isSpectator` → `undefined` → botón no existe para jugadores

### Cómo funciona el estado `joined` en `MatchResultsOverlay`

`joined` es estado local del componente. Se resetea cada vez que el overlay es recreado (nueva partida → nuevo mount). Esto es correcto: cada partida es un nuevo overlay.

Cuando `onJoinAsPlayer` se vuelve `undefined` (porque `pendingJoinAsPlayer` se volvió true en LobbyPage), el componente re-renderiza sin el botón. El estado `joined=true` local puede subsistir brevemente, pero como el botón ya se condicionó via `onJoinAsPlayer && !joined`, la transición es limpia.

### `MatchResultsOverlay` — NO agrega `onExit` a tests existentes

El patrón existente en `match-results-overlay.spec.tsx` no pasa `onExit` aunque sea required en la interface. Seguir el mismo patrón en los tests nuevos.

### Convenciones del proyecto a respetar

- Archivos: `kebab-case.tsx` — sin excepciones
- No instalar nuevas librerías
- No hay cambios de backend en esta story
- `useState` import ya existe en `match-results-overlay.tsx`? → Verificar y agregar si falta

Verificar: `match-results-overlay.tsx` actualmente importa: `import { PlayerResult, PLAYER_COLORS } from '@ultimatype-monorepo/shared'` y `import { CountryFlag } from '../ui/country-flag'`. El componente usa DOM refs en otros componentes pero `MatchResultsOverlay` es puro React — necesita `useState` de React. **Agregar `import { useState } from 'react';` al top del archivo**.

### Project Structure Notes

- Todos los cambios son en `apps/web/src/` — sin tocar backend, shared, ni libs
- No se crea ningún archivo nuevo: solo modificaciones a 4 archivos existentes
- Tests solo en `match-results-overlay.spec.tsx` — el comportamiento de `useLobby` no tiene spec actualmente

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- [Source: apps/web/src/hooks/use-lobby.ts#62-317] — useLobby completo, patrón ref+state (matchStartedRef)
- [Source: apps/web/src/hooks/use-lobby.ts#139-151] — LOBBY_STATE handler actual
- [Source: apps/web/src/hooks/use-lobby.ts#259-262] — switchToPlayer() ya implementado
- [Source: apps/api/src/gateway/game.gateway.ts#793-821] — handleSwitchToPlayer en backend
- [Source: apps/api/src/modules/rooms/rooms.service.ts#259-289] — SWITCH_TO_PLAYER_LUA: solo acepta status 'waiting'
- [Source: apps/web/src/components/arena/match-results-overlay.tsx] — overlay actual sin onJoinAsPlayer
- [Source: apps/web/src/components/arena/match-results-overlay.spec.tsx] — tests existentes (patrón sin onExit)
- [Source: apps/web/src/components/lobby/lobby-page.tsx#158-167] — renderizado condicional de ArenaPage
- [Source: apps/web/src/components/arena/arena-page.tsx#23-27] — ArenaPageProps interface

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- AC1–AC2: `MatchResultsOverlay` recibe prop opcional `onJoinAsPlayer`. Cuando está definido, muestra botón "Unirse a la partida". Al hacer click, llama `onJoinAsPlayer()` y transiciona a estado "Inscrito para la siguiente ✓" (estado local `joined`). Jugadores siguen viendo "Revancha" (cuando `onJoinAsPlayer` es `undefined`).
- AC3: En `useLobby.ts` se agregaron `pendingJoinAsPlayerRef` (ref para lectura en closure) y `pendingJoinAsPlayer` state (para re-render). Handler de `LOBBY_STATE`: cuando `status === 'waiting'` y `matchStartedRef.current`, si `pendingJoinAsPlayerRef.current === true` emite `LOBBY_SWITCH_TO_PLAYER` automáticamente antes de resetear `matchStarted`.
- AC4–AC5: El backend ya maneja `LOBBY_SWITCH_TO_PLAYER` → responde con `LOBBY_STATE` (slot disponible) o `LOBBY_ERROR` (sala llena). `useLobby` deriva `isSpectator` del `LOBBY_STATE` del servidor (fuente de verdad), y errores se muestran en el lobby via estado `error` existente.
- Tests: 6 nuevos tests en `match-results-overlay.spec.tsx` — botón visible para espectadores, oculto para jugadores, confirmación "Inscrito" post-click, callback llamado, Revancha visible solo para jugadores.
- Resultado: 189 API + 100 web tests pasando (6 tests nuevos). 0 archivos nuevos creados — solo modificaciones.

### Review Findings

- [x] [Review][Patch] "Inscrito ✓" nunca se muestra en producción — fix: simplificar prop a `isSpectator ? requestJoinAsPlayer : undefined` [lobby-page.tsx:167]
- [x] [Review][Patch] `autoFocus` agregado al botón "Unirse a la partida" [match-results-overlay.tsx:128]
- [x] [Review][Patch] `focus:ring` agregado al botón "Unirse a la partida" [match-results-overlay.tsx:129]
- [x] [Review][Defer] Socket `s` podría estar stale en LOBBY_STATE handler — patrón pre-existente, no introducido por este diff [use-lobby.ts:149] — deferred, pre-existing

### File List

- `apps/web/src/hooks/use-lobby.ts`
- `apps/web/src/components/lobby/lobby-page.tsx`
- `apps/web/src/components/arena/arena-page.tsx`
- `apps/web/src/components/arena/match-results-overlay.tsx`
- `apps/web/src/components/arena/match-results-overlay.spec.tsx`
