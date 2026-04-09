# Story 5.9: Lobby Visual Restyling

Status: done

## Story

Como usuario en una sala de espera (lobby),
quiero que el lobby siga la misma estética visual que la pantalla principal rediseñada,
para que la experiencia sea consistente en toda la plataforma.

## Acceptance Criteria

1. **AC1 — Surface Hierarchy**: El lobby usa la jerarquía tonal del Design System: `bg-surface-container-low` para secciones (lista de jugadores, panel de configuración), `bg-surface-container-lowest` para nested cards (PlayerAvatarPill, badges de espectadores). `bg-surface-raised` se mantiene para elementos interactivos elevados (dropdowns, botones secundarios). No usar `border-*` para separar secciones — tonal shifts solamente (No-Line Rule).

2. **AC2 — Border Radius**: Cards y contenedores de sección usan `rounded-card` (2rem). Botones de acción, pills de dificultad/tiempo, y botones de ready/start usan `rounded-full`. Modals usan `rounded-card` (2rem). Dropdowns de menú usan `rounded-2xl`.

3. **AC3 — PlayerAvatarPill**: Las pills de jugador usan `bg-surface-container-lowest` con `rounded-card` (2rem), borde izquierdo de 3px con el color del jugador (`border-l-[3px]`), iniciales/avatar, nombre alineado con tipografía del Design System (Space Grotesk). El color dot se elimina (reemplazado por el borde izquierdo de color).

4. **AC4 — Material Symbols Icons**: Reemplazar los iconos de texto por Material Symbols Outlined:
   - `···` (menú) → icono `more_vert`
   - `✕` (cerrar toast) → icono `close`
   - Heading "Nivel de Dificultad" → icono `settings` al lado
   - Heading "Límite de Tiempo" → icono `timer` al lado
   - Heading "Máximo de Jugadores" → icono `groups` al lado
   - Botón "Iniciar Partida" → icono `bolt` al lado del texto
   - `<select>` de max players con `appearance-none` → icono `expand_more` como chevron visual

5. **AC5 — Configuration Panel**: Los selectores de dificultad, tiempo y max players se envuelven en un contenedor `bg-surface-container-low rounded-card p-6`. Los botones de selección usan `rounded-full` (pill style). El nivel activo se resalta con `bg-primary text-surface-base`. El `<select>` de max players se estiliza con `rounded-full bg-surface-container-lowest`.

6. **AC6 — Botón Start/Ready**: El botón "Iniciar Partida" usa `rounded-full` (pill) con icono `bolt` de Material Symbols. El botón "Listo" usa `rounded-full`. El botón "Salir" usa `rounded-full`. Todos mantienen sus colores actuales (primary, success/20, surface-raised).

7. **AC7 — No-Line Rule**: Verificar que ningún cambio introduzca `border-b`, `border-t` u otros separadores 1px. El borde izquierdo del PlayerAvatarPill (`border-l-[3px]`) es una excepción intencional — es un indicador de color de jugador, no un separador.

## Tasks / Subtasks

- [x] Task 1: Surface hierarchy en lobby-page.tsx (AC: #1, #2)
  - [x] 1.1 Envolver sección de jugadores en `<div className="rounded-card bg-surface-container-low p-6">`
  - [x] 1.2 Envolver configuración del host en un único `<div className="rounded-card bg-surface-container-low p-6 space-y-6">`
  - [x] 1.3 Header: room code badge → `rounded-full bg-surface-container-lowest`; copy button → `rounded-full bg-surface-container-lowest`
  - [x] 1.4 Spectator badge → `rounded-full bg-surface-container-lowest`
  - [x] 1.5 Toast items: `rounded-lg` → `rounded-full`
  - [x] 1.6 Modal: `rounded-2xl` → `rounded-card`; botones del modal → `rounded-full`

- [x] Task 2: PlayerAvatarPill restyling (AC: #3)
  - [x] 2.1 Container: `rounded-card bg-surface-container-lowest border-l-[3px]` con `style={{ borderLeftColor: color }}`
  - [x] 2.2 Eliminar el color dot — reemplazado por borde izquierdo
  - [x] 2.3 Spectator name badges: `rounded-full bg-surface-container-lowest`

- [x] Task 3: Material Symbols icons (AC: #4)
  - [x] 3.1 Helper inline: `<span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>`
  - [x] 3.2 Reemplazar `···` en botones de menú → icono `more_vert` (3 instancias)
  - [x] 3.3 Reemplazar `✕` en cierre de toast → icono `close`
  - [x] 3.4 Agregar iconos a headings: `settings`, `timer`, `groups`
  - [x] 3.5 Agregar icono `bolt` al botón "Iniciar Partida"

- [x] Task 4: Configuration panel pill buttons (AC: #5)
  - [x] 4.1 Difficulty buttons: `rounded-full`
  - [x] 4.2 Time limit buttons: `rounded-full`
  - [x] 4.3 Max players `<select>`: `rounded-full bg-surface-container-lowest`
  - [x] 4.4 Non-host config display: `rounded-card bg-surface-container-low p-4`

- [x] Task 5: Action buttons pill style (AC: #6)
  - [x] 5.1 Botón "Salir": `rounded-full`
  - [x] 5.2 Botón "Listo": `rounded-full`
  - [x] 5.3 Botón "Iniciar Partida": `rounded-full` + `bolt` icon
  - [x] 5.4 Action buttons container mantiene `max-w-md 2xl:max-w-2xl`

- [x] Task 6: Dropdown menus restyling (AC: #1, #2)
  - [x] 6.1 Dropdowns de jugador (host/own): `rounded-2xl bg-surface-raised`
  - [x] 6.2 Dropdown de espectador: `rounded-2xl bg-surface-raised`

- [x] Task 7: Tests (AC: todos)
  - [x] 7.1 `lobby-page.spec.tsx`: +3 nuevos tests (design tokens, Material Symbols icons, rounded-full buttons)
  - [x] 7.2 `player-avatar-pill.spec.tsx`: +3 nuevos tests (design tokens, borderLeftColor, disconnected color) + 1 actualizado (border-l exception)
  - [x] 7.3 Verificado: 0 tests rotos por cambios de clases

- [x] Task 8: Validación final (AC: todos)
  - [x] 8.1 `npx nx lint web` — 0 nuevos errores (12 pre-existentes `import/first`)
  - [x] 8.2 `npx nx test web` — 393 tests pasando (387 existentes + 6 nuevos)
  - [x] 8.3 Verificado: 0 nuevos border-b/border-t. Único border es `border-l-[3px]` intencional en PlayerAvatarPill

## Dev Notes

### CRITICO: Story es 100% frontend — NO tocar backend ni shared library

Todos los cambios son CSS/Tailwind en archivos `.tsx` del frontend. No hay cambios de API, hooks, ni lógica funcional. La interacción del lobby (WebSocket, ready, start, etc.) permanece exactamente igual.

### Archivos a MODIFICAR

```
apps/web/src/components/lobby/lobby-page.tsx         — Surface hierarchy, radius, Material Symbols, config panel, action buttons
apps/web/src/components/lobby/player-avatar-pill.tsx  — Surface, radius, border-l color, eliminar dot

apps/web/src/components/lobby/lobby-page.spec.tsx         — Actualizar aserciones de clases
apps/web/src/components/lobby/player-avatar-pill.spec.tsx  — Actualizar aserciones de clases
```

**NO crear archivos nuevos.**

**NO tocar:**
- `apps/api/` (backend)
- `libs/shared/` (shared library)
- Hooks existentes (`use-lobby.ts`, `use-auth.ts`)
- `apps/web/src/styles.css` (tokens ya están definidos)
- Componentes de arena, home, leaderboard, profile

### Design Tokens disponibles (ya definidos en styles.css)

```css
/* Surfaces (tonal layering) */
bg-surface-base              /* Page background */
bg-surface-container-low     /* Section backgrounds — USAR PARA SECCIONES */
bg-surface-container         /* Intermediate layer */
bg-surface-sunken            /* Panel backgrounds */
bg-surface-container-lowest  /* Nested cards — USAR PARA PILLS/CARDS DENTRO DE SECCIONES */
bg-surface-raised            /* Elevated interactive: dropdowns, hover states */

/* Border Radius */
rounded-card      /* 2rem — cards, containers, modals */
rounded-card-lg   /* 2.5rem — hero sections */
rounded-full      /* 9999px — buttons, pills */

/* Typography */
font-sans         /* Space Grotesk — headings, UI labels */
font-mono         /* IBM Plex Mono — typing areas, data values */

/* Colors (ya en uso) */
text-primary, bg-primary     /* #FF9B51 — orange accent */
text-text-main, text-text-muted, text-error, text-success
```

### Material Symbols — Patrón de uso

El font Material Symbols Outlined ya está cargado en `index.html`. Para usar iconos:

```tsx
<span className="material-symbols-outlined text-[18px] leading-none">more_vert</span>
```

Ajustar `text-[Xpx]` según el contexto: 18px para inline con texto, 20px para botones, 24px para headings.

**Iconos requeridos en esta story:**
- `more_vert` — menú de opciones (reemplaza `···`)
- `close` — cerrar toast (reemplaza `✕`)
- `settings` — heading Dificultad
- `timer` — heading Tiempo
- `groups` — heading Max Jugadores
- `bolt` — botón Iniciar Partida

### PlayerAvatarPill — Cambio de diseño

**ANTES (actual):**
```tsx
<div className="flex items-center gap-3 rounded-lg bg-surface-raised px-4 py-3 ...">
  {/* Color dot */}
  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
  {/* Avatar */}
  {/* Name + badges */}
  {/* Status */}
</div>
```

**DESPUÉS:**
```tsx
<div
  className="flex items-center gap-3 rounded-card bg-surface-container-lowest px-4 py-3 border-l-[3px] ..."
  style={{ borderLeftColor: player.disconnected ? '#64748B' : color }}
>
  {/* Avatar — sin cambios */}
  {/* Name + badges — sin cambios */}
  {/* Status — sin cambios */}
</div>
```

El color dot (`h-3 w-3 rounded-full`) se elimina. El color del jugador ahora se indica por el borde izquierdo de 3px.

### Configuration Panel — Estructura envolvente

**ANTES:** Cada selector (difficulty, time, max players) es un div independiente con `mb-6`.

**DESPUÉS:** Los 3 selectores se envuelven en un único contenedor:
```tsx
<div className="mb-8 w-full max-w-md 2xl:max-w-2xl rounded-card bg-surface-container-low p-6 space-y-6">
  {/* Difficulty selector — sin mb-6 */}
  {/* Time limit selector — sin mb-6 */}
  {/* Max players selector — sin mb-6 */}
</div>
```

El `space-y-6` del wrapper reemplaza los `mb-6` individuales.

### Patrón de testing (heredado de Stories 5-2 al 5-8)

- **Sin jest-dom** — usar `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`
- `vi.clearAllMocks()` en `beforeEach`
- `type="button"` en todos los botones no-submit
- Para verificar clases: `element.classList.contains('rounded-card')`
- Para verificar inline styles: `element.style.borderLeftColor`

### Section headings con iconos — Patrón

```tsx
<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-muted">
  <span className="material-symbols-outlined text-[18px] leading-none">settings</span>
  Nivel de Dificultad
</h2>
```

### No-Line Rule — Recordatorio

- NO agregar `border-b`, `border-t`, `border-r` como separadores
- El `border-l-[3px]` en PlayerAvatarPill es una EXCEPCIÓN aceptada — es un indicador visual de color de jugador, no un separador de secciones
- Separación visual se logra con cambios de tono (surface-base → surface-container-low → surface-container-lowest)

### Cosas que NO cambiar

- La lógica funcional del lobby (WebSocket, ready, start, leave, etc.)
- El flujo del menú de contexto (opciones propias, opciones del host)
- Los handlers de eventos (handleCopyLink, handleLeave, handleSwitchToSpectator, etc.)
- La animación `btn-glow-pulse` del botón Listo
- El modal de confirmación (solo cambiar radius y botones)
- El contenido de los toasts (solo cambiar estilos visuales)
- La estructura de imports existente

### Project Structure Notes

- Monorepo en `ultimatype-monorepo/` dentro del working directory. Paths reales:
  - `ultimatype-monorepo/apps/web/src/components/lobby/lobby-page.tsx`
  - `ultimatype-monorepo/apps/web/src/components/lobby/player-avatar-pill.tsx`
  - `ultimatype-monorepo/apps/web/src/components/lobby/lobby-page.spec.tsx`
  - `ultimatype-monorepo/apps/web/src/components/lobby/player-avatar-pill.spec.tsx`
- Tests: `npx nx test web`
- Lint: `npx nx lint web`

### Previous Story Intelligence (5-8 Responsive & Polish)

- Story 5-8 ya expandió `max-w-md` → `max-w-md 2xl:max-w-2xl` en lobby — estos breakpoints se mantienen
- Story 5-8 ya aplicó `2xl:max-w-[90rem]` en NavBar — esto no se toca
- Pattern testing: classList.contains() para verificar clases CSS
- 387 web tests pasando al finalizar 5-8
- 12 errores pre-existentes de lint `import/first` en archivos no modificados — ignorar

### Git Intelligence

Commits recientes relevantes:
- `50a3e20` 5-8-responsive-and-polish: done — breakpoints 2xl aplicados
- `9707d5a` Crear partida sin iniciar sesión — guest room creation
- `dd2d460` 5-7-player-profile-ranking-card: done — patrón PlayerProfile

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.9] — ACs originales
- [Source: _bmad-output/implementation-artifacts/5-8-responsive-and-polish.md] — Patrones de testing, breakpoints, design tokens heredados
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PlayerAvatarPill] — Diseño tonal integrando bg-surface-raised para profundidad sutil
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation] — No-Line Rule, tonal layering, typography
- [Source: ultimatype-monorepo/apps/web/src/styles.css:80-97] — Design System Rules y Surface Hierarchy
- [Source: ultimatype-monorepo/apps/web/src/components/lobby/lobby-page.tsx] — Código actual del lobby (596 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/lobby/player-avatar-pill.tsx] — Código actual del pill (100 líneas)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

(sin issues — implementación directa sin errores de compilación)

### Completion Notes List

- Task 1: Surface hierarchy aplicada. Secciones de jugadores y configuración envueltas en `rounded-card bg-surface-container-low p-6`. Header badges y toasts migrados a `rounded-full bg-surface-container-lowest`. Modal migrado a `rounded-card` con botones `rounded-full`.
- Task 2: PlayerAvatarPill rediseñado — color dot eliminado, reemplazado por `border-l-[3px]` con `borderLeftColor` inline del color del jugador. Container ahora usa `rounded-card bg-surface-container-lowest`.
- Task 3: Material Symbols integrados — `more_vert` reemplaza `···` en 3 botones de menú, `close` reemplaza `✕` en toasts, `settings`/`timer`/`groups` agregados a headings de config, `bolt` agregado al botón "Iniciar Partida".
- Task 4: Todos los botones de selección (difficulty, time limit) migrados a `rounded-full` pill style. Select de max players: `rounded-full bg-surface-container-lowest`. Non-host config display envuelto en `rounded-card bg-surface-container-low p-4`.
- Task 5: Botones de acción (Salir, Listo, Iniciar Partida) migrados a `rounded-full`. Botón Start muestra icono `bolt` inline cuando está habilitado.
- Task 6: Dropdowns de menú migrados de `rounded-lg` a `rounded-2xl`. Botones de menú migrados a `rounded-full`.
- Task 7: 6 nuevos tests agregados (3 en lobby-page.spec, 3 en player-avatar-pill.spec) + 1 test actualizado.
- Task 8: 393 tests pasando. 0 nuevos errores de lint. 0 violaciones No-Line Rule.

### File List

- `apps/web/src/components/lobby/lobby-page.tsx` — Modificado: surface hierarchy, Material Symbols icons, pill buttons, config panel wrapper, modal radius
- `apps/web/src/components/lobby/player-avatar-pill.tsx` — Modificado: rounded-card, bg-surface-container-lowest, border-l-[3px] color, eliminado color dot
- `apps/web/src/components/lobby/lobby-page.spec.tsx` — Modificado: +3 nuevos tests (design tokens, Material Symbols, rounded-full buttons)
- `apps/web/src/components/lobby/player-avatar-pill.spec.tsx` — Modificado: +3 nuevos tests (design tokens, borderLeftColor, disconnected color) + 1 test actualizado (border-l exception)

### Review Findings

- [x] [Review][Decision] `expand_more` icon no estaba en la lista de AC4 — Aceptado. AC4 actualizado para incluir `expand_more` como 7mo icono (chevron del select con appearance-none).
- [x] [Review][Decision] `bolt` icon solo visible cuando botón está habilitado — Aceptado. Bolt como indicador de "acción disponible"; mostrarlo junto a "Esperando..." sería confuso.
- [x] [Review][Decision] Copy Link button usa `bg-surface-container-lowest` vs AC1 `bg-surface-raised` — Aceptado. Micro-acción utilitaria, no botón secundario. Cohesión visual badge+botón prevalece sobre regla genérica AC1.
- [x] [Review][Patch] Todos los `<span class="material-symbols-outlined">` sin `aria-hidden="true"` (9 instancias) [lobby-page.tsx] — Aplicado. `aria-hidden="true"` añadido a las 9 instancias. 393 tests pasando.
- [x] [Review][Patch] Toast dismiss `<button>` sin `aria-label` [lobby-page.tsx:~209] — Aplicado. `aria-label="Cerrar"` añadido. 393 tests pasando.
- [x] [Review][Patch] Hardcoded `#64748B` reemplazado por `var(--color-text-muted)` [player-avatar-pill.tsx:34] — Aplicado. Ahora respeta dark mode. Test actualizado (jsdom no resuelve CSS vars).
- [x] [Review][Patch] Modal de confirmación: `role="dialog"` y `aria-modal="true"` añadidos [lobby-page.tsx:~572] — Aplicado. 393 tests pasando.
- [x] [Review][Defer] `z-[1]` magic number en botón Salir [lobby-page.tsx:~524] — deferred, pre-existing
- [x] [Review][Defer] Material Symbols font load failure muestra texto literal en toda la app — deferred, pre-existing concern a nivel de app (font ya cargado en index.html y usado en nav-bar, game-actions, etc.)
- [x] [Review][Defer] Host solo en sala → `allOthersReady=true` (Array.every on []) — deferred, pre-existing logic, no introducida por este diff
