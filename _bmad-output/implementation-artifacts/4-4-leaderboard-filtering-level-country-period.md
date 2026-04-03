# Story 4.4: Leaderboard Filtering — Nivel, País y Período

Status: done

## Story

As a competitive player,
I want to filter the leaderboard by difficulty level, country, and time period,
So that I can find my ranking among peers in my region, skill bracket, or recent performance window.

## Acceptance Criteria

### AC1: Filtro de período temporal

**Given** la página de Leaderboard (`/leaderboard`)
**When** el usuario selecciona un período
**Then** las opciones disponibles son: "Histórico" (`all`), "Último año" (`1y`), "Último mes" (`30d`), "Últimos 7 días" (`7d`)
**And** el leaderboard recalcula usando el mejor score (no WPM) dentro del período seleccionado
**And** el widget "Tu posición" también se actualiza con el período activo
**And** cambiar el período reinicia la paginación a página 1

### AC2: Filtro de país

**Given** la página de Leaderboard
**When** el usuario selecciona un país del dropdown
**Then** la tabla del leaderboard filtra mostrando solo jugadores de ese país
**And** cambiar el país reinicia la paginación a página 1
**And** la opción "Todos" muestra jugadores de todos los países

### AC3: Filtros combinados

**Given** la página de Leaderboard con múltiples filtros activos
**When** el usuario combina nivel + país + período
**Then** la tabla muestra los jugadores que cumplen TODOS los filtros simultáneamente
**And** el widget "Tu posición" refleja los filtros de nivel y período activos (no país — el widget ya muestra rank global y rank de país del usuario)

### AC4: Estado vacío contextual por filtro

**Given** la página de Leaderboard con filtros activos
**When** la combinación de filtros no arroja resultados
**Then** se muestra un mensaje vacío contextual que menciona el filtro(s) activo(s) relevante(s)

### AC5: Dedicated tab — ya satisfecho por Story 4.3

**Given** la página de Leaderboard
**When** el usuario navega a ella
**Then** se muestra en su propia ruta `/leaderboard` separada del dashboard de historial personal `/profile` — **este AC ya está satisfecho desde 4.3, no requiere trabajo adicional**

---

## Tasks / Subtasks

- [x] Task 1: Actualizar hook `useLeaderboard` para soportar filtro de país (AC: #2, #3)
  - [x] Agregar `country: string | null` al interface `UseLeaderboardParams`
  - [x] Incluir `country` en el `queryKey`: `['leaderboard', { level, period, country, page }]`
  - [x] Agregar `country` al URLSearchParams si no es null: `if (country) params.set('country', country)`
  - [x] Archivo: `apps/web/src/hooks/use-leaderboard.ts`

- [x] Task 2: Agregar filtro de período UI en `LeaderboardPage` (AC: #1, #3)
  - [x] Cambiar `const [period] = useState<MatchPeriod>('all')` a `const [period, setPeriod] = useState<MatchPeriod>('all')` (quitar el `= useState` de solo lectura actual)
  - [x] Agregar función `handlePeriodChange(p: MatchPeriod)` que setea period y resetea page a 1
  - [x] Agregar pills de período con las 4 opciones (mismo estilo que las pills de nivel):
    - "Histórico" → `'all'`, "Último año" → `'1y'`, "Último mes" → `'30d'`, "Últimos 7 días" → `'7d'`
  - [x] Archivo: `apps/web/src/components/leaderboard/leaderboard-page.tsx`

- [x] Task 3: Agregar filtro de país UI en `LeaderboardPage` (AC: #2, #3, #4)
  - [x] Agregar `const [country, setCountry] = useState<string | null>(null)`
  - [x] Agregar función `handleCountryChange(c: string | null)` que setea country y resetea page a 1
  - [x] Agregar `<select>` dropdown con lista de países de `COUNTRIES` + opción "Todos" (code null)
  - [x] Pasar `country` a `useLeaderboard({ level, period, country, page })`
  - [x] Actualizar empty state: si `country !== null` mostrar "No hay jugadores de [nombre] en este período/nivel"
  - [x] Archivo: `apps/web/src/components/leaderboard/leaderboard-page.tsx`

- [x] Task 4: Actualizar tests de `LeaderboardPage` (AC: #1, #2, #3, #4)
  - [x] Agregar test: cambio de período actualiza filtro y resetea página
  - [x] Agregar test: cambio de país actualiza filtro y resetea página
  - [x] Agregar test: filtros combinados (nivel + país) pasan correctamente al hook
  - [x] Agregar test: empty state con país activo muestra mensaje contextual
  - [x] Agregar test: período se refleja en el call de `useLeaderboard` y `useLeaderboardPosition`
  - [x] Archivo: `apps/web/src/components/leaderboard/leaderboard-page.spec.tsx`

### Review Findings

- [x] [Review][Patch] Empty state no menciona el período activo (AC4) — Agregado `PERIOD_LABELS` y suffix de período al `emptyMessage`. Todos los mensajes vacíos ahora incluyen el período activo cuando no es "Histórico". [leaderboard-page.tsx:62-68]
- [x] [Review][Patch] Sin test de los 3 filtros combinados (AC3) — Agregados 3 tests: período en empty state, triple filter empty state, y triple filter hook call. [leaderboard-page.spec.tsx]
- [x] [Review][Patch] `within(widget)` usa `.closest('div')!` frágil — Reemplazado con `data-testid="position-widget"` en el componente y `getByTestId` en el test. [leaderboard-page.tsx:83, leaderboard-page.spec.tsx:370]

---

## Dev Notes

### Contexto clave: el backend ya filtra por todos los params

**CRÍTICO:** El backend en 4.3 ya implementa correctamente el filtrado por `level`, `period`, y `country` en `GET /api/leaderboard`. El controller ya valida `country` con regex `/^[A-Z]{2}$/`. **Esta story es 100% frontend** — agregar los controles de UI de período y país, y actualizar el hook para pasar `country`.

No hay nada que cambiar en el backend (`leaderboard.service.ts`, `leaderboard.controller.ts`, `leaderboard.module.ts`).

### `useLeaderboard` — actualización mínima requerida

```typescript
// ANTES (apps/web/src/hooks/use-leaderboard.ts):
interface UseLeaderboardParams {
  level: number | null;
  period: MatchPeriod;
  page: number;
}
export function useLeaderboard({ level, period, page }: UseLeaderboardParams) {
  return useQuery({
    queryKey: ['leaderboard', { level, period, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      return apiClient<PaginatedResponse<LeaderboardEntryDto>>(`/leaderboard?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// DESPUÉS:
interface UseLeaderboardParams {
  level: number | null;
  period: MatchPeriod;
  country: string | null;   // <-- AGREGAR
  page: number;
}
export function useLeaderboard({ level, period, country, page }: UseLeaderboardParams) {
  return useQuery({
    queryKey: ['leaderboard', { level, period, country, page }],   // <-- agregar country
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (level !== null) params.set('level', String(level));
      if (period !== 'all') params.set('period', period);
      if (country) params.set('country', country);   // <-- AGREGAR
      return apiClient<PaginatedResponse<LeaderboardEntryDto>>(`/leaderboard?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

### `LeaderboardPage` — estado y handlers

```typescript
// Estado actualizado:
const [level, setLevel] = useState<number | null>(null);
const [period, setPeriod] = useState<MatchPeriod>('all');    // <-- ahora setPeriod activo
const [country, setCountry] = useState<string | null>(null); // <-- NUEVO
const [page, setPage] = useState(1);

function handleLevelChange(l: number | null) { setLevel(l); setPage(1); }
function handlePeriodChange(p: MatchPeriod) { setPeriod(p); setPage(1); }   // <-- NUEVO
function handleCountryChange(c: string | null) { setCountry(c); setPage(1); } // <-- NUEVO

// Hook call actualizado:
const { data: leaderboard, isLoading, isError, refetch } = useLeaderboard({ level, period, country, page });
const { data: position, isLoading: isPositionLoading } = useLeaderboardPosition({ level, period });
// Nota: useLeaderboardPosition NO recibe country (el widget ya muestra rank global y de país del usuario)
```

### Pills de período — misma clase CSS que level pills

```tsx
// Constante de opciones de período:
const PERIOD_OPTIONS: { label: string; value: MatchPeriod }[] = [
  { label: 'Histórico', value: 'all' },
  { label: 'Último año', value: '1y' },
  { label: 'Último mes', value: '30d' },
  { label: 'Últimos 7 días', value: '7d' },
];

// Render de pills (mismo estilo que level filter):
<div className="mb-4 flex flex-wrap gap-2">
  {PERIOD_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      onClick={() => handlePeriodChange(opt.value)}
      className={`rounded-lg px-3 py-1.5 text-sm font-sans ${
        period === opt.value
          ? 'bg-primary text-surface-base font-semibold'
          : 'bg-surface-raised text-text-muted'
      }`}
      aria-pressed={period === opt.value}
    >
      {opt.label}
    </button>
  ))}
</div>
```

### Country dropdown — usar `<select>` nativo

El proyecto NO tiene un componente Dropdown/Select de UI system. Usar `<select>` nativo estilizado con Tailwind:

```tsx
<select
  value={country ?? ''}
  onChange={(e) => handleCountryChange(e.target.value || null)}
  className="rounded-lg bg-surface-raised px-3 py-1.5 text-sm text-text-muted font-sans"
  aria-label="Filtrar por país"
>
  <option value="">Todos los países</option>
  {COUNTRIES.map((c) => (
    <option key={c.code} value={c.code}>{c.name}</option>
  ))}
</select>
```

`COUNTRIES` ya está importado en `leaderboard-page.tsx` (se usa en `getCountryName()`). No agregar importación duplicada.

### Empty state contextual — actualización

El empty state actual solo tiene `level !== null`. Actualizar para cubrir país también:

```tsx
// Si hay country activo, el mensaje debe mencionarlo:
const emptyMessage = (() => {
  if (level !== null && country !== null) {
    return `No hay jugadores de ${getCountryName(country)} registrados en este nivel`;
  }
  if (country !== null) {
    return `No hay jugadores de ${getCountryName(country)} registrados`;
  }
  if (level !== null) {
    return 'No hay jugadores registrados en este nivel';
  }
  return 'No hay jugadores registrados aún';
})();
```

### Posición en el layout de filtros

Ordenar los controles de filtro de arriba a abajo:
1. Pills de nivel (ya existentes)
2. Pills de período (nuevo)
3. Dropdown de país (nuevo)

O alternativamente agrupar en una sola fila si el ancho lo permite. Preferir legibilidad sobre compactación.

### Regresiones a prevenir

- **NO tocar** `leaderboard.controller.ts`, `leaderboard.service.ts`, `leaderboard.module.ts` — el backend ya funciona
- **NO tocar** `use-leaderboard-position.ts` — el hook de posición no necesita `country` (el widget muestra rank global y de país del user, no filtra por país)
- El test `'should change level filter and reset page'` ya existente verifica `expect.objectContaining({ level: 1, page: 1 })` — al agregar `country` al queryKey, el mock seguirá pasando porque usa `objectContaining`
- Los 15 tests existentes en `leaderboard-page.spec.tsx` deben seguir pasando — la firma de `useLeaderboard` cambia pero los mocks no se rompen porque el mock ignora params salvo donde se verifica explícitamente
- Al cambiar `const [period] = useState<MatchPeriod>('all')` a `const [period, setPeriod]`, TypeScript no romperá nada — solo se expone el setter que antes no se usaba

### Aprendizajes de Stories 4.1, 4.2, 4.3

- Pills con `aria-pressed` para accesibilidad (ya implementado para level — replicar para period)
- Loading: skeletons con `animate-pulse`
- Empty state contextual según filtro activo
- TanStack Query: `queryKey` debe incluir TODOS los parámetros que cambian la respuesta
- Pattern de resetear `page` a 1 en cualquier cambio de filtro (ya implementado en `handleLevelChange`)
- Tests de componente: `vi.mock` de hooks + `mockReturnValue` en cada test; usar `fireEvent.click` para pills

### Project Structure Notes

Solo 2 archivos a modificar:

```
apps/web/src/
├── hooks/
│   └── use-leaderboard.ts           <- MODIFICAR: agregar country al interface y queryKey
└── components/
    └── leaderboard/
        ├── leaderboard-page.tsx     <- MODIFICAR: agregar period pills + country dropdown + estado
        └── leaderboard-page.spec.tsx <- MODIFICAR: agregar tests nuevos
```

**Cero cambios en el backend. Cero nuevos archivos.**

### References

- [Source: _bmad-output/implementation-artifacts/4-3-global-leaderboard.md] — implementación base, hooks, componente, tests
- [Source: apps/web/src/components/leaderboard/leaderboard-page.tsx] — componente actual con level pills
- [Source: apps/web/src/hooks/use-leaderboard.ts] — hook actual a modificar
- [Source: apps/api/src/modules/leaderboard/leaderboard.controller.ts] — backend ya soporta level/period/country
- [Source: libs/shared/src/constants/countries.ts] — COUNTRIES constant con todos los países en español
- [Source: libs/shared/src/dto/match-result.dto.ts] — MatchPeriod type: `'7d' | '30d' | '1y' | 'all'`
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4] — ACs originales + nota re-scope 2026-03-31

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (create-story + dev-story, 2026-04-03)

### Debug Log References

### Completion Notes List

- Story 100% frontend — cero cambios en el backend.
- `useLeaderboard` actualizado: se agrega `country: string | null` al interface, queryKey y URLSearchParams.
- `LeaderboardPage` actualizado: constante `PERIOD_OPTIONS`, estado `period` ahora editable (era readonly), nuevo estado `country`, handlers `handlePeriodChange` + `handleCountryChange` con reset de page. Pills de período (4 opciones), dropdown de país con todos los países de `COUNTRIES`.
- `emptyMessage` calculado como IIFE con 4 casos: country+level, solo country, solo level, ninguno.
- Tests: 25 tests pasando (15 existentes + 10 nuevos). Se importó `within` de testing-library para fix del test de widget sin país. 290 API + 154 web = 444 total, sin regresiones.

### File List

- ultimatype-monorepo/apps/web/src/hooks/use-leaderboard.ts (modificado: agregar country al interface, queryKey y params)
- ultimatype-monorepo/apps/web/src/components/leaderboard/leaderboard-page.tsx (modificado: period pills, country dropdown, estado y handlers nuevos, emptyMessage contextual)
- ultimatype-monorepo/apps/web/src/components/leaderboard/leaderboard-page.spec.tsx (modificado: 10 tests nuevos, import within, fix test de widget sin país)
