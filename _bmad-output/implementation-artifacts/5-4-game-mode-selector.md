# Story 5.4: GameModeSelector (Main Actions)

Status: done

## Story

As a user,
I want to see the available game actions prominently displayed as interactive cards,
so that I can start playing quickly with a clear, visually engaging interface.

## Acceptance Criteria

1. **AC1 — Dos Action Cards**: `GameActionsSection` renderiza dos tarjetas de acción con ícono Material Symbols, título, subtítulo descriptivo y flecha direccional:
   - Card 1: "Crear partida" — ícono `keyboard`, subtítulo "Sé el anfitrión de una nueva sala"
   - Card 2: "Unirse a una partida" — ícono `login`, subtítulo + input de código + botón "Unirse"

2. **AC2 — Material Symbols**: El font Material Symbols Outlined se carga en `apps/web/index.html`. Íconos con `<span className="material-symbols-outlined">icon_name</span>`.

3. **AC3 — Hover Animations**: Cada tarjeta tiene CSS transitions en hover: scale (`hover:scale-[1.02]`) y shadow aumentado. Duration: 200ms.

4. **AC4 — Flechas Direccionales**: Cada tarjeta muestra un ícono `arrow_forward` de Material Symbols a la derecha. La flecha cambia a `text-primary` en hover via `group-hover:text-primary`.

5. **AC5 — Flujo Autenticado**: 
   - Card "Crear partida": llama `POST /rooms` via `apiClient` y navega a `/room/:code` (comportamiento de `CreateRoomButton` preservado).
   - Card "Unirse a una partida": muestra `JoinRoomInput` con validación regex y navegación.

6. **AC6 — Flujo No Autenticado**: 
   - Click en "Crear partida" guarda `localStorage.setItem('returnAfterLogin', window.location.pathname)` y abre `LoginModal`.
   - La tarjeta NO está dimmed — se ve igual que para usuario autenticado.
   - "Unirse a una partida" funciona sin autenticación (comportamiento existente preservado).

7. **AC7 — Header + Subtítulo**: La sección conserva el header `label-md` "MODO DE JUEGO" y agrega subtítulo: `<p className="mt-1 text-sm text-text-muted font-sans">Elige cómo quieres competir hoy</p>`.

8. **AC8 — Estado Loading**: Durante `isFetchingProfile`, la card "Crear partida" muestra opacidad reducida (`opacity-50 pointer-events-none`).

9. **AC9 — Design System Compliance**: Cards usan `bg-surface-container-low` con `rounded-card`. Sin bordes 1px. Contenedor exterior mantiene `bg-surface-sunken col-span-12 lg:col-span-8`.

## Tasks / Subtasks

- [x] Task 1: Agregar Material Symbols a index.html (AC: #2)
  - [x] 1.1 Agregar `<link>` para Material Symbols Outlined en `apps/web/index.html` después del `<link>` de Google Fonts existente
  - [x] 1.2 URL exacta: `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0`

- [x] Task 2: Rediseñar `GameActionsSection` con layout de dos tarjetas (AC: #1, #3, #4, #5, #6, #7, #8, #9)
  - [x] 2.1 Actualizar header: conservar h2 `label-md` "MODO DE JUEGO", agregar `<p>` subtítulo "Elige cómo quieres competir hoy" con `mt-1 text-sm text-text-muted font-sans`
  - [x] 2.2 Crear grid de dos cards: `<div className="mt-4 grid gap-4 sm:grid-cols-2">`
  - [x] 2.3 Implementar Card 1 — "Crear partida":
    - Contenedor: `<button type="button">` con clases `group flex w-full items-center gap-4 rounded-card bg-surface-container-low p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-surface-container hover:shadow-md` + `opacity-50 pointer-events-none` cuando `isFetchingProfile`
    - Ícono izquierda: `<span className="material-symbols-outlined text-3xl text-primary">keyboard</span>`
    - Texto: `<div className="flex-1"><p className="font-semibold text-text-main font-sans">Crear partida</p><p className="text-sm text-text-muted font-sans">Sé el anfitrión de una nueva sala</p></div>`
    - Flecha: `<span className="material-symbols-outlined text-text-muted transition-colors group-hover:text-primary">arrow_forward</span>`
    - onClick autenticado: llama `handleCreateRoom()` (lógica de `CreateRoomButton` inlinada)
    - onClick no autenticado: guarda `returnAfterLogin`, abre `LoginModal`
  - [x] 2.4 Implementar Card 2 — "Unirse a una partida":
    - Contenedor: `<div className="group rounded-card bg-surface-container-low p-5 transition-all duration-200 hover:shadow-md">`
    - Header row: `<div className="flex items-center gap-4 mb-3">` con ícono `login` + `<p className="flex-1 font-semibold text-text-main font-sans">Unirse a una partida</p>` + flecha `arrow_forward`
    - Body: `<JoinRoomInput />` embebido debajo del header row
  - [x] 2.5 Refactorizar `JoinRoomInput` con estilos del Design System:
    - Input: `rounded-full bg-surface-raised px-4 py-2 text-sm uppercase tracking-widest font-mono focus:outline-none`
    - Botón "Unirse": `rounded-full bg-primary px-5 py-2 text-sm font-semibold text-surface-base font-sans`
    - Mantener toda la lógica existente (regex, uppercase, slice(0,6), navigate)
  - [x] 2.6 Inlinear la lógica de `handleCreateRoom` en `GameActionsSection`:
    - `const [isCreating, setIsCreating] = useState(false)` para estado de creación
    - Llamar `apiClient<CreateRoomResponse>('/rooms', { method: 'POST' })` directamente
    - Importar `CreateRoomResponse` desde `@ultimatype-monorepo/shared` y `apiClient` desde `../../lib/api-client`
    - Ya NO importar `CreateRoomButton` desde `'../lobby/create-room-button'`
  - [x] 2.7 Remover el layout plano antiguo (flex centrado con CreateRoomButton + JoinRoomInput separados)

- [x] Task 3: Actualizar/crear tests (AC: todos)
  - [x] 3.1 Crear `apps/web/src/components/home/game-actions-section.spec.tsx` con tests del componente rediseñado:
    - Setup: mockear `useAuth`, `react-router-dom` (useNavigate, useLocation), `../../lib/api-client`, `../ui/login-modal`
    - Test: las dos cards están presentes con textos "Crear partida" y "Unirse a una partida"
    - Test: subtítulo "Elige cómo quieres competir hoy" presente
    - Test: íconos Material Symbols presentes (`.material-symbols-outlined` en el DOM)
    - Test: cards tienen clases de hover (`hover:scale-[1.02]` o equivalente)
    - Test autenticado: click en "Crear partida" llama `apiClient` con `POST /rooms` y navega a `/room/CODE`
    - Test autenticado: `JoinRoomInput` navega a `/room/ABC234` en código válido
    - Test no autenticado: click en "Crear partida" guarda `localStorage.returnAfterLogin` y muestra `LoginModal`
    - Test `isFetchingProfile`: card "Crear partida" tiene `opacity-50`
    - Test: error de API en create room quita el estado de loading
  - [x] 3.2 Actualizar `apps/web/src/components/home/home-page.spec.tsx`:
    - Remover mock de `'../lobby/create-room-button'` (ya no se importa)
    - Reemplazar test "renders CreateRoomButton" por test que verifica que la card "Crear partida" existe
    - Reemplazar test "renders dimmed 'Crear Partida' button" (clase `bg-primary/40`) por verificación de que el click abre LoginModal
    - Mantener tests de grid layout, design system y secciones placeholder sin cambios

- [x] Task 4: Validación Final (AC: todos)
  - [x] 4.1 Run `npx nx lint web` — cero nuevos errores (12 errores pre-existentes en Epic 4 spec files)
  - [x] 4.2 Run `npx nx test web` — 301 tests pasando (21 archivos, sin regresiones, +23 tests nuevos)
  - [x] 4.3 Run `npx nx build web` — build limpio (3.27s)

## Dev Notes

### Qué reemplaza esta story

`GameActionsSection` fue creado en Story 5-3 con layout plano: flex centrado con `CreateRoomButton` (o dimmed) + `JoinRoomInput`. Story 5-4 **reemplaza el layout interno** con dos tarjetas prominentes. El contenedor exterior NO cambia:

```tsx
// Este JSX exterior NO CAMBIA — home-page.spec.tsx lo verifica
<section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">
  {/* TODO: Contenido interno redesigned */}
</section>
```

### Material Symbols — Carga en index.html

Agregar DESPUÉS del `<link>` de Google Fonts (línea ~21 en `apps/web/index.html`):

```html
<!-- Material Symbols (iconos) -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
```

Uso en TSX:
```tsx
<span className="material-symbols-outlined">keyboard</span>
```

Íconos a usar:
- Card "Crear partida": `keyboard`
- Card "Unirse": `login`
- Flecha direccional: `arrow_forward`

Material Symbols usa un font ligature — el texto dentro del `<span>` es el nombre del ícono. En tests (JSDOM), el font no carga, pero el elemento y su texto son verificables.

### Patrón de Card — Implementación de referencia

```tsx
// Card 1: Crear partida (autenticado)
<button
  type="button"
  onClick={handleCreateRoom}
  disabled={isCreating}
  className="group flex w-full items-center gap-4 rounded-card bg-surface-container-low p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-surface-container hover:shadow-md disabled:opacity-50 disabled:pointer-events-none"
>
  <span className="material-symbols-outlined text-3xl text-primary">keyboard</span>
  <div className="flex-1">
    <p className="font-semibold text-text-main font-sans">Crear partida</p>
    <p className="text-sm text-text-muted font-sans">Sé el anfitrión de una nueva sala</p>
  </div>
  <span className="material-symbols-outlined text-text-muted transition-colors group-hover:text-primary">
    arrow_forward
  </span>
</button>
```

Para el estado `isFetchingProfile`, agregar condicionalmente `opacity-50 pointer-events-none` al className del botón (no usar `disabled` porque eso cambia la semántica).

### Lógica de Create Room inlinada

En Story 5-3, `CreateRoomButton` era un componente separado con inline styles. En Story 5-4 esta lógica va directo en `GameActionsSection`:

```tsx
import { CreateRoomResponse } from '@ultimatype-monorepo/shared';
import { apiClient } from '../../lib/api-client';

// Dentro de GameActionsSection:
const navigate = useNavigate();
const [isCreating, setIsCreating] = useState(false);

const handleCreateRoom = async () => {
  if (!isAuthenticated) {
    localStorage.setItem('returnAfterLogin', window.location.pathname);
    setShowLogin(true);
    return;
  }
  if (isCreating) return;
  setIsCreating(true);
  try {
    const { code } = await apiClient<CreateRoomResponse>('/rooms', { method: 'POST' });
    navigate(`/room/${code}`);
  } catch {
    setIsCreating(false);
  }
};
```

`CreateRoomButton` (`lobby/create-room-button.tsx`) NO se elimina — existe para posible uso futuro en el lobby. Simplemente dejamos de importarlo desde `GameActionsSection`.

### Actualización de home-page.spec.tsx

Los tests que deben cambiar en `home-page.spec.tsx`:

**Remover mock:**
```tsx
// ELIMINAR esto:
vi.mock('../lobby/create-room-button', () => ({
  CreateRoomButton: () => (
    <button data-testid="create-room-button">Crear Partida</button>
  ),
}));
```

**Reemplazar tests afectados:**
```tsx
// EN LUGAR DE:
it('renders CreateRoomButton', () => {
  setup({ isAuthenticated: true, user: authenticatedUser });
  expect(screen.getByTestId('create-room-button')).toBeTruthy();
});

// USAR:
it('renders "Crear partida" card', () => {
  setup({ isAuthenticated: true, user: authenticatedUser });
  expect(screen.getByText('Crear partida')).toBeTruthy();
});

// EN LUGAR DE:
it('renders dimmed "Crear Partida" button', () => {
  setup();
  const button = screen.getByText('Crear Partida');
  expect(button.classList.contains('bg-primary/40')).toBe(true);
});

// USAR:
it('renders "Crear partida" card for unauthenticated user', () => {
  setup();
  expect(screen.getByText('Crear partida')).toBeTruthy();
});
```

Los demás tests de `home-page.spec.tsx` NO deberían verse afectados:
- Grid layout tests (verifican contenedor exterior de la sección)
- Design system tests (`rounded-card`, `bg-surface-sunken` en el `<section>`)
- Helmet title
- JoinRoomInput tests (misma lógica, solo cambia styling del input)
- Placeholder sections

**ATENCIÓN**: `JoinRoomInput` sigue existiendo como componente privado en `game-actions-section.tsx`. Los tests de `home-page.spec.tsx` que verifican `getByLabelText('Código de partida para unirse')` y el comportamiento de navigate siguen siendo válidos — solo cambia el styling del input.

### Testing en JSDOM — Material Symbols

Material Symbols usa un webfont que no carga en JSDOM. Para tests:
- NO verificar que el ícono "se ve" visualmente
- SÍ verificar que existe `.material-symbols-outlined` en el DOM con el texto correcto
- Ejemplo:
```tsx
const icons = container.querySelectorAll('.material-symbols-outlined');
expect(icons.length).toBeGreaterThan(0);
```

### mock de apiClient en tests de game-actions-section.spec.tsx

```tsx
vi.mock('../../lib/api-client', () => ({
  apiClient: vi.fn(),
}));

// En el test:
const { apiClient } = await import('../../lib/api-client');
vi.mocked(apiClient).mockResolvedValueOnce({ code: 'ABC234' });
```

### mock de localStorage en tests

```tsx
// En beforeEach:
vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

// En el test de unauthenticated:
fireEvent.click(screen.getByText('Crear partida'));
expect(localStorage.setItem).toHaveBeenCalledWith('returnAfterLogin', expect.any(String));
expect(screen.getByTestId('login-modal')).toBeTruthy();
```

### Design System Tokens Disponibles (Story 5-1)

**Colores**: `bg-surface-base`, `bg-surface-sunken`, `bg-surface-container-low`, `bg-surface-container`, `bg-surface-raised`, `text-text-main`, `text-text-muted`, `text-primary`

**Tipografía**: `font-sans` (Space Grotesk), `font-mono` (IBM Plex Mono)

**Border-radius**: `rounded-card` (2rem), `rounded-full` (9999px)

**Transiciones**: `transition-all duration-200` para hover effects suaves

**No-Line Rule**: Sin `border`, `border-b` ni separadores 1px.

### Patrones de testing heredados (Stories 5-2 y 5-3)

- Tests en `*.spec.tsx` co-localizados con los componentes
- Vitest + React Testing Library — **sin jest-dom**
- Assertions: `.toBeTruthy()`, `.toBeNull()`, `.classList.contains()`, `.className.includes()`
- `setup()` helper retorna el render + permite overrides de `useAuth`
- Mock de react-router-dom con `useNavigate` y `Link`
- `type="button"` en todos los botones que no son submit
- `aria-label` en elementos interactivos
- `vi.clearAllMocks()` en `beforeEach`

### Project Structure Notes

**Archivo a CREAR:**
- `apps/web/src/components/home/game-actions-section.spec.tsx` — tests del componente rediseñado

**Archivos a MODIFICAR:**
- `apps/web/index.html` — agregar Material Symbols link
- `apps/web/src/components/home/game-actions-section.tsx` — rediseño completo del interior
- `apps/web/src/components/home/home-page.spec.tsx` — actualizar mocks y tests afectados

**Archivos que NO cambian:**
- `apps/web/src/components/home/home-page.tsx` — grid/contenedor exterior sin cambios
- `apps/web/src/components/lobby/create-room-button.tsx` — preservado (no eliminar)
- `apps/web/src/components/ui/login-modal.tsx` — sin cambios
- Secciones placeholder (live-matches, leaderboard-preview, player-profile)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.4] — User story y ACs originales
- [Source: _bmad-output/implementation-artifacts/5-3-homepage-layout-extraction.md] — Story previa, patterns de contenedor y tests
- [Source: apps/web/src/components/home/game-actions-section.tsx] — Implementación actual a rediseñar
- [Source: apps/web/src/components/lobby/create-room-button.tsx] — Lógica de create room a replicate inline
- [Source: apps/web/src/components/home/home-page.spec.tsx] — Tests a actualizar
- [Source: apps/web/index.html] — Donde agregar Material Symbols link
- [Source: Bosquejos/Pantalla Principal/DESIGN Pantalla principal.md] — Design System "Kinetic Monospace", card patterns

### Review Findings

- [x] [Review][Patch] Guard `isFetchingProfile` en `handleCreateRoom` — `if (isFetchingProfile) return;` + `disabled={isCreating || isFetchingProfile}` [game-actions-section.tsx:65,98]
- [x] [Review][Patch] `aria-hidden="true"` en spans de Material Symbols — 4 spans con `aria-hidden="true"` [game-actions-section.tsx:101,113,121,127]
- [x] [Review][Patch] AC3 — Card 2 `hover:scale-[1.02]` agregado [game-actions-section.tsx:119]
- [x] [Review][Patch] AC4 — Card 2 arrow `transition-colors group-hover:text-primary` agregado [game-actions-section.tsx:127]
- [x] [Review][Defer] Error silencioso en `handleCreateRoom` — catch solo resetea `isCreating` sin feedback al usuario. Patrón pre-existente del `CreateRoomButton` original — deferred, pre-existing
- [x] [Review][Patch] Tests agregados: guard `isFetchingProfile` click + double-click guard [game-actions-section.spec.tsx]
- [x] [Review][Defer] Error silencioso en `handleCreateRoom` — catch sin feedback al usuario. Patrón pre-existente — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Test "card NO está dimmed" fallaba porque `disabled:opacity-50` contiene la substring "opacity-50". Corregido usando `classList.contains('opacity-50')` en lugar de `className.includes()`.

### Completion Notes List

- Task 1: Material Symbols Outlined agregado a `apps/web/index.html` después del Google Fonts `<link>`.
- Task 2: `GameActionsSection` completamente rediseñado. Layout interno reemplazado con grid `sm:grid-cols-2` de dos tarjetas. Header "MODO DE JUEGO" conservado, subtítulo "Elige cómo quieres competir hoy" agregado. Card 1 ("Crear partida"): `<button>` con `hover:scale-[1.02] hover:shadow-md`, ícono `keyboard`, flecha `arrow_forward`, lógica `apiClient<CreateRoomResponse>('/rooms', {method:'POST'})` inlinada. Estado `isFetchingProfile` → `opacity-50 pointer-events-none`. Card 2 ("Unirse"): `<div>` con header row + `JoinRoomInput` con estilos `rounded-full`. Usuario no autenticado: `localStorage.setItem('returnAfterLogin', ...)` + `LoginModal`. `CreateRoomButton` ya no importado (preservado en `lobby/create-room-button.tsx`).
- Task 3: Creado `game-actions-section.spec.tsx` con 23 tests cubriendo: layout/estructura, usuario autenticado (create room, loading, error, no modal), usuario no autenticado (localStorage, modal, no dimmed), isFetchingProfile, JoinRoomInput completo (navigate, validación, Enter, uppercase, pill styles). Actualizado `home-page.spec.tsx`: removido mock de `CreateRoomButton`, agregado mock de `apiClient`, reemplazados tests de "dimmed button" y "renders CreateRoomButton", agregado stub de `localStorage`.
- Task 4: 301 tests pasando (sin regresiones). Build limpio. 0 nuevos errores de lint.

### File List

- `apps/web/index.html` — Modificado: agregado link Material Symbols Outlined
- `apps/web/src/components/home/game-actions-section.tsx` — Modificado: rediseño completo con dos tarjetas, lógica create room inlinada, JoinRoomInput con pill styles
- `apps/web/src/components/home/game-actions-section.spec.tsx` — Creado: 23 tests del componente rediseñado
- `apps/web/src/components/home/home-page.spec.tsx` — Modificado: mock de CreateRoomButton removido, mock apiClient agregado, tests actualizados, localStorage stub agregado
