# Story 5.3: HomePage Layout & Extraction

Status: done

## Story

As a developer,
I want to extract the home page from `app.tsx` into a dedicated `HomePage` component with a rich layout,
so that the codebase is maintainable and the home page can host multiple sections.

## Acceptance Criteria

1. **AC1 — Extraction**: The inline home page code in `app.tsx` (lines 91-150) is extracted into a new `HomePage` component. `app.tsx` imports and renders `<HomePage />` at the `*` catch-all route. The `JoinRoomInput` component also moves out of `app.tsx`.

2. **AC2 — 12-Column Grid**: The `HomePage` uses a CSS grid layout (`grid grid-cols-12`) with `gap-6` spacing. The grid container is centered with a max-width (`max-w-6xl`) and responsive padding.

3. **AC3 — Three Sections**: The layout has 3 main sections, each rendered as a separate, independently importable component:
   - **Game Actions** (top) — `GameActionsSection`: contains the existing Create Room + Join Room functionality. Spans `col-span-12 lg:col-span-8`.
   - **Live Matches** (middle) — `LiveMatchesSection`: placeholder shell for Story 5-5. Spans `col-span-12 lg:col-span-4` (sits next to Game Actions on desktop, below on mobile).
   - **Leaderboard Preview** (bottom-left) — `LeaderboardPreviewSection`: placeholder shell for Story 5-6. Spans `col-span-12 lg:col-span-8`.
   - **Player Profile Card** (bottom-right) — `PlayerProfileSection`: placeholder shell for Story 5-7. Spans `col-span-12 lg:col-span-4`.

4. **AC4 — Auth States**: The page works for both authenticated and unauthenticated users. Authenticated users see the full `CreateRoomButton`; unauthenticated users see the dimmed "Crear Partida" button with login prompt (existing behavior preserved). The greeting ("Hola, {name}!") is removed — the future PlayerProfileSection (Story 5-7) will handle personalization.

5. **AC5 — Responsive**: On mobile (`< 1024px` / below `lg:` breakpoint), all sections stack vertically as full-width cards (`col-span-12`). On desktop (`>= 1024px`), the 2-column grid activates (8+4 split).

6. **AC6 — Design System Alignment**: Section shells use design tokens from Story 5-1: `bg-surface-sunken` for section containers, `rounded-card` (2rem) for corner radius, `font-sans` (Space Grotesk). No 1px borders — use tonal surface shift. Section headers use `label-md` typography (0.75rem, 700 weight, uppercase, tracking-wide).

7. **AC7 — Logout Removed**: The standalone "Cerrar sesión" button is removed from the home page. Logout is accessible from the user's profile page (`/u/{slug}`). The `logout` function is no longer called from `app.tsx`'s home route.

8. **AC8 — Helmet Preserved**: The `<Helmet>` tag with `<title>UltimaType — Competencias de mecanografía en tiempo real</title>` is preserved in the new `HomePage` component.

9. **AC9 — LoginModal Preserved**: The `LoginModal` for unauthenticated "Crear Partida" click remains functional. The state (`showLogin` / `setShowLogin`) moves from `app.tsx` to `HomePage` (or `GameActionsSection`).

## Tasks / Subtasks

- [x] Task 1: Create `HomePage` component with grid layout (AC: #1, #2, #5, #8)
  - [x] 1.1 Create directory `apps/web/src/components/home/`
  - [x] 1.2 Create `apps/web/src/components/home/home-page.tsx` with the 12-column grid layout
  - [x] 1.3 Grid structure: `<div className="grid grid-cols-12 gap-6">` inside a centered container with `max-w-6xl w-full px-4 lg:px-6 pt-20 pb-10`
  - [x] 1.4 Import and render the 4 section components in the grid
  - [x] 1.5 Preserve the `<Helmet>` title tag

- [x] Task 2: Extract `GameActionsSection` with existing functionality (AC: #3, #4, #9)
  - [x] 2.1 Create `apps/web/src/components/home/game-actions-section.tsx`
  - [x] 2.2 Move `JoinRoomInput` into this file (or as a private component within it) — it was an inline component in `app.tsx`
  - [x] 2.3 Move the Create Room / Login prompt logic (authenticated: `<CreateRoomButton />`, unauthenticated: dimmed button + tooltip + `LoginModal`)
  - [x] 2.4 Section container: `<section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">`
  - [x] 2.5 Add section header: `<h2>` with `label-md` style (`text-xs font-bold uppercase tracking-widest text-text-muted`)  — text: "MODO DE JUEGO"
  - [x] 2.6 Remove greeting ("Hola, {name}!") and logout button — these are no longer on the home page

- [x] Task 3: Create placeholder section shells (AC: #3, #6)
  - [x] 3.1 Create `apps/web/src/components/home/live-matches-section.tsx` — `LiveMatchesSection` placeholder: section container with header "PARTIDAS EN VIVO" + empty state text "Próximamente" or similar. `col-span-12 lg:col-span-4`
  - [x] 3.2 Create `apps/web/src/components/home/leaderboard-preview-section.tsx` — `LeaderboardPreviewSection` placeholder: section container with header "CLASIFICACIÓN GLOBAL" + empty state. `col-span-12 lg:col-span-8`
  - [x] 3.3 Create `apps/web/src/components/home/player-profile-section.tsx` — `PlayerProfileSection` placeholder: section container with header "TU PERFIL" + empty state. `col-span-12 lg:col-span-4`
  - [x] 3.4 All placeholders use the same container pattern: `rounded-card bg-surface-sunken p-6`, `label-md` header, `text-text-muted` body text

- [x] Task 4: Update `app.tsx` routing (AC: #1, #7)
  - [x] 4.1 Import `HomePage` from `../components/home/home-page`
  - [x] 4.2 Replace the inline `<Route path="*" element={...}>` with `<Route path="*" element={<HomePage />} />`
  - [x] 4.3 Remove `JoinRoomInput` function from `app.tsx`
  - [x] 4.4 Remove `showLogin` state from `App` component (moved to HomePage/GameActionsSection)
  - [x] 4.5 Remove unused imports from `app.tsx`: `Logo`, `CreateRoomButton`, `LoginModal`, `useState` (if no longer used), `Helmet` (if no longer used)
  - [x] 4.6 Keep `ProfileRedirect` in `app.tsx` (it's route-specific, not home-page logic)

- [x] Task 5: Write tests (AC: all)
  - [x] 5.1 Create `apps/web/src/components/home/home-page.spec.tsx`
  - [x] 5.2 Test: HomePage renders the 4-section grid structure (GameActions, LiveMatches, LeaderboardPreview, PlayerProfile sections present in DOM)
  - [x] 5.3 Test: Authenticated user sees CreateRoomButton and JoinRoomInput
  - [x] 5.4 Test: Unauthenticated user sees dimmed "Crear Partida" button and JoinRoomInput
  - [x] 5.5 Test: JoinRoomInput validates 6-char code format, navigates on valid code
  - [x] 5.6 Test: JoinRoomInput shows error on invalid code
  - [x] 5.7 Test: LoginModal opens when unauthenticated user clicks "Crear Partida"
  - [x] 5.8 Test: Grid has correct responsive classes (`grid-cols-12`, `col-span-12 lg:col-span-8`, etc.)
  - [x] 5.9 Test: No greeting message or logout button present
  - [x] 5.10 Test: Helmet title is set correctly

- [x] Task 6: Final Validation
  - [x] 6.1 Run `npx nx lint web` — zero new errors (12 pre-existing in other spec files)
  - [x] 6.2 Run `npx nx test web` — 278 tests passing across 20 files (zero regressions, 24 new tests)
  - [x] 6.3 Run `npx nx build web` — builds cleanly
  - [x] 6.4 Visually verify: desktop grid (8+4 columns) and mobile stack layout

## Dev Notes

### Architecture & Tech Stack

- **React 19 + React Router v6** — `useAuth()` for auth state, `useNavigate()` for routing, `<Link>` for navigation.
- **Tailwind CSS v4** — all styling via utility classes. Theme tokens defined in `@theme` block in `styles.css`. No `tailwind.config.ts`.
- **Responsive breakpoint for grid**: `lg:` = 64rem (1024px). Mobile-first: default = stacked, `lg:` = 2-column grid.
- **No external icon library** — all icons are inline SVGs or emoji.

### Current Home Page Code to Extract (`app.tsx:32-156`)

The current home page is entirely inline in `app.tsx`:

1. **`JoinRoomInput` component** (lines 34-72): Stateful input with regex validation (`/^[A-Z2-9]{6}$/`), navigates to `/room/{code}`.
2. **Home page JSX** (lines 91-150): Centered flex layout with Logo, auth-conditional content (greeting, CreateRoomButton or dimmed button, JoinRoomInput, logout).
3. **`LoginModal` state** (line 78): `showLogin` / `setShowLogin` for unauthenticated create-room flow.

**What to keep in `app.tsx` after extraction:**
- `ProfileRedirect` component (lines 15-30) — route-specific utility
- `ROOM_CODE_REGEX` constant — move to `GameActionsSection` (it's only used by `JoinRoomInput`)
- Routes, NavBar conditional rendering, `useAuth` for callback detection

### Grid Layout Specification

Based on the design bosquejo (`Bosquejos/Pantalla Principal/screen Pantalla principal.png`):

```
Desktop (>= 1024px / lg:):
┌──────────────────────────────────┬─────────────────┐
│  Game Actions (col-span-8)       │  Live Matches    │
│  "MODO DE JUEGO"                 │  (col-span-4)    │
│  [Crear partida] [Unirse]        │  "PARTIDAS EN    │
│                                  │   VIVO"          │
├──────────────────────────────────┼─────────────────┤
│  Leaderboard Preview (col-span-8)│  Player Profile  │
│  "CLASIFICACIÓN GLOBAL"          │  (col-span-4)    │
│  Top 5 table                     │  "TU PERFIL"     │
└──────────────────────────────────┴─────────────────┘

Mobile (< 1024px):
┌──────────────────────────────────┐
│  Game Actions (col-span-12)      │
├──────────────────────────────────┤
│  Live Matches (col-span-12)      │
├──────────────────────────────────┤
│  Leaderboard Preview (col-span-12)│
├──────────────────────────────────┤
│  Player Profile (col-span-12)    │
└──────────────────────────────────┘
```

### Section Shell Pattern

All placeholder sections follow the same pattern:

```tsx
export function LiveMatchesSection() {
  return (
    <section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
        Partidas en Vivo
      </h2>
      <p className="text-sm text-text-muted">Próximamente</p>
    </section>
  );
}
```

Key points:
- `rounded-card` = 2rem border radius (from Story 5-1 tokens)
- `bg-surface-sunken` for tonal separation from `bg-surface-base` page background
- No borders (No-Line Rule)
- `label-md` style for headers: `text-xs font-bold uppercase tracking-widest text-text-muted`

### Existing Components (DO NOT recreate)

| Component | File | Reuse |
|-----------|------|-------|
| `CreateRoomButton` | `components/lobby/create-room-button.tsx` | Reuse as-is — handles room creation + navigation |
| `LoginModal` | `components/ui/login-modal.tsx` | Reuse as-is — Google/GitHub OAuth modal |
| `useAuth` | `hooks/use-auth.ts` | Reuse — returns `{ user, isAuthenticated, isFetchingProfile, logout }` |
| `Logo` | `components/ui/logo.tsx` | NOT used in HomePage anymore — NavBar already shows the logo |
| `NavBar` | `components/ui/nav-bar.tsx` | Already rendered in `app.tsx` above routes — do not render again in HomePage |

### Design System Tokens Available (from Story 5-1)

**Colors**: `bg-surface-base`, `bg-surface-sunken`, `bg-surface-raised`, `bg-surface-container`, `bg-surface-container-low`, `text-text-main`, `text-text-muted`, `text-primary`, `bg-primary`, `bg-primary/40`

**Typography**: `font-sans` (Space Grotesk), `font-mono` (IBM Plex Mono), `text-xs`, `text-sm`, `text-lg`, `font-bold`, `font-semibold`

**Border radius**: `rounded-card` (2rem), `rounded-card-lg` (2.5rem), `rounded-full` (9999px), `rounded-lg`

**No-Line Rule**: Do NOT use `border-b` or any 1px borders. Use tonal surface shift (`bg-surface-sunken` on `bg-surface-base`) for visual separation.

### Testing Patterns (from Stories 5-1 and 5-2)

- Tests are `*.spec.tsx` files co-located with components (inside `components/home/`)
- Use Vitest + React Testing Library (`@testing-library/react`)
- **NO jest-dom**: Project uses Vitest with Chai — use `.toBeTruthy()`, `.toBeNull()`, `.className.includes()`, `.classList.contains()` instead of `toHaveClass`, `toBeInTheDocument`
- Mock `useAuth` via `vi.mock('../../hooks/use-auth')`
- Mock React Router: `vi.mock('react-router-dom', ...)` with `useNavigate`, `useLocation`
- Wrap rendered components with `MemoryRouter` for `<Link>` components
- Use `QueryClientProvider` if TanStack Query hooks are used in child components
- `setup()` helper function pattern: returns default mocks, allows partial overrides via `Partial<ReturnType<typeof useAuth>>`

### Previous Story Intelligence (Story 5-2)

- **252 web tests passing** at end of Story 5-2 (19 test files). Target: zero regressions.
- **12 pre-existing lint errors** in Epic 4 spec files — known, do not fix here.
- **NavBar already handles navigation**: tabs "Principal" and "Leaderboard", hamburger menu on mobile. HomePage does NOT need any navigation logic.
- **Avatar/profile link is in NavBar**: no need for profile navigation from home page layout (PlayerProfileSection will handle this in 5-7).
- **Review patches from 5-2**: `useRef` typing fixes, `type="button"` on all buttons, `font-sans` on all text, `aria-label` on interactive elements. Apply same patterns.

### What This Story Does NOT Do

- Does NOT implement the game mode selector UI (Story 5-4)
- Does NOT implement live matches backend or frontend (Story 5-5)
- Does NOT implement leaderboard preview table (Story 5-6)
- Does NOT implement player profile card (Story 5-7)
- Does NOT add animations or transitions (Story 5-8)
- Placeholder sections are SHELLS — they render a header and "Próximamente" text only

### Project Structure Notes

- Frontend root: `ultimatype-monorepo/apps/web/`
- New directory: `apps/web/src/components/home/`
- New files:
  - `home-page.tsx` — Main component with grid layout
  - `home-page.spec.tsx` — Tests
  - `game-actions-section.tsx` — Extracted create/join room functionality
  - `live-matches-section.tsx` — Placeholder shell
  - `leaderboard-preview-section.tsx` — Placeholder shell
  - `player-profile-section.tsx` — Placeholder shell
- Modified file: `apps/web/src/app/app.tsx` — simplified, delegates to HomePage
- All file names use `kebab-case`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.3] — AC definitions, user story
- [Source: Bosquejos/Pantalla Principal/screen Pantalla principal.png] — Visual layout reference with 4-quadrant grid
- [Source: Bosquejos/Pantalla Principal/DESIGN Pantalla principal.md] — "Kinetic Monospace" design system, No-Line rule, surface hierarchy
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Focus Fade pattern, layout guidelines
- [Source: _bmad-output/implementation-artifacts/5-2-navbar-redesign.md] — Previous story learnings, testing patterns, design tokens
- [Source: apps/web/src/app/app.tsx] — Current inline home page code to extract

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Helmet mock: `<title>` doesn't render textContent in mocked div — switched to `data-title` attribute extraction pattern.
- Pre-existing `app.spec.tsx` test expected `<h1>UltimaType</h1>` (old Logo heading) — updated to check for sections instead.

### Completion Notes List

- Task 1: Created `HomePage` component with 12-column grid (`grid-cols-12 gap-6`), centered `max-w-6xl` container, responsive padding (`px-4 lg:px-6 pt-20 pb-10`), Helmet title preserved.
- Task 2: Extracted `GameActionsSection` with `JoinRoomInput` (regex validation, uppercase, Enter key), `CreateRoomButton` for authenticated users, dimmed button + tooltip + `LoginModal` for unauthenticated. Section uses `rounded-card bg-surface-sunken p-6` with `label-md` header "MODO DE JUEGO". Greeting and logout button removed.
- Task 3: Created 3 placeholder shells (`LiveMatchesSection`, `LeaderboardPreviewSection`, `PlayerProfileSection`) with consistent container pattern and "Próximamente" placeholder text.
- Task 4: Simplified `app.tsx` — removed inline home page (90+ lines), `JoinRoomInput`, `showLogin` state, and unused imports (`useState`, `Helmet`, `Logo`, `CreateRoomButton`, `LoginModal`, `useNavigate`). Routes now delegate to `<HomePage />` at `*`. `ProfileRedirect` kept in `app.tsx`.
- Task 5: 24 tests covering grid layout (6), design system alignment (3), Helmet (1), auth states (3+3), JoinRoomInput (5), placeholder sections (3).
- Task 6: 278 tests passing (20 files), 0 new lint errors, build clean.

### Review Findings

- [x] [Review][Patch] Test `app.spec.tsx` demasiado débil — eliminado (home-page.spec.tsx cubre todo); h1 condicional agregado en NavBar para home page [app.spec.tsx:23-25]
- [x] [Review][Patch] Regresión: `isFetchingProfile` no manejado en `GameActionsSection` — corregido con ternario inline, spinner `_` durante carga [game-actions-section.tsx:53-89]
- [x] [Review][Patch] Tooltip del botón "Crear Partida" desactivado no accesible por teclado/screen reader — corregido con `aria-describedby` + `role="tooltip"` [game-actions-section.tsx:76-79]
- [x] [Review][Patch] Paste event puede bypassear `maxLength` — corregido con `.slice(0, 6)` en onChange [game-actions-section.tsx:30-32]
- [x] [Review][Patch] `home-page.tsx` usa `<div>` en lugar de `<main>` para el contenido principal — corregido; pendiente en LeaderboardPage y PublicProfilePage [home-page.tsx:9]
- [x] [Review][Patch] Código compuesto de espacios produce error misleading — corregido con guard `!normalized` y mensaje "Ingresá un código de partida" [game-actions-section.tsx:15-19]
- [x] [Review][Defer] No hay ruta 404 — `path="*"` devuelve HomePage para cualquier URL desconocida — deferred, pre-existing/por spec
- [x] [Review][Defer] Charset del regex ambiguo (O, 1, I incluidos) — deferred, pre-existing desde app.tsx
- [x] [Review][Defer] Sin breakpoint intermedio `md:` en el grid — deferred, decisión de diseño fuera de scope
- [x] [Review][Defer] `HelmetProvider` no confirmado en árbol — deferred, concern de setup
- [x] [Review][Defer] Sin auth guard en ruta `/room/:code` para usuarios no autenticados — deferred, pre-existing behavior

### Change Log

- 2026-04-06: Story 5.3 code review complete. 6 patches, 5 defers, 13 dismissed.
- 2026-04-06: Story 5.3 implementation complete. HomePage extracted from app.tsx with 12-column grid, 4 section components, 24 new tests.

### File List

- `apps/web/src/components/home/home-page.tsx` — New: main HomePage component with 12-column grid layout and Helmet
- `apps/web/src/components/home/game-actions-section.tsx` — New: extracted CreateRoom + JoinRoomInput + LoginModal functionality
- `apps/web/src/components/home/live-matches-section.tsx` — New: placeholder shell for Story 5-5
- `apps/web/src/components/home/leaderboard-preview-section.tsx` — New: placeholder shell for Story 5-6
- `apps/web/src/components/home/player-profile-section.tsx` — New: placeholder shell for Story 5-7
- `apps/web/src/components/home/home-page.spec.tsx` — New: 24 tests covering all ACs
- `apps/web/src/app/app.tsx` — Modified: simplified, delegates home page to HomePage component
- `apps/web/src/app/app.spec.tsx` — Modified: updated test to check for sections instead of old Logo heading
