# Story 5.6: Global Leaderboard Preview

Status: done

## Story

As a user,
I want to see a summary of the global leaderboard on the home page,
so that I'm motivated to compete and improve my ranking.

## Acceptance Criteria

1. **AC1 — Tabla Top 10**: La sección renderiza una tabla compacta con los top 10 jugadores consumiendo `GET /api/leaderboard?limit=10` (endpoint público, sin autenticación). Cada fila muestra: posición, avatar/iniciales, nombre, bandera de país, y mejor puntaje. La fila entera es un link a `/match/:bestScoreMatchCode` (stretched `<Link>`) para acceder al detalle de la partida con soporte nativo de nueva pestaña.

2. **AC2 — Toggle "Mundial" / "Mi país"**: Toggle visible solo cuando el usuario está autenticado Y `user.countryCode !== null`. "Mundial" (estado default): llama sin parámetro `country`. "Mi país": agrega `country=user.countryCode` a la query. Oculto cuando no autenticado o sin país.

3. **AC3 — Link de navegación**: Un link "Ver clasificación completa →" navega a `/leaderboard` (via `<Link>` de react-router-dom).

4. **AC4 — CTA para no autenticados**: Si el usuario no está autenticado, mostrar debajo de la tabla un CTA "Inicia sesión para competir" que abre `LoginModal`. No renderizar CTA si ya está autenticado.

5. **AC5 — Estado de carga**: Durante la carga inicial, mostrar 10 filas skeleton animadas (`h-10 animate-pulse rounded-lg bg-surface-raised`).

6. **AC6 — Estado vacío**: Si no hay jugadores, mostrar ícono Material Symbols `emoji_events` (`text-4xl text-text-muted`) + texto "No hay jugadores en el ranking aún". (Nota: nunca ocurrirá en producción.)

7. **AC7 — Design System compliance**: Mantener `<section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">` sin cambios. No-Line Rule: sin `border` ni separadores 1px — usar tonal shifts (`hover:bg-surface-raised/50`). `font-sans` para nombres, `font-mono` para puntajes.

## Tasks / Subtasks

- [x] Task 1: Crear hook `useLeaderboardPreview` (AC: #1, #2)
  - [x] 1.1 Crear `apps/web/src/hooks/use-leaderboard-preview.ts`
  - [x] 1.2 El hook recibe `{ country: string | null }` como param
  - [x] 1.3 `useQuery({ queryKey: ['leaderboard-preview', { country }], queryFn: ..., staleTime: 60_000 })` — llama a `GET /api/leaderboard?limit=5` con `country` opcional
  - [x] 1.4 Retorna `PaginatedResponse<LeaderboardEntryDto>` (el endpoint siempre retorna paginado)

- [x] Task 2: Implementar `LeaderboardPreviewSection` (AC: #1–#7)
  - [x] 2.1 Reemplazar el placeholder en `apps/web/src/components/home/leaderboard-preview-section.tsx`
  - [x] 2.2 Importar `useAuth`, `useLeaderboardPreview`, `CountryFlag`, `LoginModal`, `Link` (react-router-dom), `useState`
  - [x] 2.3 Estado local: `showMyCountry: boolean` (default `false`) y `showLogin: boolean` (default `false`)
  - [x] 2.4 Computar `country = showMyCountry && user?.countryCode ? user.countryCode : null`
  - [x] 2.5 Llamar `useLeaderboardPreview({ country })`
  - [x] 2.6 Toggle "Mundial" / "Mi País": dos botones pill, visible solo si `isAuthenticated && user?.countryCode`
  - [x] 2.7 Tabla con filas de `LeaderboardEntryDto`: posición, avatar/iniciales, nombre (Link `/u/:slug`), `CountryFlag`, puntaje formateado
  - [x] 2.8 Avatar pattern: `entry.avatarUrl` → `<img>` circular; fallback → `<span>` circular `bg-primary` con inicial (igual que leaderboard-page.tsx)
  - [x] 2.9 Puntaje: `entry.bestScore.toLocaleString('es', { maximumFractionDigits: 1 })` en `font-mono text-primary`
  - [x] 2.10 Link "Ver clasificación completa →" como `<Link to="/leaderboard">` debajo de la tabla
  - [x] 2.11 CTA unauthenticated: `<button>` "Inicia sesión para competir" que setea `showLogin(true)` + `<LoginModal>`

- [x] Task 3: Tests (AC: todos)
  - [x] 3.1 Crear `apps/web/src/components/home/leaderboard-preview-section.spec.tsx`
    - 23 tests: skeleton carga, tabla con jugadores, links, toggle, CTA, estado vacío
    - Actualizado `home-page.spec.tsx`: mock de `useLeaderboardPreview` + CountryFlag, test placeholder → link

- [x] Task 4: Validación Final (AC: todos)
  - [x] 4.1 `npx nx lint web` — 0 nuevos errores en archivos de esta story (errores pre-existentes en leaderboard-page.spec.tsx y match-history-section.spec.tsx)
  - [x] 4.2 `npx nx test web` — 348 tests pasando (+31 nuevos, sin regresiones)
  - [x] 4.3 `npx nx build web` — build limpio

## Dev Notes

### CRÍTICO: Story es 100% frontend — NO tocar backend ni shared library

El endpoint `GET /api/leaderboard` fue entregado en Epic 4. `LeaderboardEntryDto` ya existe en `libs/shared`. **Cero cambios en backend o shared.**

### Hook `useLeaderboardPreview` — NO modificar `useLeaderboard` existente

`useLeaderboard` (en `apps/web/src/hooks/use-leaderboard.ts`) tiene `limit: '100'` hardcodeado y sirve la página completa. Para el preview crear un hook **nuevo** y **separado**:

```typescript
// apps/web/src/hooks/use-leaderboard-preview.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { PaginatedResponse, LeaderboardEntryDto } from '@ultimatype-monorepo/shared';

interface UseLeaderboardPreviewParams {
  country: string | null;
}

export function useLeaderboardPreview({ country }: UseLeaderboardPreviewParams) {
  return useQuery({
    queryKey: ['leaderboard-preview', { country }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '5' });
      if (country) params.set('country', country);
      return apiClient<PaginatedResponse<LeaderboardEntryDto>>(`/leaderboard?${params.toString()}`);
    },
    staleTime: 60_000, // 1 minuto — más agresivo que la página completa (5 min)
  });
}
```

### CountryFlag — componente existente, no recrear

`apps/web/src/components/ui/country-flag.tsx` — importar directamente:
```tsx
import { CountryFlag } from '../ui/country-flag';
// Uso: <CountryFlag countryCode={entry.countryCode} size={16} />
```

### Patrón de avatar — copiar de `leaderboard-page.tsx`

```tsx
{entry.avatarUrl ? (
  <img
    src={entry.avatarUrl}
    alt={entry.displayName}
    className="h-6 w-6 rounded-full object-cover"
  />
) : (
  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-surface-base">
    {entry.displayName.charAt(0).toUpperCase()}
  </span>
)}
```

### Toggle "Mundial" / "Mi país" — patrón de pills

Visible solo si `isAuthenticated && user?.countryCode`:
```tsx
<div className="flex gap-2 mb-4">
  <button
    type="button"
    onClick={() => setShowMyCountry(false)}
    className={`rounded-lg px-3 py-1 text-xs font-sans ${
      !showMyCountry
        ? 'bg-primary text-surface-base font-semibold'
        : 'bg-surface-raised text-text-muted'
    }`}
    aria-pressed={!showMyCountry}
  >
    Mundial
  </button>
  <button
    type="button"
    onClick={() => setShowMyCountry(true)}
    className={`rounded-lg px-3 py-1 text-xs font-sans ${
      showMyCountry
        ? 'bg-primary text-surface-base font-semibold'
        : 'bg-surface-raised text-text-muted'
    }`}
    aria-pressed={showMyCountry}
  >
    Mi país
  </button>
</div>
```

### Lógica del country derivado

```tsx
const country = showMyCountry && user?.countryCode ? user.countryCode : null;
const { data, isLoading } = useLeaderboardPreview({ country });
const entries = data?.data ?? [];
```

### LoginModal — mismo patrón que story 5-5

```tsx
import { LoginModal } from '../ui/login-modal';

const [showLogin, setShowLogin] = useState(false);

// CTA:
{!isAuthenticated && (
  <>
    <button
      type="button"
      onClick={() => setShowLogin(true)}
      className="mt-4 text-sm text-text-muted hover:text-primary font-sans"
    >
      Inicia sesión para competir
    </button>
    {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
  </>
)}
```

### Formateo de puntaje — misma función que leaderboard-page.tsx

```typescript
function formatScore(score: number): string {
  return score.toLocaleString('es', { maximumFractionDigits: 1 });
}
```

### Skeleton de carga — 5 filas

```tsx
{isLoading && (
  <div className="space-y-3 py-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-raised" />
    ))}
  </div>
)}
```

### Estructura completa del componente

```tsx
// MANTENER EXACTAMENTE:
<section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">
  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
    Clasificación Global
  </h2>
  {/* toggle, tabla/skeleton/vacío, link, CTA */}
</section>
```

**El `col-span-12 lg:col-span-8` y `bg-surface-sunken` NO deben cambiar** — lo define el grid de `home-page.tsx`.

### Patrón de testing heredado (Stories 5-2 al 5-5)

- **Sin jest-dom** — usar `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`
- `vi.clearAllMocks()` en `beforeEach`
- Mock de react-router-dom: `Link` renderizado como anchor real o mocked
- `type="button"` en todos los botones no-submit
- `setup()` helper con `vi.fn()` overrides

Mock del hook:
```typescript
vi.mock('../../hooks/use-leaderboard-preview', () => ({
  useLeaderboardPreview: vi.fn(),
}));

// En cada test:
const { useLeaderboardPreview } = await import('../../hooks/use-leaderboard-preview');
vi.mocked(useLeaderboardPreview).mockReturnValue({
  data: { data: [/* fixtures */], meta: { total: 5, page: 1, limit: 5, totalPages: 1 } },
  isLoading: false,
  isError: false,
} as any);
```

Fixture para una entrada:
```typescript
const mockEntry: LeaderboardEntryDto = {
  userId: 'user-1',
  position: 1,
  displayName: 'TestPlayer',
  avatarUrl: null,
  countryCode: 'CL',
  slug: 'testplayer',
  bestScore: 1234.5,
  bestScoreLevel: 3,
  bestScorePrecision: 98,
  bestScoreMatchCode: 'ABC123',
};
```

Mock de `CountryFlag` (componente de terceros, mockear para tests):
```typescript
vi.mock('../ui/country-flag', () => ({
  CountryFlag: ({ countryCode }: { countryCode: string | null }) =>
    countryCode ? <span data-testid={`flag-${countryCode}`} /> : null,
}));
```

### Design System Tokens (desde Story 5-1)

```
bg-surface-sunken          → fondo exterior sección (NO cambiar)
bg-surface-raised          → skeleton, botones inactivos, hover rows
bg-primary                 → botón activo toggle, puntaje, avatar fallback
text-text-main             → nombres de jugadores
text-text-muted            → labels, posición
rounded-card               → 2rem border-radius
rounded-lg                 → 0.5rem para pills y skeleton
font-sans                  → Space Grotesk (nombres, labels)
font-mono                  → IBM Plex Mono (puntajes)
hover:bg-surface-raised/50 → hover en filas de tabla (No-Line Rule)
```

### Project Structure Notes

**Archivo a MODIFICAR:**
- `apps/web/src/components/home/leaderboard-preview-section.tsx` — reemplazar placeholder

**Archivos a CREAR:**
- `apps/web/src/hooks/use-leaderboard-preview.ts` — hook dedicado
- `apps/web/src/components/home/leaderboard-preview-section.spec.tsx` — tests

**Archivos que NO cambian:**
- `apps/web/src/hooks/use-leaderboard.ts` — NO modificar (sirve la página completa)
- `apps/web/src/components/home/home-page.tsx` — NO modificar (grid sin cambios)
- `libs/shared/` — ningún cambio
- Backend — ningún cambio

**Archivos modificados fuera de scope original (aceptado en review):**
- `apps/web/src/components/leaderboard/leaderboard-page.tsx` — consistencia: mismo patrón stretched `<Link>` fila→match que el preview
- `apps/web/src/components/leaderboard/leaderboard-page.spec.tsx` — tests actualizados para el nuevo patrón

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.6] — User story y ACs originales
- [Source: _bmad-output/implementation-artifacts/5-5-partidas-en-vivo.md] — Patrones: polling hook, design tokens, testing, LoginModal CTA
- [Source: apps/web/src/components/leaderboard/leaderboard-page.tsx] — Patrones de avatar, CountryFlag, formatScore, tabla HTML
- [Source: apps/web/src/hooks/use-leaderboard.ts] — API del hook existente (NO modificar)
- [Source: apps/web/src/components/ui/country-flag.tsx] — Componente CountryFlag
- [Source: libs/shared/src/dto/leaderboard.dto.ts] — LeaderboardEntryDto, PaginatedResponse
- [Source: libs/shared/src/types/user.ts] — UserProfile.countryCode para toggle Mi país

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Tests `muestra el puntaje formateado en font-mono` fallaban con regex `/1\.234/` — jsdom no aplica locale de miles. Corregido con `container.querySelectorAll('.font-mono')`.
- Tests `muestra CountryFlag cuando el jugador tiene countryCode` fallaban con `getByTestId` porque múltiples entradas tienen `countryCode: 'CL'`. Corregido con `getAllByTestId`.
- `home-page.spec.tsx` fallaba con "No QueryClient set" — `LeaderboardPreviewSection` ahora usa `useQuery`. Corregido mockeando `useLeaderboardPreview` y `CountryFlag` en ese archivo.
- El test `LeaderboardPreviewSection shows placeholder text` en home-page era obsoleto (la sección ya no dice "Próximamente"). Actualizado a `Ver clasificación completa`.

### Completion Notes List

- Task 1: Hook `useLeaderboardPreview` creado con `queryKey: ['leaderboard-preview', { country }]`, `limit=5`, `staleTime: 60_000`. No modifica el hook `useLeaderboard` existente.
- Task 2: `LeaderboardPreviewSection` completamente reemplazado. Toggle "Mundial/Mi país" (visible solo con `isAuthenticated && user.countryCode`). Tabla top-5 con avatar/iniciales, `CountryFlag`, link a `/u/:slug`, puntaje `font-mono`. Link "Ver clasificación completa →". CTA "Inicia sesión para competir" con `LoginModal`.
- Task 3: 23 tests en `leaderboard-preview-section.spec.tsx`. `home-page.spec.tsx` actualizado (mock de `useLeaderboardPreview` + `CountryFlag`, test placeholder obsoleto reemplazado).
- Task 4: 348 tests pasando (+31 nuevos vs 317 base). 0 nuevos errores de lint en archivos de la story. Build limpio.

### Review Findings

- [x] [Review][Decision] D1: Limit 10 vs spec's limit 5 — RESUELTO: mantener 10, spec AC1/AC5 actualizados
- [x] [Review][Decision] D2: Nombres no linkeados a `/u/:slug` — RESUELTO: fila→match es intencional, spec AC1 actualizado. Patrón `<tr onClick>` reemplazado por stretched `<Link>` nativo (a11y + nueva pestaña)
- [x] [Review][Decision] D3: Cambios fuera de scope en `leaderboard-page.tsx` — RESUELTO: aceptado, spec actualizado. Consistencia UX entre preview y leaderboard completo
- [x] [Review][Patch] P1: Sin estado de error — APLICADO: `isError` chequeado, muestra "Error al cargar el ranking"
- [x] [Review][Patch] P2: LoginModal stale `showLogin` — APLICADO: useEffect resetea showLogin al autenticarse
- [x] [Review][Patch] P3: Ambos menús abiertos simultáneamente en mobile — APLICADO: toggles mutuamente excluyentes
- [x] [Review][Defer] W1: `formatScore` duplicado entre `leaderboard-page.tsx` y `leaderboard-preview-section.tsx` — deferred, pre-existing
- [x] [Review][Defer] W2: Avatar dropdown sin WAI-ARIA focus management completo — deferred, pre-existing (hotfix scope)

### File List

- `apps/web/src/hooks/use-leaderboard-preview.ts` — Creado
- `apps/web/src/components/home/leaderboard-preview-section.tsx` — Modificado: implementación completa
- `apps/web/src/components/home/leaderboard-preview-section.spec.tsx` — Creado: 23 tests
- `apps/web/src/components/home/home-page.spec.tsx` — Modificado: mock useLeaderboardPreview + CountryFlag, test placeholder actualizado
