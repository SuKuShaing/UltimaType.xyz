# Story 5.7: Player Profile & Ranking Card (Home)

Status: review

## Story

Como usuario autenticado,
quiero ver mi posición, puntaje y ranking en la pantalla principal,
para hacer seguimiento de mi progreso sin navegar a mi perfil.

## Acceptance Criteria

1. **AC1 — Usuario autenticado con historial**: Para usuarios autenticados con partidas jugadas, la sección muestra: avatar (o iniciales con fondo `bg-primary/10`), nombre como link a `/u/{user.slug}`, mejor puntaje en `font-mono text-primary`, y posición global como "Top X% Mundial". Consume `GET /api/leaderboard/position` (via `useLeaderboardPosition`). Incluye link "Ver mi perfil →" a `/u/{user.slug}`.

2. **AC2 — Sin historial de partidas**: Para usuarios autenticados donde `GET /api/leaderboard/position` retorna `null` (cero partidas jugadas), mostrar: avatar, nombre, y el mensaje "Juega tu primera partida para aparecer en el ranking" (misma copy que el widget de posición en `LeaderboardPage`).

3. **AC3 — CTA para no autenticados**: Para usuarios no autenticados (y sin carga pendiente), renderizar una tarjeta CTA con el mismo peso visual que la tarjeta autenticada: texto "Inicia sesión para ver tu ranking" y un botón "Ingresar con Google" que llama a `loginWithGoogle()` de `useAuth()`.

4. **AC4 — Estado de carga**: Durante la carga inicial del perfil (`isFetchingProfile`) o del ranking (`isPositionLoading`), mostrar un skeleton animado: círculo de avatar + línea de nombre + bloque de estadísticas (`animate-pulse rounded bg-surface-raised`).

5. **AC5 — Design System compliance**: Mantener `<section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">` sin cambios. No-Line Rule: sin `border` ni separadores 1px — usar tonal shifts. `font-sans` para nombres y labels, `font-mono` para puntajes. Avatar fallback: `bg-primary/10 text-primary` (no `bg-primary text-surface-base` — ese es para leaderboard externo).

## Tasks / Subtasks

- [x] Task 1: Implementar `PlayerProfileSection` (AC: #1–#5)
  - [x] 1.1 Modificar `apps/web/src/components/home/player-profile-section.tsx` — reemplazar placeholder
  - [x] 1.2 Importar `useAuth`, `useLeaderboardPosition`, `Link` (react-router-dom)
  - [x] 1.3 Llamar `useLeaderboardPosition({ level: null, period: 'all' })` — se deshabilita automáticamente si no autenticado (hook ya tiene `enabled: isAuthenticated`)
  - [x] 1.4 Calcular `isLoading = isFetchingProfile || (isAuthenticated && isPositionLoading)`
  - [x] 1.5 Renderizar skeleton si `isLoading` — ver patrón en Dev Notes
  - [x] 1.6 Renderizar CTA si `!isFetchingProfile && !isAuthenticated` — texto + botón Google
  - [x] 1.7 Renderizar estado sin historial si `isAuthenticated && !isLoading && position === null`
  - [x] 1.8 Renderizar tarjeta completa si `isAuthenticated && !isLoading && position !== null && position !== undefined`
  - [x] 1.9 Avatar: `user.avatarUrl` → `<img>` circular; fallback → `<span>` circular `bg-primary/10` con inicial
  - [x] 1.10 Nombre: `<Link to={'/u/' + user.slug}>` con `font-sans font-semibold text-text-main hover:text-primary`
  - [x] 1.11 Mejor puntaje: `position.bestScore.toLocaleString('es', { maximumFractionDigits: 1 })` en `font-mono text-primary`
  - [x] 1.12 Ranking: `"Top ${position.globalPercentile}% Mundial"` en `text-primary`
  - [x] 1.13 Link "Ver mi perfil →" como `<Link to={'/u/' + user.slug}>`

- [x] Task 2: Tests (AC: todos)
  - [x] 2.1 Crear `apps/web/src/components/home/player-profile-section.spec.tsx`
    - 31 tests: skeleton carga (auth loading), skeleton (position loading), CTA unauthenticated, estado sin historial, tarjeta completa (avatar imagen), tarjeta completa (avatar fallback iniciales), links correctos, puntaje en font-mono, botón Google llama loginWithGoogle, verificación de parámetros del hook
  - [x] 2.2 Actualizar `apps/web/src/components/home/home-page.spec.tsx`
    - Agregado mock de `useLeaderboardPosition`
    - Actualizado test `'PlayerProfileSection shows placeholder text'` → `'PlayerProfileSection shows login CTA for unauthenticated user'`

- [x] Task 3: Validación Final (AC: todos)
  - [x] 3.1 `npx nx lint web` — 0 nuevos errores en archivos de esta story (solo warnings pre-existentes: any en mocks, non-null assertions en tests)
  - [x] 3.2 `npx nx test web` — 380 tests pasando (+31 nuevos, base 349, sin regresiones)
  - [x] 3.3 `npx nx build web` — build limpio

## Dev Notes

### CRÍTICO: Story es 100% frontend — NO tocar backend ni shared library

Todos los endpoints necesarios existen desde Epic 4. `useLeaderboardPosition` y `useUserStats` ya están implementados. **Cero cambios en backend, shared, o hooks existentes.**

### Hook a usar: `useLeaderboardPosition` — NO crear nuevo hook

`useLeaderboardPosition` ya existe en `apps/web/src/hooks/use-leaderboard-position.ts`. Invocarlo con `{ level: null, period: 'all' }` para obtener la posición del usuario autenticado en todos los niveles históricamente.

```typescript
// apps/web/src/hooks/use-leaderboard-position.ts (EXISTENTE — no modificar)
export function useLeaderboardPosition({ level, period }: UseLeaderboardPositionParams) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', 'position', { level, period }],
    queryFn: () => apiClient<UserLeaderboardPositionDto | null>(`/leaderboard/position${...}`),
    enabled: isAuthenticated,   // ← ya se deshabilita si no autenticado
    staleTime: 5 * 60 * 1000,
  });
}
```

**Nota sobre `useUserStats`:** La spec menciona `GET /api/users/:id/stats` para el puntaje, pero `UserLeaderboardPositionDto` ya incluye `bestScore` directamente. **Usar solo `useLeaderboardPosition`** — evita una llamada HTTP extra y el hook existente de stats usa `fetch` raw en vez de `apiClient`.

### `UserLeaderboardPositionDto` — campos disponibles

```typescript
// libs/shared/src/dto/leaderboard.dto.ts
interface UserLeaderboardPositionDto {
  bestScore: number;           // ← usar este para el puntaje
  bestScoreMatchCode: string;
  bestScoreDate: string;
  globalRank: number;
  globalTotal: number;
  globalPercentile: number;    // ← usar este para "Top X% Mundial"
  countryRank: number | null;
  countryTotal: number | null;
  countryPercentile: number | null;
  countryCode: string | null;
}
// Retorna null si el usuario no tiene partidas registradas → AC2
```

### `UserProfile` — campos del usuario autenticado

```typescript
// libs/shared/src/types/user.ts
interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  slug: string;
  // ...
}
```

### Patrón de avatar para el home card

El card es el propio perfil del usuario autenticado (no una entry de leaderboard). Usar `bg-primary/10 text-primary` para el fallback (NO `bg-primary text-surface-base`, ese es para rows de leaderboard de otros usuarios):

```tsx
{user?.avatarUrl ? (
  <img
    src={user.avatarUrl}
    alt={user.displayName}
    className="h-10 w-10 rounded-full object-cover"
  />
) : (
  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
    {user?.displayName.charAt(0).toUpperCase()}
  </span>
)}
```

### Lógica de estados — 4 casos mutuamente excluyentes

```tsx
const { user, isAuthenticated, isFetchingProfile, loginWithGoogle } = useAuth();
const { data: position, isLoading: isPositionLoading } = useLeaderboardPosition({
  level: null,
  period: 'all',
});
const isLoading = isFetchingProfile || (isAuthenticated && isPositionLoading);

// Caso 1: Cargando
{isLoading && <SkeletonContent />}

// Caso 2: No autenticado (y ya terminó la carga de auth)
{!isFetchingProfile && !isAuthenticated && <CTAContent />}

// Caso 3: Autenticado, sin partidas (API retorna null)
{isAuthenticated && !isLoading && position === null && <NoHistoryContent />}

// Caso 4: Autenticado con historial
{isAuthenticated && !isLoading && position != null && <FullCardContent />}
```

### Skeleton de carga

```tsx
{isLoading && (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-surface-raised" />
      <div className="h-4 w-28 animate-pulse rounded bg-surface-raised" />
    </div>
    <div className="h-12 animate-pulse rounded-xl bg-surface-raised" />
    <div className="h-12 animate-pulse rounded-xl bg-surface-raised" />
  </div>
)}
```

### CTA para no autenticados — botón llama a `loginWithGoogle()`

Usar `loginWithGoogle()` de `useAuth()`. NO usar `<a href="/api/auth/google">` (eso es el patrón de public-profile-page). Mantener consistencia con `LoginModal`.

```tsx
{!isFetchingProfile && !isAuthenticated && (
  <div className="flex flex-col items-center gap-4 py-4 text-center">
    <p className="text-sm text-text-muted font-sans">
      Inicia sesión para ver tu ranking
    </p>
    <button
      type="button"
      onClick={loginWithGoogle}
      className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-surface-base font-sans"
    >
      Ingresar con Google
    </button>
  </div>
)}
```

### Estado sin historial (AC2)

```tsx
{isAuthenticated && !isLoading && position === null && (
  <div>
    <div className="mb-4 flex items-center gap-3">
      {/* avatar pattern */}
      <Link to={`/u/${user!.slug}`} className="text-sm font-semibold text-text-main hover:text-primary font-sans">
        {user!.displayName}
      </Link>
    </div>
    <p className="text-sm text-text-muted font-sans">
      Juega tu primera partida para aparecer en el ranking
    </p>
  </div>
)}
```

### Tarjeta completa con historial (AC1)

```tsx
{isAuthenticated && !isLoading && position != null && (
  <div>
    {/* avatar + nombre */}
    <div className="mb-4 flex items-center gap-3">
      {/* avatar pattern */}
      <Link to={`/u/${user!.slug}`} className="text-sm font-semibold text-text-main hover:text-primary font-sans">
        {user!.displayName}
      </Link>
    </div>

    {/* stats */}
    <div className="mb-4 space-y-2">
      <div className="rounded-xl bg-surface-raised p-3">
        <div className="text-xs uppercase tracking-wide text-text-muted font-sans">Mejor Puntaje</div>
        <div className="text-xl font-semibold text-primary font-mono">
          {position.bestScore.toLocaleString('es', { maximumFractionDigits: 1 })}
        </div>
      </div>
      <div className="rounded-xl bg-surface-raised p-3">
        <div className="text-xs uppercase tracking-wide text-text-muted font-sans">Ranking Mundial</div>
        <div className="text-xl font-semibold text-primary font-sans">
          Top {position.globalPercentile}% Mundial
        </div>
      </div>
    </div>

    {/* perfil link */}
    <Link
      to={`/u/${user!.slug}`}
      className="text-sm text-primary hover:underline font-sans"
    >
      Ver mi perfil →
    </Link>
  </div>
)}
```

### Formateo de puntaje — misma función que leaderboard

```typescript
// Inline en el componente (no importar de otro lado — evitar el defer W1 de 5-6)
position.bestScore.toLocaleString('es', { maximumFractionDigits: 1 })
```

### Estructura de la sección — NO cambiar clases del `<section>`

```tsx
// MANTENER EXACTAMENTE:
<section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">
  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
    Tu Perfil
  </h2>
  {/* estados */}
</section>
```

**El `col-span-12 lg:col-span-4` NO debe cambiar** — lo define el grid de `home-page.tsx`. El test `'PlayerProfileSection has correct responsive grid classes'` en `home-page.spec.tsx` verifica estas clases.

### Patrón de testing (heredado de Stories 5-2 al 5-6)

- **Sin jest-dom** — usar `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`
- `vi.clearAllMocks()` en `beforeEach`
- `type="button"` en todos los botones no-submit
- `setup()` helper con overrides vía `vi.fn()`

Mock de `useAuth`:
```typescript
vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function setup(authOverrides = {}, positionOverrides = {}) {
  mockUseAuth.mockReturnValue({
    user: undefined,
    isAuthenticated: false,
    isFetchingProfile: false,
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    ...authOverrides,
  });
  vi.mocked(useLeaderboardPosition).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...positionOverrides,
  } as any);
  return render(<PlayerProfileSection />);
}
```

Mock de `useLeaderboardPosition`:
```typescript
vi.mock('../../hooks/use-leaderboard-position', () => ({
  useLeaderboardPosition: vi.fn(),
}));
```

Mock de `Link`:
```typescript
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));
```

Fixtures:
```typescript
const mockUser = {
  id: 'user-1',
  provider: 'GOOGLE' as const,
  email: 'seba@test.com',
  displayName: 'Seba Dev',
  avatarUrl: 'https://example.com/avatar.jpg',
  countryCode: 'CL',
  slug: 'seba-dev',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  lastLoginAt: '2026-01-01',
};

const mockPosition = {
  bestScore: 1234.5,
  bestScoreMatchCode: 'ABC123',
  bestScoreDate: '2026-04-01',
  globalRank: 42,
  globalTotal: 500,
  globalPercentile: 8,
  countryRank: 3,
  countryTotal: 50,
  countryPercentile: 6,
  countryCode: 'CL',
};
```

### Actualización de `home-page.spec.tsx`

Agregar mock en el bloque de mocks de módulo al tope del archivo:
```typescript
vi.mock('../../hooks/use-leaderboard-position', () => ({
  useLeaderboardPosition: vi.fn(() => ({ data: undefined, isLoading: false })),
}));
```

Actualizar el test existente que chequeaba "Próximamente":
```typescript
// ANTES (a eliminar):
it('PlayerProfileSection shows placeholder text', () => {
  setup();
  const section = screen.getByText('Tu Perfil').closest('section');
  expect(section!.textContent).toContain('Próximamente');
});

// DESPUÉS:
it('PlayerProfileSection shows login CTA for unauthenticated user', () => {
  setup();  // default: isAuthenticated: false
  const section = screen.getByText('Tu Perfil').closest('section');
  expect(section!.textContent).toContain('Inicia sesión para ver tu ranking');
});
```

### Design System Tokens (desde Story 5-1)

```
bg-surface-sunken          → fondo exterior sección (NO cambiar)
bg-surface-raised          → skeleton, stat cards internas
bg-primary/10              → avatar fallback de perfil propio (NO bg-primary sólido)
text-primary               → puntaje, ranking, iniciales del avatar, links hover
text-text-main             → nombre del usuario
text-text-muted            → labels, mensaje sin historial
rounded-card               → 2rem border-radius (sección)
rounded-xl                 → tarjetas de stats internas
rounded-full               → avatar circular
font-sans                  → Space Grotesk (nombres, labels, botones)
font-mono                  → IBM Plex Mono (puntajes)
```

### Project Structure Notes

**Archivo a MODIFICAR:**
- `apps/web/src/components/home/player-profile-section.tsx` — reemplazar el placeholder "Próximamente"
- `apps/web/src/components/home/home-page.spec.tsx` — agregar mock `useLeaderboardPosition` + actualizar test placeholder

**Archivos a CREAR:**
- `apps/web/src/components/home/player-profile-section.spec.tsx` — tests del componente nuevo

**Archivos que NO cambian:**
- `apps/web/src/hooks/use-leaderboard-position.ts` — NO modificar
- `apps/web/src/hooks/use-user-stats.ts` — NO usar (no necesario)
- `apps/web/src/components/home/home-page.tsx` — NO modificar (grid sin cambios)
- `libs/shared/` — ningún cambio
- Backend — ningún cambio

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.7] — User story y ACs originales
- [Source: _bmad-output/implementation-artifacts/5-6-global-leaderboard-preview.md] — Patrones: testing, design tokens, estructura de sección, LoginModal-free CTA
- [Source: apps/web/src/hooks/use-leaderboard-position.ts] — Hook de posición (no modificar)
- [Source: apps/web/src/hooks/use-auth.ts] — Hook de auth: `user`, `isAuthenticated`, `isFetchingProfile`, `loginWithGoogle`
- [Source: apps/web/src/components/profile/public-profile-page.tsx#L347-L377] — Patrón de tarjetas de posición (diseño de referencia)
- [Source: apps/web/src/components/home/home-page.spec.tsx] — Tests existentes que se deben mantener pasando
- [Source: libs/shared/src/dto/leaderboard.dto.ts] — `UserLeaderboardPositionDto` (campos disponibles)
- [Source: libs/shared/src/types/user.ts] — `UserProfile` (campos del usuario)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- `npx nx test web --testFile=...` falla con "Unknown option" — vitest usa argumento posicional: `npx nx test web -- "player-profile-section"`.
- `npx nx test web -- "apps/web/src/..."` falla con "No test files found" — vitest busca por el patrón `include` del proyecto. Usar solo el nombre del archivo sin path completo.

### Completion Notes List

- Task 1: `PlayerProfileSection` completamente reemplazado. 4 estados mutuamente excluyentes: skeleton (auth+position loading), CTA con botón Google (`loginWithGoogle()`), sin historial (avatar+nombre+mensaje), tarjeta completa (avatar+nombre+bestScore+globalPercentile+Ver mi perfil). Avatar con `bg-primary/10` (propio perfil, no externo). `UserAvatar` extraído como función helper interna. `useLeaderboardPosition({level:null, period:'all'})` — reusa hook existente sin modificarlo.
- Task 2: 31 tests en `player-profile-section.spec.tsx` — todos los ACs cubiertos. `home-page.spec.tsx` actualizado: mock `useLeaderboardPosition` agregado, test placeholder reemplazado por verificación de CTA. home-page ahora tiene 24 tests (era 23 con el test de "Próximamente", se actualizó 1 test).
- Task 3: 380 tests pasando (+31). 0 nuevos errores de lint (warnings pre-existentes: `any` en mocks de test, non-null assertions en componente). Build limpio.

### File List

- `apps/web/src/components/home/player-profile-section.tsx` — Modificado: implementación completa (4 estados)
- `apps/web/src/components/home/player-profile-section.spec.tsx` — Creado: 31 tests
- `apps/web/src/components/home/home-page.spec.tsx` — Modificado: mock useLeaderboardPosition + test placeholder actualizado
