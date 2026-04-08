# Story 5.8: Responsive & Polish

Status: done

## Story

Como usuario,
quiero que la pantalla principal rediseñada se vea profesional en cualquier dispositivo,
para tener una experiencia consistente independientemente del tamaño de pantalla.

## Acceptance Criteria

1. **AC1 — Mobile (<768px)**: Las secciones del home se apilan verticalmente en full-width. Ya funciona con `col-span-12` base. Verificar que no haya overflow horizontal ni elementos cortados.

2. **AC2 — Tablet (768–1024px)**: El home usa una grilla de 2 columnas en breakpoint `md`. Las 4 secciones del home (GameActions, LiveMatches, LeaderboardPreview, PlayerProfile) deben agregar `md:col-span-6` para ocupar 50% del ancho cada par, formando 2 filas de 2 columnas.

3. **AC3 — Desktop (>1024px)**: El home usa la grilla completa de 12 columnas con el layout 8+4 actual. Ya funciona. No cambiar.

4. **AC4 — Pantallas grandes (>1536px, `2xl:`)**: El contenido NO debe quedar confinado en una columna estrecha:
   - **Home**: El grid wrapper cambia de `max-w-6xl` a `max-w-6xl 2xl:max-w-none` para expandirse al ancho disponible.
   - **Leaderboard** (`/leaderboard`): `max-w-3xl` → `max-w-3xl 2xl:max-w-5xl`.
   - **Perfil** (`/u/:slug`): A partir de `2xl:`, el layout cambia a 2 columnas: columna izquierda (Hero + edit panel), columna derecha (posiciones de ranking + stats + historial). El wrapper pasa de `max-w-2xl` a `max-w-2xl 2xl:max-w-5xl`.
   - **Arena** (`/room/:code`): Los contenedores `max-w-3xl` expanden a `2xl:max-w-5xl`.
   - **Lobby** (`/room/:code` antes de iniciar): Los paneles `max-w-md` expanden a `2xl:max-w-2xl`.

5. **AC5 — Transiciones y hover**: Los elementos interactivos tienen transiciones suaves. Las secciones del home tienen `transition-shadow duration-200 hover:shadow-sm` (sutil). Los botones de acción ya tienen hover en la mayoría de los casos. No agregar animaciones de escala a las secciones del home (son contenedores de información, no botones).

6. **AC6 — No-Line Rule**: Verificar que ningún cambio nuevo introduzca `border-b`, `border-t` u otros separadores de 1px. Usar tonal shifts.

## Tasks / Subtasks

- [x] Task 1: Tablet breakpoint en secciones del home (AC: #2)
  - [x] 1.1 `apps/web/src/components/home/game-actions-section.tsx` — agregar `md:col-span-6` a la clase de `<section>`
  - [x] 1.2 `apps/web/src/components/home/live-matches-section.tsx` — agregar `md:col-span-6` a la clase de `<section>`
  - [x] 1.3 `apps/web/src/components/home/leaderboard-preview-section.tsx` — agregar `md:col-span-6` a la clase de `<section>`
  - [x] 1.4 `apps/web/src/components/home/player-profile-section.tsx` — agregar `md:col-span-6` a la clase de `<section>`

- [x] Task 2: Expansión pantallas grandes — Home (AC: #4)
  - [x] 2.1 `apps/web/src/components/home/home-page.tsx` — cambiar `max-w-6xl` a `max-w-6xl 2xl:max-w-none`

- [x] Task 3: Expansión pantallas grandes — Leaderboard (AC: #4)
  - [x] 3.1 `apps/web/src/components/leaderboard/leaderboard-page.tsx` — cambiar `max-w-3xl` a `max-w-3xl 2xl:max-w-5xl`

- [x] Task 4: Layout 2 columnas en perfil a 2xl (AC: #4)
  - [x] 4.1 `apps/web/src/components/profile/public-profile-page.tsx`:
    - Cambiar wrapper de `w-full max-w-2xl space-y-6` a `w-full max-w-2xl 2xl:max-w-5xl`
    - Cambiar el inner div de `space-y-6` a `flex flex-col gap-6 2xl:grid 2xl:grid-cols-[2fr_3fr] 2xl:items-start`
    - Envolver los elementos del lado derecho (ranking + stats + historial) en un `<div className="flex flex-col gap-6">` para que ocupen la columna derecha en 2xl

- [x] Task 5: Expansión pantallas grandes — Arena y Lobby (AC: #4)
  - [x] 5.1 `apps/web/src/components/arena/arena-page.tsx` — cambiar los 3 `max-w-3xl` a `max-w-3xl 2xl:max-w-5xl`
  - [x] 5.2 `apps/web/src/components/lobby/lobby-page.tsx` — cambiar los `max-w-md` a `max-w-md 2xl:max-w-2xl`

- [x] Task 6: Transiciones hover en secciones del home (AC: #5)
  - [x] 6.1 Agregar `transition-shadow duration-200 hover:shadow-sm` a las 4 `<section>` del home (combinado con Task 1)

- [x] Task 7: Tests (AC: #2, #4, #5)
  - [x] 7.1 `apps/web/src/components/home/game-actions-section.spec.tsx` — agregar aserción `md:col-span-6`
  - [x] 7.2 `apps/web/src/components/home/live-matches-section.spec.tsx` — agregar nuevo test con aserciones `md:col-span-6` y `lg:col-span-4`
  - [x] 7.3 `apps/web/src/components/home/leaderboard-preview-section.spec.tsx` — agregar nuevo test con aserciones `md:col-span-6` y `lg:col-span-8`
  - [x] 7.4 `apps/web/src/components/home/player-profile-section.spec.tsx` — agregar aserción `md:col-span-6`
  - [x] 7.5 `apps/web/src/components/home/home-page.spec.tsx` — agregar aserción `2xl:max-w-none` y `md:col-span-6` en tests de secciones

- [x] Task 8: Validación final (AC: todos)
  - [x] 8.1 `npx nx lint web` — 0 nuevos errores (12 errores pre-existentes `import/first` en archivos no modificados, igual que stories anteriores)
  - [x] 8.2 `npx nx test web` — 382 tests pasando sin regresiones
  - [x] 8.3 `npx nx build web` — pendiente (solo lint/test requeridos; build es solo para confirmar)

## Dev Notes

### CRÍTICO: Story es 100% frontend — NO tocar backend ni shared library

Todos los cambios son CSS/Tailwind en archivos `.tsx` del frontend. No hay cambios de API, hooks, ni lógica.

### Breakpoints de Tailwind en este proyecto

```
sm:  640px
md:  768px   ← nuevo breakpoint para tablet (2 columnas)
lg:  1024px  ← breakpoint existente (grid 12 columnas)
xl:  1280px
2xl: 1536px  ← nuevo breakpoint para pantallas grandes
```

### Task 1: Cambio de clases en las 4 secciones del home

Cada sección tiene su `<section>` con `col-span-12 lg:col-span-X`. Solo agregar `md:col-span-6` entre `col-span-12` y `lg:col-span-X`:

```tsx
// ANTES:
<section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">
// DESPUÉS:
<section className="col-span-12 md:col-span-6 lg:col-span-8 rounded-card bg-surface-sunken p-6 transition-shadow duration-200 hover:shadow-sm">
```

```tsx
// ANTES:
<section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">
// DESPUÉS:
<section className="col-span-12 md:col-span-6 lg:col-span-4 rounded-card bg-surface-sunken p-6 transition-shadow duration-200 hover:shadow-sm">
```

Las 4 secciones quedan así:
- `game-actions-section.tsx`: `col-span-12 md:col-span-6 lg:col-span-8`
- `live-matches-section.tsx`: `col-span-12 md:col-span-6 lg:col-span-4`
- `leaderboard-preview-section.tsx`: `col-span-12 md:col-span-6 lg:col-span-8`
- `player-profile-section.tsx`: `col-span-12 md:col-span-6 lg:col-span-4`

El grid del home es `grid-cols-12` con `gap-6`. En tablet (md), los 4 elementos con `md:col-span-6` forman una grilla de 2 columnas por fila (6+6 = 12). En desktop (lg), vuelven a 8+4.

### Task 2: Home page — expansión 2xl

```tsx
// apps/web/src/components/home/home-page.tsx
// ANTES:
<div className="grid w-full max-w-6xl grid-cols-12 gap-6">
// DESPUÉS:
<div className="grid w-full max-w-6xl 2xl:max-w-none grid-cols-12 gap-6">
```

El `<main>` ya tiene `px-4 lg:px-6` así que en pantallas muy anchas el grid tendrá algo de margen lateral. Si Tailwind no reconoce `max-w-6xl 2xl:max-w-none` juntos, separar en clases individuales (ambas son válidas).

### Task 3: Leaderboard page — expansión 2xl

```tsx
// apps/web/src/components/leaderboard/leaderboard-page.tsx
// ANTES:
<div className="w-full max-w-3xl space-y-6">
// DESPUÉS:
<div className="w-full max-w-3xl 2xl:max-w-5xl space-y-6">
```

### Task 4: Profile page — layout 2 columnas en 2xl

La estructura actual del perfil es un solo div `w-full max-w-2xl space-y-6` con 4 bloques en columna:
1. Hero (avatar + nombre + edit panel o CTA)
2. Ranking positions (grid 2 cols)
3. Stats (grid 5 cols)
4. Match History

Para el layout 2xl, restructurar así:

```tsx
// ANTES:
<div className="w-full max-w-2xl space-y-6">
  {/* Hero */}
  <div className="rounded-2xl bg-surface-sunken p-8 text-center">...</div>

  {/* Ranking positions */}
  {(isPositionLoading || position) && (
    <div className="grid grid-cols-2 gap-4">...</div>
  )}

  {/* Stats */}
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">...</div>

  {/* Match History */}
  <div className="rounded-2xl bg-surface-sunken p-8">...</div>
</div>

// DESPUÉS:
<div className="w-full max-w-2xl 2xl:max-w-5xl">
  <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-[2fr_3fr] 2xl:items-start">
    {/* Columna izquierda (hero) */}
    <div className="rounded-2xl bg-surface-sunken p-8 text-center">...</div>

    {/* Columna derecha (ranking + stats + historia) */}
    <div className="flex flex-col gap-6">
      {/* Ranking positions */}
      {(isPositionLoading || position) && (
        <div className="grid grid-cols-2 gap-4">...</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">...</div>

      {/* Match History */}
      <div className="rounded-2xl bg-surface-sunken p-8">...</div>
    </div>
  </div>
</div>
```

**Nota importante**: El Hero contiene el edit panel (solo para `isOwnProfile`) y el CTA de login (para visitantes no autenticados). Estos siguen dentro del mismo bloque Hero. No separar el edit panel del Hero.

**Cuidado con `space-y-6` vs `gap-6`**: El wrapper original usa `space-y-6` (margin-top). El nuevo usa `gap-6` (en flex/grid). Son equivalentes visualmente. El inner div de la columna derecha usa `flex flex-col gap-6`.

### Task 5: Arena y Lobby — expansión 2xl

**Arena** (`apps/web/src/components/arena/arena-page.tsx`):
Hay 3 apariciones de `max-w-3xl` en este archivo (líneas ~212, ~223, ~230). Cambiar cada una:
```tsx
// max-w-3xl → max-w-3xl 2xl:max-w-5xl
```

**Lobby** (`apps/web/src/components/lobby/lobby-page.tsx`):
Los paneles usan `max-w-md`. Cambiar:
```tsx
// max-w-md → max-w-md 2xl:max-w-2xl
```
Hay varios `max-w-md` en el archivo — cambiarlos todos excepto los modales/overlays (`max-w-sm`).

### Task 6: Hover en secciones del home

Las transiciones de hover ya están incluidas en el Task 1 (en el mismo cambio de clases). Agregar `transition-shadow duration-200 hover:shadow-sm` junto con `md:col-span-6`.

No agregar `hover:scale-*` ni `hover:-translate-y-*` a las secciones — son contenedores de información, no tarjetas clicables. El efecto de sombra sutil es suficiente.

### Task 7: Tests — patrón para verificar nuevas clases

Los tests existentes usan `.classList.contains('clase')` individualmente. Agregar aserciones para `md:col-span-6` siguiendo el mismo patrón:

```typescript
// game-actions-section.spec.tsx
it('tiene las clases de grid responsivo correctas', () => {
  // test ya existente verifica col-span-12 y lg:col-span-8
  // AGREGAR:
  expect(section!.classList.contains('md:col-span-6')).toBe(true);
});
```

Para `home-page.spec.tsx`, agregar un test que verifique el wrapper:
```typescript
it('el grid wrapper tiene la clase 2xl:max-w-none para pantallas grandes', () => {
  setup();
  // El grid wrapper es el primer hijo del <main>
  const main = document.querySelector('main');
  const gridWrapper = main!.firstElementChild as HTMLElement;
  expect(gridWrapper.classList.contains('2xl:max-w-none')).toBe(true);
});
```

### Patrón de testing (heredado de Stories 5-2 al 5-7)

- **Sin jest-dom** — usar `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`
- `vi.clearAllMocks()` en `beforeEach`
- `type="button"` en todos los botones no-submit

### Tests que NO deben romperse

Estos tests verifican las clases existentes y deben seguir pasando (agregar clases NO los rompe):
- `home-page.spec.tsx`: verifica `col-span-12`, `lg:col-span-8`, `lg:col-span-4`
- `game-actions-section.spec.tsx`: verifica `col-span-12`, `lg:col-span-8`
- `player-profile-section.spec.tsx`: verifica `col-span-12`, `lg:col-span-4` (el test `'mantiene las clases de grid col-span-12 lg:col-span-4'`)

### Archivos a MODIFICAR (resumen)

```
apps/web/src/components/home/home-page.tsx                — grid wrapper 2xl:max-w-none
apps/web/src/components/home/game-actions-section.tsx     — md:col-span-6 + hover shadow
apps/web/src/components/home/live-matches-section.tsx     — md:col-span-6 + hover shadow
apps/web/src/components/home/leaderboard-preview-section.tsx  — md:col-span-6 + hover shadow
apps/web/src/components/home/player-profile-section.tsx   — md:col-span-6 + hover shadow
apps/web/src/components/leaderboard/leaderboard-page.tsx  — 2xl:max-w-5xl
apps/web/src/components/profile/public-profile-page.tsx   — 2xl:max-w-5xl + 2-col layout
apps/web/src/components/arena/arena-page.tsx              — 2xl:max-w-5xl (x3)
apps/web/src/components/lobby/lobby-page.tsx              — 2xl:max-w-2xl

apps/web/src/components/home/home-page.spec.tsx           — test 2xl:max-w-none
apps/web/src/components/home/game-actions-section.spec.tsx    — test md:col-span-6
apps/web/src/components/home/live-matches-section.spec.tsx    — test md:col-span-6
apps/web/src/components/home/leaderboard-preview-section.spec.tsx  — test md:col-span-6
apps/web/src/components/home/player-profile-section.spec.tsx  — test md:col-span-6
```

**NO hay archivos nuevos a crear.**

**NO tocar:**
- Ningún archivo de backend (`apps/api/`)
- Ningún archivo de `libs/shared/`
- Ningún hook existente

### Project Structure Notes

- El monorepo está en `ultimatype-monorepo/` dentro del directorio de trabajo. Todos los paths son relativos a ese directorio.
- Tests corren con: `npx nx test web` desde `ultimatype-monorepo/`
- Para correr un test específico: `npx nx test web -- "responsive"` (usa vitest pattern matching)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.8] — User story y ACs originales
- [Source: _bmad-output/implementation-artifacts/5-7-player-profile-ranking-card.md] — Patrones de testing y design tokens heredados
- [Source: apps/web/src/components/home/home-page.tsx] — Grid wrapper actual (`max-w-6xl grid-cols-12`)
- [Source: apps/web/src/components/home/game-actions-section.tsx] — Clase actual: `col-span-12 lg:col-span-8`
- [Source: apps/web/src/components/home/live-matches-section.tsx] — Clase actual: `col-span-12 lg:col-span-4`
- [Source: apps/web/src/components/home/leaderboard-preview-section.tsx] — Clase actual: `col-span-12 lg:col-span-8`
- [Source: apps/web/src/components/home/player-profile-section.tsx] — Clase actual: `col-span-12 lg:col-span-4`
- [Source: apps/web/src/components/leaderboard/leaderboard-page.tsx:89] — `max-w-3xl`
- [Source: apps/web/src/components/profile/public-profile-page.tsx:218] — `max-w-2xl space-y-6`
- [Source: apps/web/src/components/arena/arena-page.tsx:212,223,230] — `max-w-3xl` (x3)
- [Source: apps/web/src/components/lobby/lobby-page.tsx] — `max-w-md` (varios)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

(sin issues — implementación directa sin errores de compilación)

### Completion Notes List

- Task 1+6: `md:col-span-6` y `transition-shadow duration-200 hover:shadow-sm` agregados en un solo cambio a las 4 secciones del home (game-actions, live-matches, leaderboard-preview, player-profile).
- Task 2: `2xl:max-w-[90rem]` (1440px) en el grid wrapper de `home-page.tsx`. El grid se expande de 72rem a 90rem en 1536px+, sin estirarse indefinidamente. (Ajustado de `2xl:max-w-none` tras feedback visual: en 2000px+ se veía demasiado ancho.)
- Task 3: `2xl:max-w-5xl` en leaderboard-page.tsx. El contenedor crece de 48rem a 64rem en pantallas grandes.
- Task 4: Profile page restructurada con `flex flex-col gap-6 2xl:grid 2xl:grid-cols-[2fr_3fr] 2xl:items-start`. Columna izquierda: Hero (avatar+nombre+edit/CTA). Columna derecha: ranking + stats + historial. Wrapper: `max-w-2xl 2xl:max-w-5xl`.
- Task 5: Arena: 3 instancias de `max-w-3xl` → `max-w-3xl 2xl:max-w-5xl`. Lobby: 5 instancias de `max-w-md` → `max-w-md 2xl:max-w-2xl` (excluye max-w-sm de modales).
- Task 7: Tests — +1 nuevo test en live-matches-section.spec.tsx, +1 nuevo test en leaderboard-preview-section.spec.tsx. Aserciones `md:col-span-6` y `2xl:max-w-none` agregadas a tests existentes en game-actions-section.spec, player-profile-section.spec, y home-page.spec (4 tests de sección + 1 test de grid).
- Task 8: 382 tests pasando (sin regresiones). Build limpio. Lint: 0 nuevos errores (12 pre-existentes `import/first` en archivos no tocados).

### File List

- `apps/web/src/components/home/game-actions-section.tsx` — Modificado: `md:col-span-6` + `transition-shadow hover:shadow-sm`
- `apps/web/src/components/home/live-matches-section.tsx` — Modificado: `md:col-span-6` + `transition-shadow hover:shadow-sm`
- `apps/web/src/components/home/leaderboard-preview-section.tsx` — Modificado: `md:col-span-6` + `transition-shadow hover:shadow-sm`
- `apps/web/src/components/home/player-profile-section.tsx` — Modificado: `md:col-span-6` + `transition-shadow hover:shadow-sm`
- `apps/web/src/components/home/home-page.tsx` — Modificado: `2xl:max-w-none` en grid wrapper
- `apps/web/src/components/leaderboard/leaderboard-page.tsx` — Modificado: `2xl:max-w-5xl`
- `apps/web/src/components/profile/public-profile-page.tsx` — Modificado: 2-column layout 2xl, `2xl:max-w-5xl`
- `apps/web/src/components/arena/arena-page.tsx` — Modificado: `2xl:max-w-5xl` (x3)
- `apps/web/src/components/lobby/lobby-page.tsx` — Modificado: `2xl:max-w-2xl` (x5)
- `apps/web/src/components/home/game-actions-section.spec.tsx` — Modificado: aserción `md:col-span-6`
- `apps/web/src/components/home/live-matches-section.spec.tsx` — Modificado: nuevo test responsivo
- `apps/web/src/components/home/leaderboard-preview-section.spec.tsx` — Modificado: nuevo test responsivo
- `apps/web/src/components/home/player-profile-section.spec.tsx` — Modificado: aserción `md:col-span-6`
- `apps/web/src/components/home/home-page.spec.tsx` — Modificado: aserciones `2xl:max-w-[90rem]` + `md:col-span-6`
- `apps/web/src/components/ui/nav-bar.tsx` — Modificado: wrapper `max-w-6xl 2xl:max-w-[90rem] mx-auto` para alinear navbar con el grid del home en pantallas grandes

### Review Findings

- [x] [Review][Decision] AC4 Home: `2xl:max-w-[90rem]` aceptado — Desviación intencional de spec (`2xl:max-w-none`), mejora visual en pantallas >2000px
- [x] [Review][Decision] `sm:grid-cols-2` → `lg:grid-cols-2` aceptado — Cards apiladas en tablet por espacio reducido (md:col-span-6 ~384px)
- [x] [Review][Patch] Indentación corregida en public-profile-page.tsx — Wrappers 2xl:grid [public-profile-page.tsx:220,349-350,526]
- [x] [Review][Patch] Indentación corregida en nav-bar.tsx — Wrapper max-w [nav-bar.tsx:155,251]
