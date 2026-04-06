# Story 5.1: Design System Migration

Status: done

## Story

As a developer,
I want to migrate and extend the CSS tokens to align with the "Kinetic Monospace" Design System,
so that all new and existing components — including those built in Epic 4 — share a consistent visual language across light and dark modes.

## Acceptance Criteria

1. **AC1 — Token Extension**: Color tokens are extended to include `surface-container-low`, `surface-container-lowest`, `on-surface-variant`, `outline` (+ dark counterparts). All existing Epic 4 tokens (`surface-base`, `surface-sunken`, `surface-raised`, `text-text-main`, `text-text-muted`, `text-primary`, `text-success`, `text-error`) remain functional — new tokens are added alongside, not replacements.

2. **AC2 — Typography**: Typography uses Space Grotesk for headlines/body and IBM Plex Mono for typing areas and data values (WPM, scores, stats). Font files loaded via Google Fonts `<link>` in `index.html`.

3. **AC3 — Border Radius**: Border-radius uses `2rem`/`2.5rem` for cards and `full` (pill) for buttons, defined as custom `--radius-*` tokens in `@theme`.

4. **AC4 — No-Line Rule**: The "No-Line" rule is documented: no 1px borders to separate sections, use tonal shifts instead.

5. **AC5 — Theme Default**: The default theme is `system` (browser preference), persisted when user changes it. (Already implemented — verify only.)

6. **AC6 — Token Audit**: An inventory of every Tailwind class used across these Epic 4 components is produced **before** any CSS token is added or modified:
   - `leaderboard-page.tsx`
   - `public-profile-page.tsx`
   - `match-history-section.tsx`
   - `match-detail-page.tsx`
   Any `border-b border-surface-raised` pattern is flagged as a "No-Line" violation to be addressed in stories 5-12/5-13. The inventory is documented as a comment block at the top of `styles.css`.

7. **AC7 — Dark Mode Variant**: Tailwind v4 `@custom-variant dark` directive is added so `dark:` utility classes work in future stories.

## Tasks / Subtasks

- [x] Task 1: Token Audit of Epic 4 Components (AC: #6)
  - [x] 1.1 Read and catalogue every Tailwind class in `leaderboard-page.tsx`, `public-profile-page.tsx`, `match-history-section.tsx`, `match-detail-page.tsx`
  - [x] 1.2 Identify all `border-b border-surface-raised` patterns as "No-Line" violations
  - [x] 1.3 Check token coverage: list any semantic colors/spacing not yet in `@theme`
  - [x] 1.4 Write the inventory as a comment block at the top of `styles.css` (before `@import`)

- [x] Task 2: Extend Color Tokens in `styles.css` (AC: #1)
  - [x] 2.1 Add new tokens to `@theme` block (light values):
    - `--color-surface-container`: tonal layer between base and raised
    - `--color-surface-container-low`: subtle section background
    - `--color-surface-container-lowest`: elevated card background (lightest lift)
    - `--color-on-surface-variant`: secondary text/icon color
    - `--color-outline`: ghost border / accessible separator (low opacity)
    - `--color-outline-variant`: even subtler separator
    - `--color-primary-container`: high-impact area background
    - `--color-secondary`: brand secondary (#954900)
    - `--color-secondary-container`: brand secondary container (#FF9B51 variant)
  - [x] 2.2 Add corresponding dark-mode overrides inside `.dark {}` block
  - [x] 2.3 Verify existing tokens (`surface-base`, `surface-sunken`, `surface-raised`, `primary`, `success`, `error`, `text-main`, `text-muted`) are untouched
  - [x] 2.4 Write tests: snapshot or assertion that all expected CSS variables exist in both light and dark mode

- [x] Task 3: Typography Tokens (AC: #2)
  - [x] 3.1 Add Google Fonts `<link>` to `index.html` for Space Grotesk (400, 500, 600, 700) and IBM Plex Mono (400, 500, 700)
  - [x] 3.2 Add `--font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;` to `@theme`
  - [x] 3.3 Add typography scale tokens to `@theme`:
    - `--font-size-display-lg: 3.5rem` (WPM counter, monumental metrics)
    - `--font-size-headline-lg: 2rem` (section headers)
    - `--font-size-title-lg: 1.375rem` (card titles)
    - `--font-size-label-md: 0.75rem` (all-caps labels)
  - [x] 3.4 Add letter-spacing tokens:
    - `--tracking-display: -0.02em`
    - `--tracking-headline: -0.01em`
    - `--tracking-title: 0.02em`
    - `--tracking-label: 0.05em`
  - [x] 3.5 Write test: verify `font-sans` resolves to Space Grotesk and `font-mono` resolves to IBM Plex Mono in computed styles

- [x] Task 4: Border Radius Tokens (AC: #3)
  - [x] 4.1 Add to `@theme`:
    - `--radius-card: 2rem` (cards, containers)
    - `--radius-card-lg: 2.5rem` (hero sections, large cards)
    - `--radius-pill: 9999px` (buttons, pills, progress bars)
  - [x] 4.2 Write test: verify custom radius tokens exist in CSS output

- [x] Task 5: Dark Mode `@custom-variant` Directive (AC: #7)
  - [x] 5.1 Add `@custom-variant dark (&:where(.dark, .dark *));` after `@import "tailwindcss"` in `styles.css`
  - [x] 5.2 Verify existing dark mode behavior (`.dark` class toggle, anti-FOUC script) still works
  - [x] 5.3 Write test: a component using `dark:bg-surface-sunken` applies correctly

- [x] Task 6: No-Line Rule Documentation (AC: #4)
  - [x] 6.1 Add a "Design System Rules" comment section in `styles.css` documenting:
    - No-Line Rule: no 1px borders for section separation; use tonal surface shifts
    - Tinted shadows only: `rgba(15, 31, 41, 0.06)`, never pure black
    - Surface hierarchy: base → container-low → container → raised → container-lowest (lift)

- [x] Task 7: Verify Theme Default (AC: #5)
  - [x] 7.1 Confirm `use-theme.ts` defaults to `'system'` when no localStorage value exists
  - [x] 7.2 Confirm anti-FOUC script in `index.html` handles `'system'` preference
  - [x] 7.3 Write test: ThemeProvider defaults to system and resolves based on matchMedia

- [x] Task 8: Final Validation
  - [x] 8.1 Run `npx nx lint web` — zero new errors (12 pre-existing import/first errors in Epic 4 spec files)
  - [x] 8.2 Run `npx nx test web` — 234 tests passing (zero regressions, 60 new tests)
  - [x] 8.3 Run `npx nx build web` — builds cleanly
  - [x] 8.4 Visually confirm: app renders correctly — no component files were modified, only tokens extended

## Dev Notes

### Architecture & Tech Stack

- **Tailwind CSS v4** — theme is defined entirely in CSS via `@theme` directive in `styles.css`. There is NO `tailwind.config.ts` file. All customization happens in CSS.
- **Vite + @tailwindcss/vite** — Tailwind integrated as Vite plugin (`apps/web/vite.config.mts` line 4).
- **Dark mode** — Class-based via `.dark` on `<html>`. Anti-FOUC inline script in `index.html` (lines 49-63). `ThemeProvider` in `use-theme.ts` manages state + localStorage + matchMedia listener. Theme toggle cycles light→dark→system.
- **NO `@custom-variant dark`** declared yet — `dark:` Tailwind utilities will NOT work until added. Currently all dark mode works because `.dark` overrides CSS variables directly, not via Tailwind variants.

### Current Token Map (styles.css)

```
Light (@theme):              Dark (.dark override):
surface-base:   #F5FAFA      surface-base:   #0F1F29
surface-sunken: #EAEFEF      surface-sunken: #1A2630
surface-raised: #E8EEEE      surface-raised: #25343F
primary:        #FF9B51       (unchanged)
success:        #4ADE80       (unchanged)
error:          #FB7185       (unchanged)
text-main:      #0F1F29       text-main:      #F8F9FA
text-muted:     #64748B       text-muted:     #8B949E
font-sans:      'Space Grotesk', system-ui, sans-serif
```

### New Tokens to Add (from Design System "Kinetic Monospace")

**Light mode values** (derive from design doc palette):
| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `surface-container` | `#E0E8E8` | `#1E2D37` | Intermediate tonal layer |
| `surface-container-low` | `#EBF0F0` | `#162229` | Section backgrounds |
| `surface-container-lowest` | `#FFFFFF` | `#0A1520` | Elevated cards (lightest lift) |
| `on-surface-variant` | `#3E4F5B` | `#A0ACB5` | Secondary text/icons |
| `outline` | `#6B7D8A` | `#506070` | Ghost borders when needed |
| `outline-variant` | `#C3C7CB33` | `#C3C7CB1A` | Ultra-subtle separator (20%/10% opacity) |
| `primary-container` | `#25343F` | `#25343F` | High-impact area bg |
| `secondary` | `#954900` | `#FFB77C` | Brand secondary |
| `secondary-container` | `#FFDBC1` | `#6E3500` | Brand secondary container |

### Font Loading Strategy

Currently NO web font loading in `index.html`. The `font-sans: 'Space Grotesk'` reference falls back to `system-ui`. Must add Google Fonts `<link>` tags for:
- Space Grotesk: weights 400, 500, 600, 700
- IBM Plex Mono: weights 400, 500, 700

Use `<link rel="preconnect">` + `<link rel="stylesheet">` pattern for performance:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### "No-Line" Violations Found in Epic 4 Components

These are NOT to be fixed in this story — only flagged for stories 5-12 and 5-13:
- `leaderboard-page.tsx`: `border-b border-surface-raised` on table header + row dividers
- `public-profile-page.tsx`: `border-b border-surface-raised` on table headers + rows in match history
- `match-history-section.tsx`: `border-b border-surface-raised` on table headers + rows
- `match-detail-page.tsx`: `border-b border-surface-raised` on table headers + rows

### Key Constraint: Do NOT Modify Existing Components

This story only touches:
1. `apps/web/src/styles.css` — extend tokens, add audit comment, add @custom-variant
2. `apps/web/index.html` — add font loading links
3. Test files — new tests for token validation

Do NOT change any component files. All visual updates to components happen in subsequent stories (5-2 through 5-13).

### Tailwind v4 `@theme` Patterns

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-surface-base: #F5FAFA;
  --font-sans: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, Consolas, monospace;
  --radius-card: 2rem;
  /* etc. */
}
```

Tokens defined in `@theme` automatically generate utility classes: `bg-surface-container-low`, `text-on-surface-variant`, `font-mono`, `rounded-card`, etc.

### Previous Story Intelligence (Story 4-6)

- **Test count**: 330 API + 174 web tests passing at end of Epic 4.
- **Code review found 11 patches**: XSS escaping, host-header injection, TOCTOU race, slug normalization, DTO validation. Rigorous review pattern expected.
- **Pattern**: All frontend components use inline Tailwind classes, no CSS modules or styled-components.
- **Files**: Components in `components/leaderboard/`, `components/profile/`, `components/match/` — these are the audit targets.

### Project Structure Notes

- Monorepo root: `ultimatype-monorepo/` inside project root
- Frontend: `ultimatype-monorepo/apps/web/`
- Styles: `ultimatype-monorepo/apps/web/src/styles.css`
- Index HTML: `ultimatype-monorepo/apps/web/index.html`
- Components: `ultimatype-monorepo/apps/web/src/components/`
- Tests run via: `npx nx test web`
- Lint via: `npx nx lint web`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1] — AC definitions
- [Source: Bosquejos/Pantalla Principal/DESIGN Pantalla principal.md] — "Kinetic Monospace" design system spec, color palette, typography scale, No-Line rule, tinted shadows, border-radius
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — CSS Variables theming, Space Grotesk, tonal layering, Focus Fade, button hierarchy
- [Source: _bmad-output/planning-artifacts/architecture.md] — Tailwind config path, project structure, Vite plugin setup
- [Source: Tailwind CSS v4 Docs] — `@theme` directive, `@custom-variant dark`, CSS-native theming

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Test failure: `toContain('never use pure black')` → fixed to `'Never use pure black'` (case mismatch in comment)

### Completion Notes List

- Task 1: Exhaustive audit of 4 Epic 4 components catalogued as 75-line comment block at top of styles.css. Identified `border-b border-surface-raised` No-Line violations in all 4 components. Token coverage gaps documented.
- Task 2: Added 9 new color tokens (surface-container, surface-container-low, surface-container-lowest, on-surface-variant, outline, outline-variant, primary-container, secondary, secondary-container) with light + dark values. All existing Epic 4 tokens preserved unchanged.
- Task 3: Google Fonts loaded via preconnect + stylesheet link (Space Grotesk 400-700, IBM Plex Mono 400/500/700). Added `--font-mono`, typography scale (display-lg, headline-lg, title-lg, label-md), and letter-spacing tokens.
- Task 4: Added `--radius-card: 2rem`, `--radius-card-lg: 2.5rem`, `--radius-pill: 9999px`.
- Task 5: Added `@custom-variant dark (&:where(.dark, .dark *))` enabling `dark:` Tailwind utilities for future stories.
- Task 6: "Design System Rules" comment block documents No-Line rule, tinted shadows, and surface hierarchy.
- Task 7: ThemeProvider verified: defaults to 'system', persists to localStorage, anti-FOUC script handles all 3 modes. 8 new tests in use-theme.spec.tsx.
- Task 8: 234 tests pass (18 files), build succeeds, lint has 0 new errors (12 pre-existing in Epic 4 spec files).

### Review Findings

- [x] [Review][Decision] `--color-surface-container-lowest` dark value invierte jerarquía — Resuelto: se mantiene `#0A1520` (capa profunda/scrim en dark). Doc actualizada. `text-muted` mejorado a `#909EAA` para WCAG AA en todos los niveles.
- [x] [Review][Decision] `rounded-pill` vs `rounded-full` — Resuelto: token renombrado `--radius-pill → --radius-full`, genera `rounded-full` alineado con AC3 y el lenguaje del built-in de Tailwind.
- [x] [Review][Patch] String mismatch en test: `toContain('NO-LINE" VIOLATIONS')` falta la comilla de apertura [design-system.spec.ts:167]
- [x] [Review][Patch] Regex frágil para extraer bloque `.dark {}`: `[^}]+` → `[\s\S]*?` [design-system.spec.ts:67]
- [x] [Review][Patch] Sin test para el listener de cambio de preferencia del sistema — test añadido [use-theme.spec.tsx]
- [x] [Review][Patch] `Object.defineProperty` en `window.matchMedia` sin `configurable: true` [use-theme.spec.tsx:32]
- [x] [Review][Patch] Tests AC1 scoped a `@theme {}` con regex — tokens en comentarios ya no pasan [design-system.spec.ts:40-46]
- [x] [Review][Defer] Guards SSR/localStorage en `use-theme.ts` (window, localStorage throws) [use-theme.ts:23,40] — deferred, pre-existing
- [x] [Review][Defer] `useTheme` fuera de ThemeProvider no produce error explícito [use-theme.ts:16] — deferred, pre-existing
- [x] [Review][Defer] Limpieza race condition del mediaQuery listener al desmontar [use-theme.ts:66] — deferred, pre-existing
- [x] [Review][Defer] Google Fonts stylesheet es render-blocking (patrón definido por spec) — deferred, por diseño
- [x] [Review][Defer] `removeEventListener` no validado en tests [use-theme.spec.tsx] — deferred, cobertura menor

### Change Log

- 2026-04-06: Story 5.1 implementation complete. Extended design system tokens, typography, radius, dark variant, documentation. 60 new tests added.

### File List

- `apps/web/src/styles.css` — Modified: token audit comment, design system rules comment, @custom-variant dark, 9 new color tokens (light + dark), font-mono, typography scale, letter-spacing, border-radius tokens
- `apps/web/index.html` — Modified: Google Fonts preconnect + stylesheet links for Space Grotesk and IBM Plex Mono
- `apps/web/src/design-system.spec.ts` — New: 52 tests validating all design system tokens, typography, radius, documentation, dark variant, and audit
- `apps/web/src/hooks/use-theme.spec.tsx` — New: 8 tests validating ThemeProvider defaults, cycling, localStorage persistence, .dark class application
