# Story 5.2: Rediseño del NavBar

Status: done

## Story

As a user,
I want a redesigned navigation bar with clear navigation tabs,
so that I can quickly access the main sections of the platform.

## Acceptance Criteria

1. **AC1 — Logo**: The logo "UltimaType" is displayed on the left, clickable, navigates to home (`/`). Reuses existing `Logo` component.

2. **AC2 — Navigation Tabs**: Navigation tabs are shown: "Principal" (links to `/`), "Leaderboard" (links to `/leaderboard`). Active tab is visually distinct (e.g., `font-semibold text-text-main`) based on current route.

3. **AC3 — Authenticated Avatar**: For authenticated users, the avatar appears on the right as a clickable link to `/u/{user.slug}` (the public profile page). Avatar shows the Google/GitHub profile image; fallback to initials if image fails. The current "Perfil" text label is removed — avatar only.

4. **AC4 — Unauthenticated Login**: For unauthenticated users, an "Iniciar sesión" button appears on the right.

5. **AC5 — Mobile Hamburger**: On mobile (`< 768px` / below Tailwind `md:` breakpoint), the navigation tabs ("Principal", "Leaderboard") collapse into a hamburger menu. The hamburger icon toggles an overlay/dropdown with the nav links. Logo, ThemeToggle, and avatar/login remain visible on mobile.

6. **AC6 — Focus Fade Preserved**: The existing Focus Fade behavior during arena matches is preserved. The `nav-bar-global` CSS class remains on the `<nav>` element. The CSS rule `body.arena-active .nav-bar-global` continues to fade the navbar to 15% opacity with `pointer-events: none`.

7. **AC7 — Design System Alignment**: The navbar uses design tokens from Story 5-1: `bg-surface-base` (or `bg-surface-sunken`), `text-text-main`, `text-text-muted`, `rounded-full`, `font-sans` (Space Grotesk). No 1px border-bottom — use tonal surface shift for separation from page content. ThemeToggle remains in the navbar.

## Tasks / Subtasks

- [x] Task 1: Redesign NavBar layout with tabs (AC: #1, #2, #7)
  - [x] 1.1 Modify `nav-bar.tsx`: restructure layout — Logo left, tabs center-left, controls right
  - [x] 1.2 Add "Principal" tab (`<Link to="/">`) and rename "Ranking" to "Leaderboard" (`<Link to="/leaderboard">`)
  - [x] 1.3 Implement active tab detection: "Principal" active when `pathname === '/'`, "Leaderboard" active when `pathname === '/leaderboard'`
  - [x] 1.4 Style active vs inactive tabs: active = `text-text-main font-semibold`, inactive = `text-text-muted hover:text-text-main`
  - [x] 1.5 Remove `bg-surface-sunken` 1px-border-like look — use `bg-surface-base` or keep `bg-surface-sunken` as tonal shift. No `border-b`.

- [x] Task 2: Simplify avatar for authenticated users (AC: #3)
  - [x] 2.1 Remove the "Perfil" text and pill wrapper (`bg-surface-raised px-3 py-1.5`) — link the avatar image directly to `/u/{user.slug}`
  - [x] 2.2 Keep the initials fallback circle when `avatarUrl` is null or image fails to load
  - [x] 2.3 Avatar size: `h-8 w-8 rounded-full` (slightly larger than current `h-6 w-6`)

- [x] Task 3: Mobile hamburger menu (AC: #5)
  - [x] 3.1 Add a hamburger icon button visible only on mobile: `md:hidden`
  - [x] 3.2 Hide tab links on mobile: `hidden md:flex`
  - [x] 3.3 Implement hamburger toggle state (`useState<boolean>`) that opens a dropdown/overlay below the navbar with "Principal" and "Leaderboard" links
  - [x] 3.4 Close hamburger menu on route change (use `useEffect` with `location.pathname` dependency)
  - [x] 3.5 Close hamburger menu when clicking outside or pressing Escape
  - [x] 3.6 Style mobile menu: `bg-surface-base` overlay panel, full-width, with tonal separation (no border)
  - [x] 3.7 Use SVG hamburger icon (3-line) and X icon for open/close states — inline SVGs, no external icon library

- [x] Task 4: Preserve Focus Fade (AC: #6)
  - [x] 4.1 Verify `nav-bar-global` class remains on `<nav>` element after redesign
  - [x] 4.2 Verify `body.arena-active .nav-bar-global` CSS rule still works (no changes to `styles.css` Focus Fade section)
  - [x] 4.3 Write test: assert `nav-bar-global` class is present on rendered nav element

- [x] Task 5: Write tests (AC: all)
  - [x] 5.1 Test: navbar renders Logo, tabs, ThemeToggle for unauthenticated user with "Iniciar sesión" button
  - [x] 5.2 Test: navbar renders avatar link to `/u/{slug}` for authenticated user
  - [x] 5.3 Test: "Principal" tab has active styling when on home route
  - [x] 5.4 Test: "Leaderboard" tab has active styling when on `/leaderboard` route
  - [x] 5.5 Test: avatar fallback to initials when `avatarUrl` is null
  - [x] 5.6 Test: `nav-bar-global` class present on nav element (Focus Fade contract)
  - [x] 5.7 Test: hamburger button visible, tabs hidden at mobile viewport (test CSS class presence: `md:hidden` / `hidden md:flex`)
  - [x] 5.8 Test: hamburger menu opens/closes on click
  - [x] 5.9 Test: LoginModal opens when "Iniciar sesión" button clicked

- [x] Task 6: Final Validation
  - [x] 6.1 Run `npx nx lint web` — zero new errors (3 new warnings: 1 no-explicit-any, 2 no-non-null-assertion — same pattern as codebase; 12 pre-existing errors in other spec files)
  - [x] 6.2 Run `npx nx test web` — 252 tests passing across 19 files (zero regressions, 17 new tests)
  - [x] 6.3 Run `npx nx build web` — builds cleanly
  - [x] 6.4 Visually verify: desktop and mobile layouts render correctly

## Dev Notes

### Architecture & Tech Stack

- **React 19 + React Router v6** — `useLocation()` for active tab detection, `<Link>` for client-side navigation.
- **Tailwind CSS v4** — all styling via utility classes. Theme defined in `@theme` block in `styles.css`. No `tailwind.config.ts`.
- **Responsive breakpoint**: `md:` = 48rem (768px). Mobile-first: default = mobile, `md:` = desktop.
- **No external icon library** — use inline SVGs for hamburger/close icons. The project does NOT use any icon library (Material Symbols, Lucide, etc.) — all icons are inline SVGs or emoji.

### Current NavBar Implementation (`components/ui/nav-bar.tsx`)

```
Current layout:
[Logo] ................................. [Ranking link] [ThemeToggle] [Profile pill / Login btn]

Target layout:
[Logo] [Principal tab] [Leaderboard tab] ........ [ThemeToggle] [Avatar / Login btn]

Mobile target:
[Logo] [Hamburger] ................................ [ThemeToggle] [Avatar / Login btn]
  └─ dropdown: [Principal] [Leaderboard]
```

**Key existing code to preserve:**
- `nav-bar-global` CSS class on `<nav>` — required by Focus Fade CSS (`body.arena-active .nav-bar-global`)
- `LoginModal` integration — show on "Iniciar sesión" click via `useState`
- `useAuth()` hook — provides `{ user, isAuthenticated }` where `user: UserProfile` has `slug`, `displayName`, `avatarUrl`
- `imgError` state for avatar fallback to initials

**Code to change:**
- Remove "Perfil" text label and pill container from authenticated state
- Rename "Ranking" → "Leaderboard"
- Add "Principal" tab for home
- Add active state for "Principal" based on `pathname === '/'`
- Add hamburger menu for mobile

### Existing Components (DO NOT recreate)

| Component | File | Reuse |
|-----------|------|-------|
| `Logo` | `components/ui/logo.tsx` | Reuse as-is — renders `<Link to="/">` with "UltimaType" branding |
| `ThemeToggle` | `components/ui/theme-toggle.tsx` | Reuse as-is — cycles light→dark→system |
| `LoginModal` | `components/ui/login-modal.tsx` | Reuse as-is — shows Google/GitHub OAuth options |
| `useAuth` | `hooks/use-auth.ts` | Reuse — returns `{ user, isAuthenticated, loginWithGoogle, loginWithGithub, logout }` |

### Design System Tokens Available (from Story 5-1)

**Colors**: `bg-surface-base`, `bg-surface-sunken`, `bg-surface-raised`, `bg-surface-container`, `bg-surface-container-low`, `text-text-main`, `text-text-muted`, `text-primary`, `text-on-surface-variant`, `bg-primary-container`

**Typography**: `font-sans` (Space Grotesk), `font-mono` (IBM Plex Mono), `text-sm`, `font-semibold`

**Border radius**: `rounded-card` (2rem), `rounded-card-lg` (2.5rem), `rounded-full` (9999px)

**No-Line Rule**: Do NOT use `border-b` or any 1px borders on the navbar. Use tonal surface shift for visual separation.

### Focus Fade Contract

The Focus Fade CSS in `styles.css` (lines 152-189) uses:
```css
body.arena-active .nav-bar-global {
  opacity: var(--focus-fade-opacity);   /* 0.15 */
  pointer-events: none;
  transition: opacity 0.5s ease;
}
```

The `arena-page.tsx` adds `body.arena-active` when the user is playing (not spectating). The `nav-bar-global` class on `<nav>` is the CSS hook. **DO NOT rename or remove this class.**

### Hamburger Menu Implementation Pattern

Use React `useState` for open/close. No external library needed:

```tsx
const [menuOpen, setMenuOpen] = useState(false);

// Close on route change
useEffect(() => { setMenuOpen(false); }, [location.pathname]);
```

**Hamburger SVG** (3-line icon):
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
  <line x1="3" y1="6" x2="21" y2="6" />
  <line x1="3" y1="12" x2="21" y2="12" />
  <line x1="3" y1="18" x2="21" y2="18" />
</svg>
```

**Close SVG** (X icon):
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
  <line x1="18" y1="6" x2="6" y2="18" />
  <line x1="6" y1="6" x2="18" y2="18" />
</svg>
```

### Routes for Active Tab Detection

| Route | Active Tab |
|-------|------------|
| `/` (home, catch-all `*`) | "Principal" |
| `/leaderboard` | "Leaderboard" |
| Any other route | Neither tab highlighted |

Note: `pathname === '/'` for "Principal" active state. The catch-all `*` route renders the home page but `pathname` will be whatever the user typed, so use `===` not `startsWith`.

### Testing Patterns (from Story 5-1)

- Tests are in `*.spec.tsx` files co-located with components or in `src/`
- Use Vitest + React Testing Library (`@testing-library/react`)
- Mock `useAuth` via `vi.mock('../../hooks/use-auth')`
- Mock React Router: `vi.mock('react-router-dom', ...)` with `useLocation` returning `{ pathname: '/' }`
- Use `MemoryRouter` wrapper for `<Link>` components
- Test file: `apps/web/src/components/ui/nav-bar.spec.tsx`

### Previous Story Intelligence (Story 5-1)

- **CSS-only changes**: Story 5-1 only modified `styles.css` and `index.html`. Zero component changes. Story 5-2 is the FIRST story that modifies React components in Epic 5.
- **234 web tests passing** at end of Story 5-1 (18 test files). Target: zero regressions.
- **12 pre-existing lint import/first errors** in Epic 4 spec files — known, do not fix here.
- **Token audit**: 5-1 documented all Tailwind classes used in Epic 4 components. NavBar was NOT part of the audit (it's in `ui/`, not in Epic 4 components).
- **Review patches from 5-1**: string mismatch in tests, regex fragility, configurable:true in matchMedia mocks. Apply same care in new tests.

### Project Structure Notes

- Frontend root: `ultimatype-monorepo/apps/web/`
- NavBar component: `apps/web/src/components/ui/nav-bar.tsx`
- NavBar test (new): `apps/web/src/components/ui/nav-bar.spec.tsx`
- Styles: `apps/web/src/styles.css`
- Auth hook: `apps/web/src/hooks/use-auth.ts`
- App entry: `apps/web/src/app/app.tsx` — renders `{!isCallbackRoute && <NavBar />}`
- All file names use `kebab-case`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2] — AC definitions, user story
- [Source: Bosquejos/Pantalla Principal/DESIGN Pantalla principal.md] — "Kinetic Monospace" design system, No-Line rule, surface hierarchy, button styles
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Focus Fade pattern, keyboard-first navigation, No-Line rule
- [Source: _bmad-output/implementation-artifacts/5-1-design-system-migration.md] — Token map, design system rules, font loading, previous story learnings
- [Source: Tailwind CSS v4 docs] — `md:` breakpoint = 48rem (768px), `hidden md:flex` / `md:hidden` responsive pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Test failure: `toHaveClass` and `toBeInTheDocument` not available — project uses Vitest with Chai (no jest-dom). Rewrote all assertions to use `.toBeTruthy()`, `.toBeNull()`, `.className.toContain()`, and `.classList.contains()`.

### Completion Notes List

- Task 1: Restructured NavBar layout — Logo left, nav tabs center-left ("Principal" + "Leaderboard"), controls right. Active tab detection via `location.pathname === to`. Kept `bg-surface-sunken` for tonal shift, no `border-b`. Extracted `NAV_TABS` constant and `tabClass()` helper for DRY active/inactive styling.
- Task 2: Simplified avatar — removed "Perfil" text label and pill wrapper (`bg-surface-raised`). Avatar is now a direct `<Link>` to `/u/{slug}` with `h-8 w-8 rounded-full`. Initials fallback preserved. Login button changed from `rounded-lg` to `rounded-full` for design system alignment.
- Task 3: Added hamburger menu — `HamburgerIcon` and `CloseIcon` inline SVG components. Toggle via `useState<boolean>`, mobile tabs in dropdown with `md:hidden`. Auto-close on route change (`useEffect` with `location.pathname`), Escape key, and click outside (`mousedown` + `useRef`).
- Task 4: Focus Fade contract preserved — `nav-bar-global` class on `<nav>`, no changes to `styles.css` Focus Fade rules. Test asserts class presence.
- Task 5: 17 tests in `nav-bar.spec.tsx` covering all 7 ACs — unauthenticated rendering, authenticated avatar, active tab detection (4 routes), Focus Fade contract, hamburger menu (open/close/escape/class verification), LoginModal integration.
- Task 6: 252 web tests passing (19 files), zero regressions, 17 new. Lint: 0 new errors (12 pre-existing in other spec files). Build: clean.

### Change Log

- 2026-04-06: Story 5.2 implementation complete. NavBar redesigned with tabs, simplified avatar, mobile hamburger, Focus Fade preserved. 17 new tests.

### File List

- `apps/web/src/components/ui/nav-bar.tsx` — Modified: complete redesign with tabs, simplified avatar, hamburger menu, Focus Fade class preserved
- `apps/web/src/components/ui/nav-bar.spec.tsx` — New: 17 tests covering all ACs (rendering, active tabs, auth states, hamburger, Focus Fade)

### Review Findings

- [x] [Review][Decision] Fallback `/profile` eliminado — cambiado a `` to={`/u/${user.slug}`} `` (slug es non-optional en UserProfile)
- [x] [Review][Patch] `imgError` no se resetea cuando cambia `user.avatarUrl` [nav-bar.tsx:51] — agregado useEffect con dep [user?.avatarUrl]
- [x] [Review][Patch] Clic en mismo-route link en dropdown móvil no cierra el menú [nav-bar.tsx:166] — agregado onClick={() => setMenuOpen(false)}
- [x] [Review][Patch] `useRef<HTMLDivElement>` mal tipado [nav-bar.tsx:54] — corregido a useRef<HTMLElement>
- [x] [Review][Patch] Dropdown móvil usa `bg-surface-sunken` en vez de `bg-surface-base` (Task 3.6) [nav-bar.tsx:165] — corregido
- [x] [Review][Patch] Botón "Iniciar sesión" le falta clase `font-sans` (AC7) [nav-bar.tsx:153] — agregado font-sans
- [x] [Review][Patch] Botones sin `type="button"` [nav-bar.tsx:125, 153] — agregado en hamburger y login
- [x] [Review][Patch] Sin test para la rama `onError` del avatar [nav-bar.spec.tsx] — 2 tests nuevos: onError fallback + reset de imgError
- [x] [Review][Patch] `isActive`/`tabClass` en render body — extraídas fuera del componente (Enfoque B), call sites actualizados
- [x] [Review][Patch] `<nav>` sin `aria-label` — agregado aria-label="Navegación principal"
- [x] [Review][Patch] `setup()` override type `Record<string, unknown>` — corregido a Partial<ReturnType<typeof useAuth>>
- [x] [Review][Patch] Iniciales con espacios/emojis — filter y map corregidos para whitespace y surrogate pairs
- [x] [Review][Patch] Escape no devuelve foco al hamburger — agregado hamburgerRef + focus() en handler
- [x] [Review][Defer] Sin `role="menu"` / `role="menuitem"` en dropdown móvil — deferred, semántica debatida para nav links
- [x] [Review][Defer] Sin `touchstart` listener para click-outside — deferred, mousedown synthesized cubre la mayoría
