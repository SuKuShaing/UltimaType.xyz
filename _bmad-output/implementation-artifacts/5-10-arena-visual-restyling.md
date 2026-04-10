# Story 5.10: Arena Visual Restyling

Status: done

## Story

Como jugador en una partida activa,
quiero que la arena siga la misma estética visual que el lobby rediseñado,
para que la experiencia sea consistente y pulida en toda la plataforma.

## Acceptance Criteria

1. **AC1 — Text Canvas**: El canvas de texto usa `bg-surface-container-lowest` como fondo con `rounded-card-lg` (2.5rem) de border-radius. La tipografía del área de escritura usa IBM Plex Mono (`font-mono`). No hay bordes de 1px (No-Line Rule).

2. **AC2 — FocusWPMCounter Badges**: PPM y Error se muestran como dos badges pill separados (`rounded-full`, fondo `bg-surface-container-lowest`). El valor PPM usa color `text-primary` con fuente bold headline. El valor Error muestra el porcentaje de error (`errorKeystrokes / totalKeystrokes * 100`, inicialmente `0%`). Los labels usan estilo label-md (text-xs font-semibold uppercase tracking-wider text-text-muted).

3. **AC3 — Botón DETENER**: El botón "Salir" se reemplaza por un pill rojo prominente con label "DETENER" e icono `stop_circle` de Material Symbols. Mantiene exactamente el mismo comportamiento (abre el modal de confirmación de abandono).

4. **AC4 — Match Timer**: El timer ya muestra solo el tiempo restante como texto (sin barra de progreso). Verificar que las clases tipográficas usen tokens del Design System — no se requieren cambios si ya son conformes.

5. **AC5 — Overlays Glassmorphism**: Los overlays de cuenta regresiva, resultados, espera y estadísticas de abandono usan tratamiento glassmorphism: `bg-surface-base/60 backdrop-blur-[20px]`. Los contenedores internos usan `rounded-card`. Los botones dentro de overlays usan `rounded-full`. El efecto Focus Fade se preserva exactamente como está.

## Tasks / Subtasks

- [x] Task 1: Live Text Canvas — fondo y tipografía (AC: #1)
  - [x] 1.1 Agregar `bg-surface-container-lowest rounded-card-lg` al div contenedor externo de LiveTextCanvas (el div con `cursor-text`)
  - [x] 1.2 Agregar padding `p-8` al mismo div para que el texto no toque los bordes del fondo
  - [x] 1.3 Cambiar `font-sans` → `font-mono` en el div de caracteres visuales (el div con `text-lg leading-[2.5]`)
  - [x] 1.4 Verificar que los MultiplayerCarets siguen posicionándose correctamente (usan `getBoundingClientRect()` — el padding no los afecta)

- [x] Task 2: FocusWPMCounter — rediseño a badges pill (AC: #2)
  - [x] 2.1 Rediseñar la estructura JSX: cambiar de stack vertical a dos badges pill horizontales
  - [x] 2.2 Badge PPM: `<div className="flex flex-col items-center rounded-full bg-surface-container-lowest px-6 py-3">` con span `text-4xl font-bold text-primary` y label `text-xs font-semibold uppercase tracking-wider text-text-muted`
  - [x] 2.3 Badge Error: misma estructura que PPM, label "ERROR"
  - [x] 2.4 Actualizar cálculo en interval: en lugar de `precision`, calcular `error = totalKeystrokes > 0 ? Math.round((errorKeystrokes / totalKeystrokes) * 100) : 0`
  - [x] 2.5 Valor inicial del error: `0%` (era `100%` la precision)
  - [x] 2.6 Renombrar `precisionRef` → `errorRef` y atributo `data-precision` → `data-error`
  - [x] 2.7 Contenedor wrapper: cambiar de `flex-col` a `flex items-center justify-center gap-4`

- [x] Task 3: Botón DETENER en arena-page.tsx (AC: #3)
  - [x] 3.1 Reemplazar el botón `Salir` con pill prominente: `rounded-full bg-error text-white px-4 py-2`
  - [x] 3.2 Agregar icono `stop_circle` de Material Symbols: `<span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">stop_circle</span>`
  - [x] 3.3 Cambiar label de "Salir" a "DETENER"
  - [x] 3.4 Reposicionar: dado que ahora el canvas tiene `p-8`, colocar el botón dentro del canvas con `absolute right-6 top-6 z-10`
  - [x] 3.5 Agregar `type="button"` al botón
  - [x] 3.6 El click handler (`setShowAbandonModal(true)`) NO cambia

- [x] Task 4: Countdown Overlay glassmorphism (AC: #5)
  - [x] 4.1 `countdown-overlay.tsx` div principal: cambiar `bg-surface-base/80 backdrop-blur-sm` → `bg-surface-base/60 backdrop-blur-[20px]`

- [x] Task 5: Match Results Overlay glassmorphism (AC: #5)
  - [x] 5.1 `match-results-overlay.tsx` div inner card: cambiar `rounded-2xl bg-surface-base/95 backdrop-blur-md` → `rounded-card bg-surface-base/60 backdrop-blur-[20px]`
  - [x] 5.2 Botón "Salir" del resultado: `rounded-lg` → `rounded-full`
  - [x] 5.3 Botón "Unirse a la partida": `rounded-lg` → `rounded-full`
  - [x] 5.4 Botón "Revancha": `rounded-lg` → `rounded-full` (mantener colores condicionales)
  - [x] 5.5 Guest banner: `rounded-xl` → `rounded-card`
  - [x] 5.6 Auth buttons dentro del banner (Google, GitHub): `rounded-lg` → `rounded-full`

- [x] Task 6: Waiting-for-Others Overlay glassmorphism (AC: #5)
  - [x] 6.1 `waiting-for-others-overlay.tsx` div inner card: cambiar `rounded-2xl bg-surface-base/95 backdrop-blur-md` → `rounded-card bg-surface-base/60 backdrop-blur-[20px]`
  - [x] 6.2 Botón "Ver carrera en vivo": `rounded-lg` → `rounded-full`

- [x] Task 7: Abandon overlays en arena-page.tsx (AC: #5)
  - [x] 7.1 Abandoned stats overlay inner card (línea ~292): `rounded-2xl bg-surface-base/95 backdrop-blur-md` → `rounded-card bg-surface-base/60 backdrop-blur-[20px]`
  - [x] 7.2 Botón "Ver como espectador": `rounded-lg` → `rounded-full`
  - [x] 7.3 Botón "Ir al inicio": `rounded-lg` → `rounded-full`
  - [x] 7.4 Abandon confirmation modal inner card (línea ~345): `rounded-2xl bg-surface-base` → `rounded-card bg-surface-base/60 backdrop-blur-[20px]`
  - [x] 7.5 Botón "Cancelar" del modal: `rounded-lg` → `rounded-full`
  - [x] 7.6 Botón "Salir" del modal: `rounded-lg` → `rounded-full`

- [x] Task 8: Tests (AC: todos)
  - [x] 8.1 `focus-wpm-counter.spec.tsx`: Actualizado test "muestra 0 WPM y 100% precision" → ahora es `data-error` con valor inicial `0%`. Actualizado test de cálculo de precision → muestra porcentaje de error. Agregados tests badge PPM estructura, badge Error estructura, 0% con 0 keystrokes.
  - [x] 8.2 `arena-page.spec.tsx`: Agregados 3 tests para botón DETENER (rounded-full, bg-error, icono stop_circle, no aparece para espectadores).
  - [x] 8.3 `countdown-overlay.spec.tsx`: Agregado test glassmorphism (backdrop-blur-[20px], bg-surface-base/60).
  - [x] 8.4 `match-results-overlay.spec.tsx`: Agregados tests rounded-card y botón Salir rounded-full.
  - [x] 8.5 `live-text-canvas.spec.tsx`: Agregados 4 tests para bg-surface-container-lowest, rounded-card-lg, p-8, font-mono.

- [x] Task 9: Validación final (AC: todos)
  - [x] 9.1 `npx nx lint web` — 0 nuevos errores (12 pre-existentes `import/first` en archivos no modificados)
  - [x] 9.2 `npx nx test web` — 406 tests pasando (393 existentes + 13 nuevos)
  - [x] 9.3 Focus Fade preservado exactamente: `body.arena-active` toggle y CSS en styles.css sin cambios
  - [x] 9.4 0 nuevos `border-b`, `border-t`, `border-r` introducidos

## Dev Notes

### CRÍTICO: Story es 100% frontend — NO tocar backend ni shared library

Todos los cambios son CSS/Tailwind en archivos `.tsx` del frontend. No hay cambios de API, WebSocket, hooks de arena, lógica funcional. La mecánica de la carrera permanece exactamente igual.

### Archivos a MODIFICAR

```
apps/web/src/components/arena/live-text-canvas.tsx           — fondo, rounded-card-lg, font-mono
apps/web/src/components/arena/focus-wpm-counter.tsx          — rediseño pill badges PPM+Error
apps/web/src/components/arena/arena-page.tsx                 — DETENER button, abandon overlay/modal glassmorphism
apps/web/src/components/arena/countdown-overlay.tsx          — glassmorphism
apps/web/src/components/arena/match-results-overlay.tsx      — glassmorphism, rounded-card, rounded-full
apps/web/src/components/arena/waiting-for-others-overlay.tsx — glassmorphism, rounded-card, rounded-full

apps/web/src/components/arena/focus-wpm-counter.spec.tsx     — actualizar tests data-error, cálculo error%
apps/web/src/components/arena/arena-page.spec.tsx            — agregar test DETENER button
apps/web/src/components/arena/countdown-overlay.spec.tsx     — actualizar clases si aplica
apps/web/src/components/arena/match-results-overlay.spec.tsx — actualizar clases si aplica
apps/web/src/components/arena/live-text-canvas.spec.tsx      — agregar test container classes
```

**NO crear archivos nuevos.**

**NO tocar:**
- `apps/api/` (backend)
- `libs/shared/` (shared library)
- `apps/web/src/styles.css` (tokens ya están definidos, incluyendo arena-active Focus Fade)
- `apps/web/src/components/arena/multiplayer-caret.tsx` (no requiere cambios)
- `apps/web/src/components/arena/reconnecting-overlay.tsx` (no en scope)
- `apps/web/src/components/arena/spectator-leaderboard.tsx` (no en scope)
- `apps/web/src/components/arena/match-countdown-timer.tsx` (ya usa text-only; verificar conformidad solamente)
- Hooks: `use-arena-store.ts`, `use-caret-sync.ts`

### Design Tokens disponibles (ya definidos en styles.css)

```css
/* Surfaces */
bg-surface-base              /* Page background */
bg-surface-container-low     /* Section backgrounds */
bg-surface-container-lowest  /* Nested cards — USAR PARA TEXT CANVAS Y BADGES */
bg-surface-raised            /* Elevated interactive: dropdowns */

/* Border Radius */
rounded-card      /* 2rem — cards, containers */
rounded-card-lg   /* 2.5rem — hero sections, text canvas (AC1 usa este) */
rounded-full      /* 9999px — buttons, pills, badges */

/* Typography */
font-sans   /* Space Grotesk — UI labels, headings */
font-mono   /* IBM Plex Mono — USAR EN ÁREA DE ESCRITURA */

/* Colors */
text-primary, bg-primary     /* #FF9B51 — naranja accent */
bg-error, text-error         /* Rojo — botón DETENER */
text-text-main, text-text-muted
```

### Material Symbols — Patrón de uso

El font Material Symbols Outlined ya está cargado en `index.html`. Para usar iconos:

```tsx
<span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">stop_circle</span>
```

**Icono requerido en esta story:**
- `stop_circle` — botón DETENER (reemplaza el botón "Salir" del arena)

### FocusWPMCounter — Cambio de diseño completo

**ANTES (actual):**
```tsx
<div className="mb-6 flex flex-col items-center gap-1" style={{ opacity, transition: 'opacity 0.5s ease' }}>
  <span ref={wpmRef} data-wpm className="font-sans text-7xl font-bold text-primary">0</span>
  <span className="font-sans text-base text-text-muted">WPM</span>
  <span ref={precisionRef} data-precision className="font-sans text-xl text-text-muted">100%</span>
</div>
```

**DESPUÉS:**
```tsx
<div className="mb-6 flex items-center justify-center gap-4" style={{ opacity, transition: 'opacity 0.5s ease' }}>
  {/* PPM Badge */}
  <div className="flex flex-col items-center rounded-full bg-surface-container-lowest px-6 py-3">
    <span ref={wpmRef} data-wpm className="font-sans text-4xl font-bold leading-none text-primary">0</span>
    <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-muted">PPM</span>
  </div>
  {/* Error Badge */}
  <div className="flex flex-col items-center rounded-full bg-surface-container-lowest px-6 py-3">
    <span ref={errorRef} data-error className="font-sans text-4xl font-bold leading-none text-primary">0%</span>
    <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-muted">ERROR</span>
  </div>
</div>
```

**Cambio de cálculo en el interval:**
```ts
// ANTES:
const precision = totalKeystrokes > 0
  ? Math.round(((totalKeystrokes - errorKeystrokes) / totalKeystrokes) * 100)
  : 100;
if (precisionRef.current) precisionRef.current.textContent = `${precision}%`;

// DESPUÉS:
const error = totalKeystrokes > 0
  ? Math.round((errorKeystrokes / totalKeystrokes) * 100)
  : 0;
if (errorRef.current) errorRef.current.textContent = `${error}%`;
```

### LiveTextCanvas — Cambios de contenedor

**ANTES:**
```tsx
<div className="relative mx-auto max-w-3xl cursor-text" onClick={handleContainerClick}>
  ...
  <div className="relative font-sans text-lg leading-[2.5] tracking-wide text-text-main" aria-hidden="true">
```

**DESPUÉS:**
```tsx
<div className="relative mx-auto max-w-3xl cursor-text bg-surface-container-lowest rounded-card-lg p-8" onClick={handleContainerClick}>
  ...
  <div className="relative font-mono text-lg leading-[2.5] tracking-wide text-text-main" aria-hidden="true">
```

**IMPORTANTE:** El padding `p-8` NO rompe los MultiplayerCarets porque usan `getBoundingClientRect()` para calcular posiciones absolutas de los spans. Las posiciones son relativas al `containerRef` (el div de arena-page.tsx) usando coordenadas de pantalla reales, no coordenadas relativas al contenedor CSS interno de LiveTextCanvas.

### Botón DETENER — Cambio de diseño

**ANTES:**
```tsx
<button
  onClick={() => setShowAbandonModal(true)}
  className="absolute right-0 top-0 -translate-y-7 text-sm font-semibold text-text-muted transition-opacity hover:opacity-100"
  style={{ pointerEvents: 'auto', opacity: 0.5 }}
>
  Salir
</button>
```

**DESPUÉS (dentro del canvas, esquina superior derecha):**
```tsx
<button
  type="button"
  onClick={() => setShowAbandonModal(true)}
  className="absolute right-6 top-6 z-10 flex items-center gap-1.5 rounded-full bg-error px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
>
  <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">stop_circle</span>
  DETENER
</button>
```

El botón se reposiciona al interior del canvas (`right-6 top-6`) porque ahora el canvas tiene fondo y padding. El `z-10` asegura que aparece sobre el texto. El `style={{ opacity: 0.5 }}` de antes se elimina — la prominencia es intencional.

### Glassmorphism — Patrón de overlays

**Regla para todos los overlays con contenido:**
- Fondo de la tarjeta de contenido: `bg-surface-base/60 backdrop-blur-[20px]`
- Container de la tarjeta: `rounded-card` (en lugar de `rounded-2xl`)
- Botones dentro de la tarjeta: `rounded-full` (en lugar de `rounded-lg`)

**CountdownOverlay** — diferente porque todo el div ES el overlay:
```tsx
// ANTES:
<div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-sm">
// DESPUÉS:
<div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-base/60 backdrop-blur-[20px]">
```

### Focus Fade — NO tocar

La mecánica de Focus Fade (`arena-active` en body, `focus-faded` en divs periféricos, CSS custom properties en `styles.css`) está implementada y funcionando. Cero cambios en:
- El `useEffect` en `arena-page.tsx` que toglea `body.arena-active`
- La clase `focus-faded` en el div periférico
- `styles.css` reglas de `arena-active`

### Match Countdown Timer — Solo verificar

El `MatchCountdownTimer` ya muestra solo el tiempo como texto (sin barra de progreso). Las clases `font-sans text-6xl font-bold` y fases `text-text-muted`, `text-primary`, `text-error` ya usan tokens del Design System. Verificar visualmente que no se ve roto con el nuevo background del canvas — no se anticipan cambios necesarios.

### Patrón de testing (heredado de Stories 5-9)

- **Sin jest-dom** — usar `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`
- `vi.clearAllMocks()` en `beforeEach`
- `type="button"` en todos los botones no-submit
- Para verificar clases: `element.classList.contains('rounded-card-lg')`
- `data-wpm` para el elemento de WPM, `data-error` para el elemento de error (renombrado de `data-precision`)

### Actualización de tests de FocusWPMCounter

Los tests existentes asumen la estructura antigua. Cambios necesarios:

```ts
// ANTES:
it('muestra 0 WPM y 100% precision al montar', () => {
  const precisionEl = container.querySelector('[data-precision]');
  expect(precisionEl?.textContent).toBe('100%');
});

// DESPUÉS:
it('muestra 0 PPM y 0% error al montar', () => {
  const errorEl = container.querySelector('[data-error]');
  expect(errorEl?.textContent).toBe('0%');
});
```

```ts
// ANTES (test de cálculo):
// (10 - 1) / 10 = 90%
expect(precisionEl?.textContent).toBe('90%');

// DESPUÉS:
const errorEl = container.querySelector('[data-error]');
// 1/10 = 10% de errores
expect(errorEl?.textContent).toBe('10%');
```

### No-Line Rule — Recordatorio

- NO agregar `border-b`, `border-t`, `border-r` como separadores
- Separación visual se logra con cambios de tono (tonal shifts)
- El único borde permitido es el `border-l-[3px]` del PlayerAvatarPill (lobby, ya existente)

### Project Structure Notes

- Monorepo en `ultimatype-monorepo/` dentro del working directory. Paths reales:
  - `ultimatype-monorepo/apps/web/src/components/arena/`
- Tests: `npx nx test web`
- Lint: `npx nx lint web`

### Previous Story Intelligence (5-9 Lobby Visual Restyling)

Story 5-9 aplicó el mismo patrón de restyling al lobby. Lecciones clave:
- `material-symbols-outlined` necesita `aria-hidden="true"` en cada instancia
- Inline styles como `var(--color-text-muted)` en lugar de hardcoded `#64748B`
- `role="dialog"` + `aria-modal="true"` en modals de confirmación
- `aria-label` en botones de solo icono
- El botón DETENER con icono probablemente necesita `aria-label="Detener partida"` si no tiene texto visible claro
- Pattern testing: `classList.contains()` para verificar clases CSS, NO jest-dom matchers
- 393 web tests pasando al finalizar 5-9 — mantener todos esos pasando

### Git Intelligence

Commits recientes relevantes:
- `3fcae0f` 5-9-lobby-visual-restyling: done — lobby restyling con mismo patrón (referencia directa)
- `50a3e20` 5-8-responsive-and-polish: done — max-w-3xl 2xl:max-w-5xl ya en arena-page
- `9707d5a` Crear partida sin iniciar sesión — guest room creation intacto

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.10] — ACs originales
- [Source: _bmad-output/implementation-artifacts/5-9-lobby-visual-restyling.md] — Patrón de restyling, testing, tokens heredados
- [Source: ultimatype-monorepo/apps/web/src/components/arena/arena-page.tsx] — Código actual (373 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/live-text-canvas.tsx] — Código actual (288 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/focus-wpm-counter.tsx] — Código actual (62 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/countdown-overlay.tsx] — Código actual (41 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx] — Código actual (266 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/waiting-for-others-overlay.tsx] — Código actual (41 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/multiplayer-caret.tsx] — getCharPosition usa getBoundingClientRect (línea 94-98) — safe para padding changes
- [Source: ultimatype-monorepo/apps/web/src/components/arena/focus-wpm-counter.spec.tsx] — Tests a actualizar (91 líneas)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Focus Fade] — Focus Fade preservation
- [Source: ultimatype-monorepo/apps/web/src/styles.css] — Tokens Design System, arena-active CSS

### Review Findings

- [x] [Review][Decision] D1: Label "SALIR" vs "DETENER" — Aceptado SALIR. Icono cambiado de `stop_circle` → `logout` espejado con `scaleX(-1)` para ser opuesto visual de `login` (Unirse). Patch aplicado.
- [x] [Review][Decision] D2: Posición del botón SALIR debajo del canvas — Aceptado. Posición actual `right-0 -bottom-14` preferida por el usuario sobre `right-6 top-6` del spec.
- [x] [Review][Decision] D3: Sizing de badges FocusWPMCounter — Aceptado tamaño actual (`px-12 py-6`, `text-6xl`, `text-sm`). Mayor legibilidad en visión periférica.
- [x] [Review][Decision] D4: Sizing de LiveTextCanvas — Aceptado (`p-10`, `text-xl`, `w-full`). Compensa el cambio a font-mono.
- [x] [Review][Decision] D5: max-w responsive breakpoint removido — Aceptado. `max-w-5xl` fijo coherente con el nuevo sizing de badges y canvas.
- [x] [Review][Decision] D6: Inconsistencia WPM vs PPM — Resuelto: unificado a "PPM" en toda la arena (waiting-for-others, abandoned stats, match-results). Patch aplicado.
- [x] [Review][Patch] W1: `backdrop-blur-[20px]` extraído como design token `--blur-glass` → clase `backdrop-blur-glass`. Aplicado en 5 archivos + token en styles.css. Patch aplicado.
- [x] [Review][Dismiss] W2: Sin `aria-live` en badges PPM/Error — Dismissed. Actualizaciones cada 200ms harían que screen reader hable sin parar.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

(sin issues — implementación directa sin errores de compilación)

### Completion Notes List

- Task 1: LiveTextCanvas rediseñado — `bg-surface-container-lowest rounded-card-lg p-8` en contenedor externo, `font-mono` en div de caracteres visuales. MultiplayerCarets no afectados (usan getBoundingClientRect).
- Task 2: FocusWPMCounter completamente rediseñado — dos badges pill horizontales `rounded-full bg-surface-container-lowest`. PPM con `data-wpm`, Error con `data-error`. Cálculo cambia de precision% a error%. Valor inicial `0%` (antes `100%`).
- Task 3: Botón DETENER — `rounded-full bg-error px-3 py-1.5` con icono `stop_circle` Material Symbols, posicionado `absolute right-6 top-6 z-10` dentro del canvas, `aria-label="Detener partida"`. Comportamiento intacto.
- Task 4: CountdownOverlay — `bg-surface-base/60 backdrop-blur-[20px]`.
- Task 5: MatchResultsOverlay — inner card `rounded-card bg-surface-base/60 backdrop-blur-[20px]`. Botones `rounded-full`. Guest banner `rounded-card`. Auth buttons `rounded-full`.
- Task 6: WaitingForOthersOverlay — inner card `rounded-card bg-surface-base/60 backdrop-blur-[20px]`. Botón `rounded-full`.
- Task 7: Abandoned stats overlay y abandon modal en arena-page.tsx — `rounded-card bg-surface-base/60 backdrop-blur-[20px]`. Todos los botones `rounded-full`.
- Task 8: 13 nuevos tests agregados. focus-wpm-counter.spec: 3 tests actualizados + 2 nuevos. arena-page.spec: 3 nuevos. countdown-overlay.spec: 1 nuevo. match-results-overlay.spec: 2 nuevos. live-text-canvas.spec: 4 nuevos.
- Task 9: 406 tests pasando (393+13). 0 nuevos errores de lint. 0 violaciones No-Line Rule.

### File List

- `apps/web/src/components/arena/live-text-canvas.tsx` — Modificado: bg-surface-container-lowest, rounded-card-lg, p-8, font-mono
- `apps/web/src/components/arena/focus-wpm-counter.tsx` — Modificado: rediseño completo a 2 badges pill PPM+Error
- `apps/web/src/components/arena/arena-page.tsx` — Modificado: botón DETENER pill rojo stop_circle, abandoned overlay/modal glassmorphism, botones rounded-full
- `apps/web/src/components/arena/countdown-overlay.tsx` — Modificado: glassmorphism bg-surface-base/60 backdrop-blur-[20px]
- `apps/web/src/components/arena/match-results-overlay.tsx` — Modificado: glassmorphism, rounded-card, rounded-full buttons, guest banner rounded-card
- `apps/web/src/components/arena/waiting-for-others-overlay.tsx` — Modificado: glassmorphism, rounded-card, rounded-full button
- `apps/web/src/components/arena/focus-wpm-counter.spec.tsx` — Modificado: tests actualizados para data-error, porcentaje de error, nuevos tests de badges
- `apps/web/src/components/arena/arena-page.spec.tsx` — Modificado: +3 tests botón DETENER
- `apps/web/src/components/arena/countdown-overlay.spec.tsx` — Modificado: +1 test glassmorphism
- `apps/web/src/components/arena/match-results-overlay.spec.tsx` — Modificado: +2 tests glassmorphism y rounded-full
- `apps/web/src/components/arena/live-text-canvas.spec.tsx` — Modificado: +4 tests design tokens
