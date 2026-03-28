# Story 2.4: Focus Fade & Race Mechanics

Status: done

## Story

As a competitor,
I want the UI to fade out and the text to clear its blur when the race starts,
So that I can enter a state of deep focus ("Flow").

## Acceptance Criteria (BDD)

**Given** a lobby with ready players and `matchStatus === 'countdown'`
**When** the countdown (3-2-1) completes on the client
**Then** `matchStatus` transitions to `'playing'`
**And** the text blur is removed from `LiveTextCanvas`
**And** the perimeter UI fades to <20% opacity (Focus Fade)
**And** `FocusWPMCounter` renders at <20% opacity with live WPM updating every ~200ms

### Criterios Detallados

1. **Countdown overlay:** Sobre el canvas de texto se superpone un overlay que muestra `3`, `2`, `1`, luego `¡YA!`. Cada tick dura 1 segundo. El overlay desaparece cuando termina.
2. **Bloqueo de tipeo durante countdown:** `LiveTextCanvas` ignora todos los eventos de teclado mientras `matchStatus !== 'playing'`. El cursor oculto no recibe focus durante countdown.
3. **Desenfoque inicial del texto:** El contenedor del texto tiene `filter: blur(8px)` cuando `matchStatus === 'countdown'`. Al pasar a `'playing'`, el blur se elimina con transición CSS `transition: filter 0.3s ease`.
4. **Focus Fade (perimeter UI):** ArenaPage envuelve todo excepto `LiveTextCanvas` y `FocusWPMCounter` en un contenedor con `opacity: 0.15 transition: opacity 0.5s ease` cuando `matchStatus === 'playing'`.
5. **FocusWPMCounter:** Componente que muestra el WPM en `text-7xl` (Space Grotesk). Opacidad: `1.0` en lobby/resultados, `0.15` durante la carrera. Actualización cada ~200ms vía `setInterval` (no rAF para conservar CPU).
6. **Cálculo de WPM:** `wpm = Math.round((localPosition / 5) / elapsedMinutes)`. Tiempo inicia cuando `matchStatus` cambia a `'playing'`. Cálculo ≤10ms (aritmética simple).
7. **Cálculo de Precisión:** `precision = (totalKeystrokes - errorKeystrokes) / totalKeystrokes`. Stored in arena store, updated on every keystroke.
8. **Keystrokes tracking en LiveTextCanvas:**
   - En tecla correcta: `incrementKeystrokes({ correct: true })`
   - En tecla incorrecta: `incrementKeystrokes({ correct: false })`
   - En Backspace: **no** incrementar (no cuenta como keystroke para precisión)
9. **Transiciones CSS:** Blur removal y Focus Fade usan `transition` nativo de CSS. NO usar librerías de animación.
10. **matchStatus transition timing:** El cliente inicia el timer al montar `CountdownOverlay`. Después de 3 ticks de 1s + breve pausa GO!, llama `setMatchStatus('playing')` en el store.
11. **FocusWPMCounter visible desde countdown:** El componente está presente desde que aparece la arena. Durante countdown y pre-carrera tiene opacidad normal y muestra "0 WPM". Durante race baja a 0.15 y actualiza.

## Tasks / Subtasks

### Backend (NestJS API) — Sin cambios requeridos

El countdown es client-side. El servidor ya emite `MATCH_START` en story 2-3 y el store ya tiene `matchStatus: 'countdown'`. No se requieren nuevos eventos WS ni cambios en el gateway.

### Shared Library — Sin cambios requeridos

No se necesitan nuevos DTOs o eventos WS para esta historia.

---

### Frontend (React Web)

- [x] **Task 1: Extender arena store** (AC: #6, #7, #8)
  - [x] Agregar a `use-arena-store.ts` los campos:
    - `matchStartTime: number | null` — set cuando `matchStatus` cambia a `'playing'`
    - `totalKeystrokes: number` — incrementado en tecla correcta/incorrecta (NO backspace)
    - `errorKeystrokes: number` — incrementado solo en tecla incorrecta
  - [x] Agregar acción `setMatchStarted()` — registra `matchStartTime: Date.now()` y pone `matchStatus: 'playing'`
  - [x] Agregar acción `incrementKeystrokes(correct: boolean)` — incrementa `totalKeystrokes`, y si `!correct` también `errorKeystrokes`
  - [x] Agregar acción `resetRaceMetrics()` — resetea `matchStartTime`, `totalKeystrokes`, `errorKeystrokes` a valores iniciales
  - [x] Asegurar que `initArena()` también llama `resetRaceMetrics()` internamente

- [x] **Task 2: CountdownOverlay component** (AC: #1, #2, #10)
  - [x] Crear `apps/web/src/components/arena/countdown-overlay.tsx`
  - [x] Crear `apps/web/src/components/arena/countdown-overlay.spec.tsx`
  - [x] Props: `onCountdownEnd: () => void`
  - [x] Estado interno: `tick: number` (3 → 2 → 1 → 0 = "¡YA!")
  - [x] Usar `useState` + `useEffect` con `setInterval(1000)` para el tick (estado de UI local, no global — es correcto usar `useState` aquí)
  - [x] Renderizar sobre el canvas un overlay absolutamente posicionado, centrado, con fondo semitransparente (`bg-surface-base/80 backdrop-blur-sm`)
  - [x] Mostrar el número del tick en `text-9xl font-bold text-primary` con animación de escala (CSS `@keyframes` o `animate-bounce` de Tailwind)
  - [x] Cuando `tick` llega a -1 (después de "¡YA!"): llamar `onCountdownEnd()` y desmontar overlay (via `show` boolean prop o conditional render en padre)
  - [x] Al desmontar, limpiar el interval

- [x] **Task 3: Modificar LiveTextCanvas para blur + bloqueo** (AC: #2, #3)
  - [x] Aceptar nueva prop `isActive: boolean` (true cuando `matchStatus === 'playing'`)
  - [x] Cuando `!isActive`: el contenedor del texto aplica `filter: blur(8px) style={{ transition: 'filter 0.3s ease' }}`; el input oculto NO recibe focus
  - [x] Cuando `isActive`: quitar blur, habilitar focus en input
  - [x] En el handler de teclado: early return si `!isActive` (ignorar input durante countdown)
  - [x] En correct keystroke: llamar `arenaStore.incrementKeystrokes(true)` (además del caret emit existente)
  - [x] En error keystroke: llamar `arenaStore.incrementKeystrokes(false)` (además del caret emit existente)
  - [x] Actualizar spec `live-text-canvas.spec.tsx`: test que teclado ignorado cuando `isActive=false`

- [x] **Task 4: FocusWPMCounter component** (AC: #5, #6, #7, #11)
  - [x] Crear `apps/web/src/components/arena/focus-wpm-counter.tsx`
  - [x] Crear `apps/web/src/components/arena/focus-wpm-counter.spec.tsx`
  - [x] Props: `matchStatus: 'countdown' | 'playing' | 'finished'`
  - [x] Leer `localPosition`, `matchStartTime`, `totalKeystrokes`, `errorKeystrokes` del store via `getState()` (transient, sin react re-render)
  - [x] Calcular WPM y precisión via `setInterval(200ms)`
  - [x] Actualizar el DOM directamente via `wpmRef.current.textContent` y `precisionRef.current.textContent`
  - [x] Opacidad controlada via prop en render: `0.15` cuando playing, `1` en otros estados
  - [x] Cuando `matchStatus !== 'playing'`: detener el interval (no calcular)
  - [x] Limpiar interval en unmount
  - [x] Layout: `text-7xl font-bold text-primary` para WPM, `text-xl text-muted` para precisión
  - [x] Specs: renders "0" en idle, calcula WPM correcto con datos mockeados, opacidad correcta según matchStatus

- [x] **Task 5: Actualizar ArenaPage con Focus Fade y wiring** (AC: #4, #10)
  - [x] Leer `matchStatus` del store via `useStore` (reactive, para re-render del layout de Focus Fade)
  - [x] Mostrar `CountdownOverlay` cuando `matchStatus === 'countdown'`
  - [x] En `onCountdownEnd` callback: llamar `arenaStore.setMatchStarted()` (transiciona a 'playing')
  - [x] Envolver UI perimetral en un `<div>` con opacity fade
  - [x] `LiveTextCanvas` y `FocusWPMCounter` quedan FUERA del wrapper de opacity (siempre full opacity)
  - [x] Pasar `isActive={matchStatus === 'playing'}` a `LiveTextCanvas`
  - [x] Renderizar `FocusWPMCounter` con `matchStatus={matchStatus}`

- [x] **Task 6: Tests frontend** (AC: #1-#11)
  - [x] CountdownOverlay: 6 tests — renderiza 3, tick a 2, tick a 1, muestra GO, llama onCountdownEnd, limpia interval
  - [x] FocusWPMCounter: 8 tests — WPM inicial 0, opacidades, cálculo WPM, precisión, no calcula si no playing, limpia interval
  - [x] LiveTextCanvas: 12 tests — incluye isActive=false bloqueo, blur, keystrokes tracking
  - [x] arenaStore: 10 tests — incluye nuevas acciones setMatchStarted, incrementKeystrokes, resetRaceMetrics
  - [x] 0 regresiones: 54/54 web tests + 123/123 API tests pasan

## Dev Notes

### Contexto de Arquitectura

- **NO usar `useState`/`useContext` para WPM en tiempo real.** El WPM se actualiza a 5Hz (200ms). Usar refs + direct DOM manipulation. El `matchStatus` SÍ puede leerse via `useStore` en ArenaPage para re-render del layout (poco frecuente — solo 3 transiciones en toda la carrera).
- **CountdownOverlay es excepción:** Puede usar `useState` para su tick interno porque es un contador de UI local, no game state de alta frecuencia.
- **FocusWPMCounter:** usa `setInterval(200ms)` + `ref.current.textContent` para actualizar el DOM directamente (misma técnica que `MultiplayerCaret` con rAF). Leer el store via `getState()` no suscribe a React.
- **Blur en LiveTextCanvas:** Implementar con `style` inline (no className dinámica) para evitar flicker en transición.

### Infraestructura Existente a Reutilizar (NO Reinventar)

| Qué | Dónde | Cómo usar |
|-----|-------|-----------|
| Arena Zustand store | `apps/web/src/hooks/use-arena-store.ts` | Extender con campos de métricas — no crear nuevo store |
| LiveTextCanvas | `apps/web/src/components/arena/live-text-canvas.tsx` | Agregar prop `isActive`, blur, e incrementKeystrokes |
| ArenaPage | `apps/web/src/components/arena/arena-page.tsx` | Agregar CountdownOverlay + Focus Fade wrapper |
| MultiplayerCaret | `apps/web/src/components/arena/multiplayer-caret.tsx` | No modificar — ya funciona, sigue recibiendo carets durante countdown |
| useCaretSync | `apps/web/src/hooks/use-caret-sync.ts` | No modificar — el throttle sigue funcionando, pero LiveTextCanvas no emitirá durante countdown porque no procesa input |
| PLAYER_COLORS | `libs/shared/src/constants/player-colors.ts` | No aplica en esta historia |
| Tailwind vars | `apps/web/src/styles.css` | `--color-primary: #FF9B51`, bg-surface-base `#0F1F29`, bg-surface-raised `#25343F` |
| WS_EVENTS | `libs/shared/src/websocket/events.ts` | No se agregan nuevos eventos |
| matchStatus type | `use-arena-store.ts` | Ya tiene `'countdown' | 'playing' | 'finished'` — transición 2-3→2-4: 'countdown' era un estado sin usar, ahora toma rol activo |

### Patrones de Story 2-3 a Respetar (OBLIGATORIO)

1. **Testing:** Instanciación manual con `vi.fn()`, NO `TestingModule`. Para componentes React usar `@testing-library/react`.
2. **Zustand vanilla store:** El store fue creado con `createStore` de `zustand/vanilla`. Las acciones se agregan como funciones en el objeto del store.
3. **useStore import:** `import { useStore } from 'zustand'` (NO `zustand/vanilla`) para hooks reactivos.
4. **getState():** Para leer el store sin suscripción React: `arenaStore.getState()`.
5. **subscribe():** Para transient subscriptions: `arenaStore.subscribe(state => ...)`.
6. **Vitest 4.x:** No soporta `--testFile`. Usar `--testNamePattern`.
7. **kebab-case obligatorio** para todos los archivos.
8. **zustand@5.0.12** ya instalado — no modificar package.json salvo necesidad real.
9. **Tailwind v4 en CSS vars:** Los colores custom están en `apps/web/src/styles.css` como variables CSS, no en `tailwind.config.ts`.
10. **0 `useState` en componentes arena** salvo casos justificados (como el tick local del CountdownOverlay).

### WPM Formula (Client-Side, ≤10ms)

```typescript
// En FocusWPMCounter — corre en setInterval(200)
const { localPosition, matchStartTime, totalKeystrokes, errorKeystrokes } =
  arenaStore.getState();

const elapsedMinutes = matchStartTime
  ? (Date.now() - matchStartTime) / 60_000
  : 0;

const wpm = elapsedMinutes > 0
  ? Math.round((localPosition / 5) / elapsedMinutes)
  : 0;

const precision = totalKeystrokes > 0
  ? Math.round(((totalKeystrokes - errorKeystrokes) / totalKeystrokes) * 100)
  : 100;

// Actualizar DOM directamente (no React state):
wpmRef.current.textContent = String(wpm);
precisionRef.current.textContent = `${precision}%`;
```

### Focus Fade CSS Pattern

```tsx
// En ArenaPage — perimeter wrapper
<div
  style={{
    opacity: matchStatus === 'playing' ? 0.15 : 1,
    transition: 'opacity 0.5s ease',
    pointerEvents: matchStatus === 'playing' ? 'none' : 'auto',
  }}
>
  {/* Header, player list, room info — todo lo que NO es el canvas de texto */}
</div>

{/* Canvas y WPM — siempre full opacity, fuera del wrapper */}
<LiveTextCanvas isActive={matchStatus === 'playing'} ... />
<FocusWPMCounter matchStatus={matchStatus} />
```

### Scope Boundaries (Lo que NO es 2-4)

- **Match end / resultados:** Story 2-5 maneja `matchStatus === 'finished'`, pantalla de resultados y Rematch.
- **WPM final score (WPM * 10 * precision):** Cálculo de puntuación final es 2-5.
- **Reconexión durante carrera:** Story 2-6.
- **Espectadores:** Epic 3.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — FocusWPMCounter, Focus Fade, Countdown, Experience Mechanics, Component Strategy]
- [Source: _bmad-output/planning-artifacts/prd.md — FR16, FR17, FR18, NFR6]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, No useState for arena, Direct DOM manipulation]
- [Source: _bmad-output/implementation-artifacts/2-3-real-time-caret-sync-engine.md — Arena store shape, Zustand patterns, Key patterns from 2-2]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- CountdownOverlay: `setTimeout(onCountdownEnd, 400)` dentro del state updater de `setTick` causó que fake timers no lo ejecutaran. Solución: `endTimeout` ref declarada fuera del `setTick`, asignada desde el intervalo principal.
- arena-store: `initArena` cambiado de `matchStatus: 'playing'` a `matchStatus: 'countdown'` para habilitar el countdown. Test existente actualizado de `'playing'` a `'countdown'`.

### Completion Notes List

- Arena store extendido con `matchStartTime`, `totalKeystrokes`, `errorKeystrokes`, `setMatchStarted()`, `incrementKeystrokes()`, `resetRaceMetrics()`.
- `initArena()` ahora pone status `'countdown'` (antes `'playing'`) y resetea métricas.
- `CountdownOverlay`: muestra 3→2→1→¡YA!, llama `onCountdownEnd` 400ms después del ¡YA!
- `LiveTextCanvas`: nueva prop `isActive` (default true). Bloquea input y aplica blur cuando `isActive=false`. Integra `incrementKeystrokes` en el store en cada tecla (no Backspace).
- `FocusWPMCounter`: WPM y precisión actualizados via `setInterval(200ms)` + DOM directo. Opacidad `0.15` en playing, `1` en otros estados.
- `ArenaPage`: CountdownOverlay mostrado en countdown, Focus Fade wrapper en UI perimetral, `isActive` pasado a LiveTextCanvas, FocusWPMCounter integrado.
- 54/54 web tests pasan (29 existentes + 25 nuevos). 123/123 API tests pasan. 0 errores de lint.

### Change Log

- 2026-03-28: Story 2-4 implementada — Focus Fade, CountdownOverlay, FocusWPMCounter, LiveTextCanvas blur/bloqueo, arena store extendido.

### File List

**Archivos nuevos (4):**
- `ultimatype-monorepo/apps/web/src/components/arena/countdown-overlay.tsx`
- `ultimatype-monorepo/apps/web/src/components/arena/countdown-overlay.spec.tsx`
- `ultimatype-monorepo/apps/web/src/components/arena/focus-wpm-counter.tsx`
- `ultimatype-monorepo/apps/web/src/components/arena/focus-wpm-counter.spec.tsx`

**Archivos modificados (5):**
- `ultimatype-monorepo/apps/web/src/hooks/use-arena-store.ts` — nuevos campos + acciones métricas, initArena→countdown
- `ultimatype-monorepo/apps/web/src/hooks/use-arena-store.spec.ts` — tests nuevas acciones, initArena→countdown
- `ultimatype-monorepo/apps/web/src/components/arena/live-text-canvas.tsx` — prop isActive, blur, incrementKeystrokes
- `ultimatype-monorepo/apps/web/src/components/arena/live-text-canvas.spec.tsx` — tests isActive, blur, keystrokes
- `ultimatype-monorepo/apps/web/src/components/arena/arena-page.tsx` — Focus Fade, CountdownOverlay, FocusWPMCounter
