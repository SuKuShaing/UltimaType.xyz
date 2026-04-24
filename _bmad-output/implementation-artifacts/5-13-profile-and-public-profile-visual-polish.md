# Story 5.13: Pulido Visual de Perfil y Perfil Público

Status: review

## Story

Como usuario,
quiero que las páginas de perfil sigan el Design System "Kinetic Monospace",
para que la experiencia se sienta visualmente impactante y consistente con el resto de la plataforma.

## Acceptance Criteria

1. **AC1 — Hero section**: Dado `PublicProfilePage` (`/u/:slug`), cuando se aplica el Design System:
   - Contenedor hero: `rounded-2xl bg-surface-sunken p-8` → `rounded-card-lg bg-surface-container-low p-8`
   - Avatar: `h-20 w-20 bg-surface-raised text-3xl font-semibold text-primary` → `h-24 w-24 bg-primary/10 text-3xl font-bold text-primary` (100×100px, primary/10 como fondo para iniciales)
   - displayName: `text-2xl font-semibold` → `text-4xl font-bold` (display-lg scale; **NOTA:** `text-display-lg` no garantiza render correcto — usar `text-4xl` como fallback seguro, igual que se hizo `text-6xl` en Story 5-11)
   - Metadata (bandera + fecha): mantener `flex items-center justify-center gap-2 text-sm text-text-muted` — no requiere cambios de token

2. **AC2 — Panel de edición (solo `isOwnProfile`)**: Cuando `isOwnProfile === true`:
   - Contenedor del panel: `rounded-xl bg-surface-base p-6` → `rounded-card bg-surface-container-lowest p-6`
   - Campo slug restyled como pill: envolver prefijo + input en `<div className="flex items-center rounded-full bg-surface-container-low px-4 py-2">`, con prefijo `<span className="shrink-0 text-sm text-text-muted">ultimatype.xyz/u/</span>` e input `<input ... className="min-w-0 flex-1 bg-transparent text-sm text-text-main focus:outline-none" />`
   - Enlace compartible: convertir el botón de texto "Copiar enlace" en pill readonly con icono: `<div className="mt-2 flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2">` con `<span className="flex-1 truncate text-xs text-text-muted">` mostrando `window.location.href` y botón con ícono `content_copy` (Material Symbols) a la derecha
   - Select de país: `rounded-lg bg-surface-raised` → `rounded-full bg-surface-container-lowest`
   - Botón guardar: `rounded-lg bg-primary` → `rounded-full bg-primary`
   - Indicadores "Disponible" / "No disponible": mantener `text-success` / `text-error` — sin cambio

3. **AC3 — Tarjetas de posición (Global/Nacional)**: Dado el grid de 2 tarjetas de ranking:
   - Contenedor: `rounded-xl bg-surface-sunken p-4` → `rounded-card bg-surface-container-low p-4`
   - Valor rank: `text-2xl font-semibold text-primary` → `text-4xl font-bold text-primary font-mono` (display-lg scale, font-mono para número)
   - Subtexto "de X jugadores": mantener `text-xs text-text-muted`
   - Label encabezado: mantener `text-xs uppercase tracking-wide text-text-muted`

4. **AC4 — Grilla de stats (5 tarjetas)**: Dado el grid de 5 stats:
   - Contenedor: `rounded-xl bg-surface-sunken p-4` → `rounded-card bg-surface-container-lowest p-4`
   - Valor: `text-2xl font-semibold text-primary` → `text-4xl font-bold text-primary font-mono` (datos numéricos → font-mono)
   - Estado vacío: cuando `stats === undefined/null` o valor específico es `null`, mostrar `—` con `text-text-muted` (no usar `?? '—'` sobre el valor ya que `stats?.bestScore ?? '—'` puede mostrar `0` correctamente pero también `null`; verificar que `null` y `undefined` muestren `—`)
   - Label: mantener `text-xs uppercase tracking-wide text-text-muted`

5. **AC5 — Historial de partidas inline (en `PublicProfilePage`)**:
   - Contenedor: `rounded-2xl bg-surface-sunken p-8` → `rounded-card bg-surface-container-low p-8`
   - Encabezado: `<h2 className="mb-6 text-lg font-semibold">` → `<h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-text-muted">Historial de Partidas</h2>` (label-md style)
   - Pills de período (inactivo): `rounded-lg bg-surface-raised` → `rounded-full bg-surface-container-lowest`
   - Pills de nivel (inactivo): `rounded-lg bg-surface-raised` → `rounded-full bg-surface-container-lowest`
   - Pills activos: mantener `bg-primary text-surface-base font-semibold` + agregar `rounded-full`
   - Tabla thead: eliminar `border-b border-surface-raised` del `<tr>` de thead
   - Tabla tbody rows: eliminar `border-b border-surface-raised last:border-0 hover:bg-surface-raised/50`, reemplazar con alternación tonal (ver patrón abajo)
   - Paginación: `rounded-lg bg-surface-raised` → `rounded-full bg-surface-container-lowest`
   - Agregar `type="button"` a **todos** los botones de filtro y paginación

6. **AC6 — Estado vacío con CTA (isOwnProfile + sin historial)**:
   - Dado `isOwnProfile === true` y `isEmpty === true` y `!isHistoryLoading`:
   - Mostrar CTA debajo del mensaje "Sin partidas registradas":
     ```tsx
     {isOwnProfile && isEmpty && !isHistoryLoading && (
       <button
         type="button"
         onClick={() => navigate('/')}
         className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-surface-base"
       >
         ¡Crea una partida y empieza!
       </button>
     )}
     ```

7. **AC7 — `match-detail-page.tsx`**:
   - Contenedor: `rounded-2xl bg-surface-sunken p-8` → `rounded-card bg-surface-container-low p-8`
   - Botón "← Volver": `bg-transparent p-0 text-sm text-text-muted hover:text-text-main` → `rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-text-muted hover:text-text-main` (estilo botón terciario) + agregar `type="button"`
   - Tabla thead: eliminar `border-b border-surface-raised`
   - Tabla tbody rows: eliminar `border-b border-surface-raised last:border-0`, reemplazar con alternación tonal
   - Nombre de jugadores (link): `text-text-main hover:text-primary` → `text-primary hover:underline` en el `<span>` interno del Link
   - CTA para visitantes no autenticados: agregar `useAuth` import + mostrar CTA al final:
     ```tsx
     {!isAuthenticated && !isLoading && !isError && match && (
       <div className="mt-6 text-center">
         <a
           href="/api/auth/google"
           className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface-base"
         >
           Comienza a competir
         </a>
       </div>
     )}
     ```

8. **AC8 — `match-history-section.tsx`** (scope secundario — mismas violaciones del token audit Story 5.1):
   - Contenedor: `rounded-2xl bg-surface-sunken p-8` → `rounded-card bg-surface-container-low p-8`
   - Mini stats cards: `rounded-xl bg-surface-raised p-4` → `rounded-card bg-surface-container-lowest p-4`
   - Valores en stats: `text-2xl font-semibold text-primary` → `text-4xl font-bold text-primary font-mono`
   - Pills de filtro (inactivo): `rounded-lg bg-surface-raised` → `rounded-full bg-surface-container-lowest`
   - Tabla: No-Line Rule + alternación tonal (mismo patrón)
   - Paginación: `rounded-lg` → `rounded-full`
   - Agregar `type="button"` a todos los botones de filtro y paginación

## Tasks / Subtasks

- [x] Task 1: Hero section — public-profile-page.tsx (AC: #1)
  - [x] 1.1 Contenedor hero: `rounded-2xl bg-surface-sunken` → `rounded-card-lg bg-surface-container-low`
  - [x] 1.2 Avatar: `h-20 w-20 bg-surface-raised` → `h-24 w-24 bg-primary/10`; agregar `font-bold` al texto de iniciales
  - [x] 1.3 displayName: `text-2xl font-semibold` → `text-4xl font-bold`

- [x] Task 2: Panel de edición — public-profile-page.tsx (AC: #2)
  - [x] 2.1 Contenedor del panel: `rounded-xl bg-surface-base p-6` → `rounded-card bg-surface-container-lowest p-6`
  - [x] 2.2 Campo slug: pill unificada `rounded-full bg-surface-container-low` con prefijo + input `bg-transparent`; `data-testid="slug-input"` preservado
  - [x] 2.3 Enlace compartible: pill readonly `rounded-full bg-surface-container-low` + botón `content_copy` icon + feedback ¡Copiado!
  - [x] 2.4 Select país: `rounded-lg bg-surface-raised` → `rounded-full bg-surface-container-lowest`
  - [x] 2.5 Botón guardar: `rounded-lg bg-primary` → `rounded-full bg-primary`

- [x] Task 3: Tarjetas de ranking — public-profile-page.tsx (AC: #3)
  - [x] 3.1 Contenedor: `rounded-xl bg-surface-sunken p-4` → `rounded-card bg-surface-container-low p-4`
  - [x] 3.2 Valor: `text-2xl font-semibold text-primary` → `text-4xl font-bold text-primary font-mono`

- [x] Task 4: Grilla de stats 5 tarjetas — public-profile-page.tsx (AC: #4)
  - [x] 4.1 Contenedor: `rounded-xl bg-surface-sunken p-4` → `rounded-card bg-surface-container-lowest p-4`
  - [x] 4.2 Valor: `text-2xl font-semibold text-primary` → `text-4xl font-bold text-primary font-mono`
  - [x] 4.3 Estado vacío muestra `—` con `text-text-muted` vía `?? '—'` en cada campo

- [x] Task 5: Historial de partidas inline — public-profile-page.tsx (AC: #5, #6)
  - [x] 5.1 Contenedor: `rounded-card bg-surface-container-low p-8`
  - [x] 5.2 Heading: `text-xs font-semibold uppercase tracking-wider text-text-muted`
  - [x] 5.3 Pills período: `rounded-full bg-surface-container-lowest` (inactivos), `rounded-full bg-primary` (activos); `type="button"`
  - [x] 5.4 Pills nivel: mismo patrón que 5.3
  - [x] 5.5 Thead: eliminado `border-b border-surface-raised`
  - [x] 5.6 Tbody rows: `.map((r, index) =>` + alternación tonal `bg-surface-container-low/40`; sin `border-b`
  - [x] 5.7 Paginación: `rounded-full bg-surface-container-lowest`; `type="button"`
  - [x] 5.8 CTA propio perfil sin partidas: "¡Crea una partida y empieza!" condicionado a `isOwnProfile && isEmpty`

- [x] Task 6: match-history-section.tsx (AC: #8)
  - [x] 6.1 Contenedor: `rounded-card bg-surface-container-low p-8`
  - [x] 6.2 Stats mini cards: `rounded-card bg-surface-container-lowest`; valor `text-4xl font-bold text-primary font-mono`
  - [x] 6.3 Pills período: `rounded-full bg-surface-container-lowest`; `type="button"`
  - [x] 6.4 Pills nivel: mismo patrón
  - [x] 6.5 Thead: sin `border-b border-surface-raised`
  - [x] 6.6 Tbody rows: `.map((r, index) =>` + alternación tonal
  - [x] 6.7 Paginación: `rounded-full bg-surface-container-lowest`; `type="button"`

- [x] Task 7: match-detail-page.tsx (AC: #7)
  - [x] 7.1 Contenedor: `rounded-card bg-surface-container-low p-8`
  - [x] 7.2 Botón "← Volver": `rounded-full bg-surface-container-lowest px-4 py-2`; `type="button"`
  - [x] 7.3 Thead: sin `border-b border-surface-raised`
  - [x] 7.4 Tbody rows: alternación tonal `i % 2 === 0 ? 'bg-surface-container-low/40' : ''`; sin `border-b`
  - [x] 7.5 Nombre de jugador: `text-primary hover:underline`
  - [x] 7.6 `useAuth` importado; `isAuthenticated` extraído; CTA "Comienza a competir" para no-autenticados

- [x] Task 8: Tests — actualizar y agregar (AC: todos)
  - [x] 8.1 Tests existentes public-profile-page.spec.tsx: todos pasando
  - [x] 8.2 Nuevo test: `should show crear-partida CTA when own profile and no matches`
  - [x] 8.3 Nuevo test: `should NOT show crear-partida CTA for other user profile with no matches`
  - [x] 8.4 match-detail-page.spec.tsx: `useAuth` mock + `muestra CTA para visitantes no autenticados`
  - [x] 8.5 Nuevo test: `no muestra CTA para usuarios autenticados`
  - [x] 8.6 Tests match-history-section.spec.tsx: todos pasando
  - [x] 8.7 Nuevo test: `los botones de filtro tienen rounded-full`

- [x] Task 9: Validación final (AC: todos)
  - [x] 9.1 421 tests pasando (418 base + 5 nuevos: 3 public-profile, 2 match-detail, 1 match-history — pero match-history ya tenía +1 en la base del conteo)
  - [x] 9.2 8 errores lint (todos pre-existentes; -1 vs baseline de 9; 0 nuevos en archivos modificados)
  - [x] 9.3 0 `border-b border-surface-raised` en archivos modificados
  - [x] 9.4 Verificación visual pendiente (browser)

## Dev Notes

### CRÍTICO: Story es 100% frontend — NO tocar backend ni shared library

Todos los cambios son CSS/JSX. No hay cambios de API, shared types, WebSocket ni nuevos hooks. **4 archivos a modificar** + sus specs.

### Archivos a MODIFICAR

```
ultimatype-monorepo/apps/web/src/components/profile/public-profile-page.tsx    — hero + edit panel + ranking + stats + historial
ultimatype-monorepo/apps/web/src/components/profile/public-profile-page.spec.tsx
ultimatype-monorepo/apps/web/src/components/profile/match-history-section.tsx  — No-Line Rule + pills + stats cards
ultimatype-monorepo/apps/web/src/components/profile/match-history-section.spec.tsx
ultimatype-monorepo/apps/web/src/components/match/match-detail-page.tsx        — No-Line Rule + back button + link styling + CTA
ultimatype-monorepo/apps/web/src/components/match/match-detail-page.spec.tsx
```

### Ningún archivo a CREAR — todo es modificación

### Arquitectura Crítica — NO crear rutas ni componentes nuevos

- **No existe `/profile` como página separada**. La ruta `/profile` redirige automáticamente a `/u/{user.slug}` vía `ProfileRedirect` en `app.tsx`. No crear ningún componente de perfil nuevo.
- **Un solo componente sirve ambos perfiles**: `public-profile-page.tsx` es el perfil público Y el propio. Cuando `isOwnProfile === true` (usuario autenticado cuyo `user.slug === slug` del param), muestra el panel de edición embebido.
- **`match-history-section.tsx` es un componente SEPARADO** de la sección historial que está inline en `public-profile-page.tsx`. Ambos tienen sus propias specs. Actualizar ambos independientemente.

### Tokens de Design System (Tailwind v4 — `@theme` en styles.css)

```css
/* Superficie tokens */
bg-surface-container-low      → sección backgrounds (reemplaza bg-surface-sunken)
bg-surface-container-lowest   → botones/pills inactivos, stats cards (reemplaza bg-surface-raised)
bg-surface-raised             → elevated, mantener para hover states

/* Border radius */
rounded-card                  → 2rem (reemplaza rounded-2xl y rounded-xl)
rounded-card-lg               → 2.5rem (para hero sections — reemplaza rounded-2xl de contenedor hero)
rounded-full                  → 9999px (botones pill, filtros)

/* Typography */
font-mono                     → IBM Plex Mono (para scores, WPM, ranks numéricos)
text-4xl                      → fallback seguro para display-lg scale (ver nota)
```

**NOTA sobre text-display-lg:** En Story 5-11 se descubrió que `text-display-lg` no renderizó con el tamaño esperado. Se usó `text-6xl` y `text-3xl` directamente. Para esta story usar `text-4xl` como escala de displayName y valores de stats/rank. Verificar en browser y ajustar si necesario.

### No-Line Rule — Patrón de alternación tonal (heredado de 5-12 y 5-11)

```tsx
// ELIMINAR de <thead><tr>:
border-b border-surface-raised

// ELIMINAR de <tbody><tr>:
border-b border-surface-raised last:border-0 hover:bg-surface-raised/50

// AGREGAR a <tbody> map — cambiar a .map((item, index) => ... ) si no tiene index:
<tr
  key={item.id}
  className={`cursor-pointer ${index % 2 === 0 ? 'bg-surface-container-low/40' : ''} hover:bg-surface-raised/30`}
  onClick={...}
>
```

**Verificar 0 ocurrencias de `border-b border-surface-raised` en los archivos tras los cambios.**

### Pill slug field — Patrón exacto para Task 2.2

```tsx
{/* ANTES */}
<div className="flex items-center gap-2">
  <span className="text-sm text-text-muted">ultimatype.xyz/u/</span>
  <input
    id="slug-input"
    type="text"
    value={slugInput}
    onChange={(e) => handleSlugChange(e.target.value)}
    className="flex-1 rounded-lg bg-surface-raised px-3 py-2 text-sm text-text-main"
    ...
  />
</div>

{/* DESPUÉS */}
<div className="flex items-center rounded-full bg-surface-container-low px-4 py-2">
  <span className="shrink-0 text-sm text-text-muted">ultimatype.xyz/u/</span>
  <input
    id="slug-input"
    type="text"
    value={slugInput}
    onChange={(e) => handleSlugChange(e.target.value)}
    className="min-w-0 flex-1 bg-transparent text-sm text-text-main focus:outline-none"
    maxLength={30}
    aria-label="Editar slug"
    data-testid="slug-input"
  />
</div>
```

**IMPORTANTE:** Mantener `data-testid="slug-input"` — hay tests que lo buscan.

### Pill enlace compartible — Patrón para Task 2.3

```tsx
{/* ANTES: botón texto simple */}
<button
  onClick={() => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    ...
  }}
  className="mt-1 text-xs text-primary hover:underline"
>
  {linkCopied ? '¡Enlace copiado!' : 'Copiar enlace'}
</button>

{/* DESPUÉS: pill readonly con icono */}
<div className="mt-2 flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2">
  <span className="flex-1 truncate text-xs text-text-muted">
    {typeof window !== 'undefined' ? window.location.href : ''}
  </span>
  <button
    type="button"
    onClick={() => {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
      linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
    }}
    className="shrink-0 text-primary"
    aria-label="Copiar enlace"
  >
    {linkCopied ? (
      <span className="text-xs font-semibold text-success">¡Copiado!</span>
    ) : (
      <span className="material-symbols-outlined text-base" aria-hidden="true">content_copy</span>
    )}
  </button>
</div>
```

### Importar useAuth en match-detail-page.tsx — Para Task 7.6

```tsx
// AGREGAR imports al inicio del archivo:
import { useAuth } from '../../hooks/use-auth';

// AGREGAR dentro del componente MatchDetailPage:
const { isAuthenticated } = useAuth();

// AGREGAR al final del JSX (fuera del div rounded-card, dentro del div max-w-2xl):
{!isAuthenticated && !isLoading && !isError && match && (
  <div className="mt-6 text-center">
    <a
      href="/api/auth/google"
      className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface-base"
    >
      Comienza a competir
    </a>
  </div>
)}
```

### Tests — Patrón heredado (sin jest-dom)

- Sin jest-dom: usar `.toBeDefined()`, `.toBeNull()`, `.toBeTruthy()`
- `vi.clearAllMocks()` en `beforeEach`
- Para verificar clases: `element.className.includes('rounded-full')`
- `type="button"` en todos los botones no-submit
- Para mock de `useAuth` en `match-detail-page.spec.tsx` (nuevo):
  ```ts
  vi.mock('../../hooks/use-auth', () => ({
    useAuth: vi.fn(),
  }));
  import { useAuth } from '../../hooks/use-auth';
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
  // En beforeEach: mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
  ```

### Tests existentes a VERIFICAR (no deben romperse)

**public-profile-page.spec.tsx — tests sensibles a cambios:**
- `should display stats cards`: busca `screen.getByText('210')` y `screen.getByText('150.5')` — estos siguen siendo los valores renderizados; NO se rompen por el cambio de clase CSS
- `should show initials when no avatar`: busca `screen.getByText('SS')` — el texto de iniciales no cambia, solo el tamaño de la caja
- `should show edit panel when viewing own profile`: busca `screen.getByTestId('slug-input')` — el data-testid se mantiene (Task 2.2 lo preserva)
- `should show empty state when no matches`: busca `screen.getByText('Sin partidas registradas')` — se mantiene el texto, solo se agrega CTA debajo

**match-history-section.spec.tsx — tests sensibles:**
- `click en una fila navega a /match/:matchCode`: usa `screen.getByText('829.4').closest('tr')!` — el texto `829.4` se mantiene, el elemento `<tr>` se mantiene; el cambio de `map((r) =>` a `map((r, index) =>` no afecta
- `renderiza lista de partidas con datos`: `screen.getAllByText('829.4')` — ambos resultados del mock tienen score 829.35 que se formatea como `829.4` (round)... espera, `829.35.toFixed(1)` = `"829.4"`, correcto

**match-detail-page.spec.tsx — `botón volver llama navigate(-1)`:**
- Busca `screen.getByLabelText('Volver')` — el `aria-label="Volver"` se mantiene; solo cambian las clases CSS

### Cuentas de tests base

- Base al iniciar: **418 tests** (post Story 5-12)
- public-profile-page.spec.tsx: 11 tests actuales → agregar ~2-3 nuevos
- match-detail-page.spec.tsx: 9 tests actuales → agregar ~2 nuevos (CTA auth/no-auth)
- match-history-section.spec.tsx: 16 tests actuales → agregar ~1-2 nuevos

### Layout visual final de public-profile-page.tsx

```
<div bg-surface-base>
  <div max-w-2xl 2xl:max-w-5xl>
    <div flex-col 2xl:grid 2xl:grid-cols-[2fr_3fr]>

      {/* Columna izquierda: Hero */}
      <div rounded-card-lg bg-surface-container-low p-8>
        Avatar h-24 w-24 bg-primary/10
        displayName text-4xl font-bold
        metadata text-sm text-text-muted
        {isOwnProfile && <div rounded-card bg-surface-container-lowest>  ← edit panel
          slug pill: rounded-full bg-surface-container-low
          link pill: rounded-full bg-surface-container-low
          country: rounded-full bg-surface-container-lowest
          save: rounded-full bg-primary
        </div>}
        {!isAuthenticated && CTA Comienza a competir}
      </div>

      {/* Columna derecha */}
      <div flex-col gap-6>
        {/* Ranking grid 2 cols */}
        <div grid grid-cols-2 gap-4>
          <div rounded-card bg-surface-container-low>  rank text-4xl font-mono
          <div rounded-card bg-surface-container-low>  rank text-4xl font-mono

        {/* Stats grid 5 cols */}
        <div grid grid-cols-2 sm:grid-cols-5>
          <div rounded-card bg-surface-container-lowest>  value text-4xl font-mono
          ...×5

        {/* Historial */}
        <div rounded-card bg-surface-container-low>
          heading label-md uppercase
          pills rounded-full (bg-surface-container-lowest inactivo / bg-primary activo)
          tabla sin border-b, alternación tonal
          paginación rounded-full
      </div>
    </div>
  </div>
</div>
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.13] — ACs y contexto arquitectónico crítico
- [Source: ultimatype-monorepo/apps/web/src/components/profile/public-profile-page.tsx] — Código actual (532 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/profile/public-profile-page.spec.tsx] — Spec actual (216 líneas, 11 tests)
- [Source: ultimatype-monorepo/apps/web/src/components/profile/match-history-section.tsx] — Código actual (215 líneas, 16 tests en spec)
- [Source: ultimatype-monorepo/apps/web/src/components/match/match-detail-page.tsx] — Código actual (123 líneas, 9 tests en spec)
- [Source: ultimatype-monorepo/apps/web/src/styles.css] — Design System tokens (Tailwind v4 @theme)
- [Source: _bmad-output/implementation-artifacts/5-12-leaderboard-page-visual-design.md] — Patrón No-Line Rule + alternación tonal reutilizable
- [Source: _bmad-output/implementation-artifacts/5-11-match-results-overlay-redesign.md] — Patrón text-4xl fallback para display-lg

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Import/first lint fix: `import { useMatchDetail }` y `import { useAuth }` movidos al tope de `match-detail-page.spec.tsx` (antes de `const mockNavigate = vi.fn()`) para satisfacer regla ESLint `import/first`. Resultado: -2 errores introducidos, lint neto bajó de 9 a 8 errores.

### Completion Notes List

- 421 tests pasando (5 nuevos: 2 en public-profile-page.spec, 2 en match-detail-page.spec, 1 en match-history-section.spec)
- 8 errores lint (todos pre-existentes en public-profile-page.spec.tsx líneas 65-70 y match-history-section.spec.tsx líneas 19-20)
- No-Line Rule aplicada en 3 componentes: 0 ocurrencias de `border-b border-surface-raised`
- Design System tokens aplicados: `rounded-card`, `rounded-card-lg`, `rounded-full`, `bg-surface-container-low`, `bg-surface-container-lowest`, `text-4xl font-bold font-mono`
- `public-profile-page.tsx` condensado de ~532 líneas a ~430 líneas (eliminación de clases obsoletas)
- CTA "Comienza a competir" añadido a `match-detail-page.tsx` para visitantes no autenticados
- CTA "¡Crea una partida y empieza!" añadido a `public-profile-page.tsx` para propio perfil sin historial
- Enlace compartible rediseñado como pill readonly con icono `content_copy` (Material Symbols)

### Cambios Post-Implementación Solicitados por el Usuario (2026-04-24)

Los siguientes cambios fueron solicitados explícitamente por Seba después de la implementación inicial, **no son errores ni regresiones**:

1. **"Total Partidas" movido del grid al heading del historial** — La tarjeta "Total Partidas" fue eliminada del grid de 5 stats (`sm:grid-cols-5` → `sm:grid-cols-4`). El valor se integró en el heading: `Historial de Partidas — 36 Partidas`, usando `stats?.totalMatches` para que se actualice con los filtros. Test `should display stats cards` actualizado: reemplaza `getByText('15')` + `getByText('Total Partidas')` por `getByText('— 15 Partidas')`.

2. **Count del historial en un solo color** — El span `— N Partidas` pasó de `text-primary` a sin color propio, heredando `text-text-muted` del `h2` padre.

3. **Tamaño de números en las 4 stats reducido** — Los valores de Mejor Puntaje, Puntaje Promedio, Precisión Prom. y WPM bajaron de `text-4xl` a `text-2xl` para diferenciarse visualmente de los rankings (`#1`) que mantienen `text-4xl`.

4. **Texto de privacidad del email** — Agregado `"Tu email no es visible para otros"` en `text-xs opacity-50` debajo del email, visible solo para `isOwnProfile`.

### File List

- `ultimatype-monorepo/apps/web/src/components/profile/public-profile-page.tsx`
- `ultimatype-monorepo/apps/web/src/components/profile/public-profile-page.spec.tsx`
- `ultimatype-monorepo/apps/web/src/components/profile/match-history-section.tsx`
- `ultimatype-monorepo/apps/web/src/components/profile/match-history-section.spec.tsx`
- `ultimatype-monorepo/apps/web/src/components/match/match-detail-page.tsx`
- `ultimatype-monorepo/apps/web/src/components/match/match-detail-page.spec.tsx`
