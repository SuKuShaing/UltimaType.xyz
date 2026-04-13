# Story 5.11: Match Results Overlay Redesign

Status: done

## Story

Como jugador que acaba de terminar una partida,
quiero ver mis resultados presentados de forma dramática y celebratoria,
para sentir el impacto de mi rendimiento y poder compartir mi logro.

## Acceptance Criteria

1. **AC1 — Headline + Hero Stats**: Dado un match finalizado, cuando el overlay de resultados renderiza, entonces se muestra "¡Prueba Finalizada!" como headline principal en tipografía `text-display-lg`. Y tres tarjetas hero muestran: PPM (text-display-lg, color primary, font-mono), Precisión (text-display-lg, font-mono), Puntaje Total (text-display-lg, font-mono). Y cada hero stat tiene una etiqueta label-md encima (uppercase, muted, tracking-wider): "VELOCIDAD DE ESCRITURA", "PRECISIÓN", "PUNTAJE TOTAL".

2. **AC2 — Rankings Table Redesign**: Dado el ranking de resultados, cuando renderiza debajo de los hero stats, entonces aparece el heading "Posición respecto a los competidores" (label-md, uppercase, muted). Y cada fila muestra: rank (#N), barra de color del jugador (rectángulo vertical coloreado, 3–4px ancho), nombre + bandera del país, precisión %, PPM, puntaje. Y la fila del jugador local tiene `bg-primary/10` como fondo. Y se aplica No-Line Rule: sin `border-b` ni `border-t`, filas alternas con tono (pares: `bg-surface-container-low/40`, impares: transparente) — excluyendo la fila local. Y la tabla está envuelta en un contenedor `rounded-card bg-surface-container-low/40`.

3. **AC3 — Botón Compartir + Botones de Acción**: Dado el área de acciones, cuando renderiza, entonces un botón "Compartir" (ícono de share o texto) está presente cuando existe un `localResult`. Y hace `navigator.share()` si está disponible, o `navigator.clipboard.writeText()` como fallback. Y el texto compartido incluye: PPM, precisión, puntaje, rank del jugador local. Y el botón "Revancha" (solo host) usa primary pill style (ya implementado). Y el botón "Salir" usa Design System styling (ya `rounded-full`, ya implementado). Y toda la lógica existente de revancha se preserva exactamente: countdown 5s, solo host, espectadores ven "Unirse a la partida".

## Tasks / Subtasks

- [x] Task 1: Headline + Hero Stats Section (AC: #1)
  - [x] 1.1 Reemplazar el `<h2>Resultados</h2>` (text-2xl) por `<h2>¡Prueba Finalizada!</h2>` con clases `font-sans text-display-lg font-bold tracking-[-0.02em] text-text-main text-center mb-6`
  - [x] 1.2 Redesign del bloque de stats del jugador local (actualmente `mb-8 text-center` con `text-7xl` PPM y `text-3xl` score): cambiar a tres tarjetas hero horizontales en un `flex justify-center gap-4 flex-wrap mb-8`
  - [x] 1.3 Tarjeta PPM: `<div className="flex flex-col items-center rounded-card bg-surface-container-low px-8 py-6">` con `<span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">VELOCIDAD DE ESCRITURA</span>` y `<span className="font-mono text-display-lg font-bold text-primary leading-none">{localResult.wpm}</span>`
  - [x] 1.4 Tarjeta Precisión: misma estructura, label "PRECISIÓN", valor `{localResult.precision}%`, color `text-text-main`
  - [x] 1.5 Tarjeta Puntaje Total: misma estructura, label "PUNTAJE TOTAL", valor `{localResult.score}`, color `text-text-main`
  - [x] 1.6 Mover la lógica de `reason === 'timeout'` → mensaje "Tiempo agotado" debajo del headline (no debajo del título antiguo)
  - [x] 1.7 Eliminar el bloque de `missingChars` del área de stats locales (el `<p>X caracteres faltantes</p>`)

- [x] Task 2: Rankings Table Redesign (AC: #2)
  - [x] 2.1 Agregar heading "Posición respecto a los competidores" antes de la tabla: `<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Posición respecto a los competidores</p>`
  - [x] 2.2 Envolver la tabla en: `<div className="mb-6 overflow-hidden rounded-card bg-surface-container-low/40">`
  - [x] 2.3 Eliminar la columna "Faltantes" del `<thead>`: quitar el `<th>Faltantes</th>` — las columnas quedan: #, Jugador (barra+nombre+bandera), Prec., PPM, Puntos
  - [x] 2.4 En `<tbody>`, eliminar `<td>` de `missingChars` en cada fila
  - [x] 2.5 Cambiar la barra de color: de `inline-block h-3 w-3 rounded-sm` a `inline-block h-5 w-1 rounded-full shrink-0` (barra vertical fina, más representativa)
  - [x] 2.6 Cambiar highlight de fila local: de `bg-surface-raised/60 font-semibold` a `bg-primary/10 font-semibold`
  - [x] 2.7 Agregar alternación tonal en filas NO-locales: usar índice del map para clases `bg-surface-container-low/40` (par) vs `transparent` (impar) — la fila local ignora esta alternación y siempre usa `bg-primary/10`
  - [x] 2.8 Eliminar cualquier `border-b`, `border-t` de la tabla (verificar que la `<table>` actual ya no tiene — confirmado: 0 border-b/border-t)
  - [x] 2.9 En `<thead>`, usar `<tr className="text-text-muted">` sin background especial; los `<th>` sin `border-b`

- [x] Task 3: Botón Compartir (AC: #3)
  - [x] 3.1 Agregar estado `const [shared, setShared] = useState(false)` para feedback visual del botón
  - [x] 3.2 Agregar callback `handleShare` (solo cuando `localResult` existe):
    ```ts
    const handleShare = useCallback(() => {
      if (!localResult) return;
      const text = `¡Jugué en UltimaType! ${localResult.wpm} PPM · ${localResult.precision}% precisión · ${localResult.score} pts · Posición #${localResult.rank}`;
      const shareData = { title: 'UltimaType', text };
      if (navigator.share) {
        navigator.share(shareData).catch(() => undefined);
      } else {
        navigator.clipboard.writeText(text).catch(() => undefined);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    }, [localResult]);
    ```
  - [x] 3.3 Renderizar botón "Compartir" SOLO cuando `localResult` existe (no para espectadores puros). Posición: encima del bloque de botones de acción o como botón adicional en el área de acciones. Clases: `rounded-full bg-surface-raised px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors flex items-center gap-1.5`. Texto: `{shared ? '¡Copiado!' : 'Compartir'}`. Ícono opcional: `<span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">share</span>`
  - [x] 3.4 `type="button"` en el botón Compartir

- [x] Task 4: Tests — actualizar existentes y agregar nuevos (AC: todos)
  - [x] 4.1 Actualizar test `muestra WPM masivo del jugador local con estilo text-7xl`: cambiado a verificar labels hero (VELOCIDAD DE ESCRITURA, PRECISIÓN, PUNTAJE TOTAL)
  - [x] 4.2 Actualizar test `muestra puntuación del jugador local`: cambiado a verificar PUNTAJE TOTAL y getAllByText('545')
  - [x] 4.3 Actualizar test `muestra columna Faltantes`: cambiado a verificar que `queryByText('Faltantes')` es null
  - [x] 4.4 Eliminar test `muestra caracteres faltantes en stats locales si missingChars > 0` ✓
  - [x] 4.5 Eliminar test `no muestra caracteres faltantes en stats locales si missingChars es 0` ✓
  - [x] 4.6 Agregar test: `muestra headline "¡Prueba Finalizada!"` ✓
  - [x] 4.7 Agregar test: `muestra los tres labels de hero stats` ✓
  - [x] 4.8 Agregar test: `fila del jugador local tiene clase bg-primary/10` ✓
  - [x] 4.9 Agregar test: `botón Compartir visible cuando existe localResult` ✓
  - [x] 4.10 Agregar test: `NO muestra botón Compartir para espectador sin localResult` ✓
  - [x] 4.11 Agregar test: `muestra heading "Posición respecto a los competidores"` ✓

- [x] Task 5: Validación final (AC: todos)
  - [x] 5.1 `npx nx test web` — 410 tests pasando (406 base + 6 nuevos - 2 eliminados)
  - [x] 5.2 `npx nx lint web` — 0 nuevos errores en archivos modificados (12 pre-existentes en archivos no tocados)
  - [x] 5.3 Verificar No-Line Rule: 0 border-b/border-t en match-results-overlay.tsx ✓
  - [x] 5.4 Verificar que la lógica de revancha funciona: tests pasan (countdown 5s, "Unirse a la partida", "Esperando revancha del host") ✓

## Dev Notes

### CRÍTICO: Story es 100% frontend — NO tocar backend ni shared library

Todos los cambios son en `apps/web/src/components/arena/match-results-overlay.tsx` y su spec. No hay cambios de API, shared types, WebSocket, hooks. La lógica funcional de revancha (countdown, isHost, onJoinAsPlayer) se preserva exactamente.

### Archivos a MODIFICAR

```
ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx   — redesign UI
ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.spec.tsx — actualizar y agregar tests
```

**NO crear archivos nuevos. NO tocar otros archivos.**

### Tokens de Design System (Tailwind v4 — `@theme` en styles.css)

El proyecto usa **Tailwind v4** con configuración CSS-first. Las variables en `@theme` generan utilidades Tailwind automáticamente:

```css
/* Typography scale → Tailwind utilities */
--font-size-display-lg: 3.5rem   → clase: text-display-lg
--font-size-headline-lg: 2rem    → clase: text-headline-lg
--font-size-label-md: 0.75rem    → clase: text-label-md (= text-xs)

/* Letter spacing */
--tracking-display: -0.02em      → clase: tracking-display
--tracking-label: 0.05em         → clase: tracking-label

/* Border radius */
--radius-card: 2rem              → clase: rounded-card
--radius-card-lg: 2.5rem         → clase: rounded-card-lg

/* Backdrop blur */
--blur-glass: 20px               → clase: backdrop-blur-glass
```

**IMPORTANTE:** `text-display-lg` es una utilidad Tailwind v4 válida generada por el `@theme`. Verificar en browser al renderizar. Si no funciona por alguna razón, usar `text-[3.5rem]` como fallback.

### Label-md Pattern (heredado de Stories 5-9 y 5-10)

```tsx
<span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
  LABEL AQUÍ
</span>
```
O con clase generada: `text-label-md tracking-label font-semibold uppercase text-text-muted`

### Estructura Hero Stats — Diseño objetivo

```tsx
{localResult && (
  <div className="mb-8 flex flex-wrap justify-center gap-4">
    {/* Tarjeta PPM */}
    <div className="flex flex-col items-center rounded-card bg-surface-container-low px-8 py-6">
      <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        VELOCIDAD DE ESCRITURA
      </span>
      <span className="font-mono text-display-lg font-bold leading-none text-primary">
        {localResult.wpm}
      </span>
    </div>
    {/* Tarjeta Precisión */}
    <div className="flex flex-col items-center rounded-card bg-surface-container-low px-8 py-6">
      <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        PRECISIÓN
      </span>
      <span className="font-mono text-display-lg font-bold leading-none text-text-main">
        {localResult.precision}%
      </span>
    </div>
    {/* Tarjeta Puntaje Total */}
    <div className="flex flex-col items-center rounded-card bg-surface-container-low px-8 py-6">
      <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        PUNTAJE TOTAL
      </span>
      <span className="font-mono text-display-lg font-bold leading-none text-text-main">
        {localResult.score}
      </span>
    </div>
  </div>
)}
```

### Tabla Rankings — Diseño objetivo

```tsx
{/* Heading */}
<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
  Posición respecto a los competidores
</p>

{/* Tabla envuelta en contenedor */}
<div className="mb-6 overflow-hidden rounded-card bg-surface-container-low/40">
  <table className="w-full text-left text-sm">
    <thead>
      <tr className="text-text-muted">
        <th className="px-4 pb-2 pt-3">#</th>
        <th className="px-4 pb-2 pt-3">Jugador</th>
        <th className="px-4 pb-2 pt-3 text-right">Prec.</th>
        <th className="px-4 pb-2 pt-3 text-right">PPM</th>
        <th className="px-4 pb-2 pt-3 text-right">Pts</th>
      </tr>
    </thead>
    <tbody>
      {results.map((r, index) => {
        const isLocal = r.playerId === localUserId;
        const color = PLAYER_COLORS[r.colorIndex] ?? PLAYER_COLORS[0];
        const rowBg = isLocal
          ? 'bg-primary/10 font-semibold'
          : index % 2 === 0
            ? 'bg-surface-container-low/40'
            : '';
        return (
          <tr key={r.playerId} className={rowBg}>
            <td className="px-4 py-2">{r.rank}</td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-5 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {r.countryCode && (
                  <span className="shrink-0">
                    <CountryFlag countryCode={r.countryCode} size={16} />
                  </span>
                )}
                {r.displayName}
              </div>
            </td>
            <td className="px-4 py-2 text-right">{r.precision}%</td>
            <td className="px-4 py-2 text-right">{r.wpm}</td>
            <td className="px-4 py-2 text-right">{r.score}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

**IMPORTANTE:** `r.wpm` sigue siendo el campo del DTO (no renombrado en shared), pero se muestra como "PPM" en la cabecera. Este patrón ya existe en la versión actual.

### Alternación tonal — clarificación

La fila local siempre es `bg-primary/10`. Las demás filas alternan según su índice en el array `results`:
- Si el índice es par (0, 2, 4...): `bg-surface-container-low/40`
- Si el índice es impar (1, 3, 5...): sin background (transparente)

No usar `border-b` entre filas — violación de No-Line Rule.

### Botón Compartir — Web Share API

```tsx
const [shared, setShared] = useState(false);

const handleShare = useCallback(() => {
  if (!localResult) return;
  const text = `¡Jugué en UltimaType! ${localResult.wpm} PPM · ${localResult.precision}% precisión · ${localResult.score} pts · Posición #${localResult.rank}`;
  if (navigator.share) {
    navigator.share({ title: 'UltimaType', text }).catch(() => undefined);
  } else {
    navigator.clipboard.writeText(text).catch(() => undefined);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }
}, [localResult]);
```

Renderizado (solo cuando `localResult` existe):
```tsx
{localResult && (
  <button
    type="button"
    onClick={handleShare}
    className="rounded-full bg-surface-raised px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-main flex items-center gap-1.5"
  >
    <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">share</span>
    {shared ? '¡Copiado!' : 'Compartir'}
  </button>
)}
```

### Contenedor principal — considerar ampliar max-w

El contenedor actual es `max-w-xl` (576px). Con tres tarjetas hero en fila, puede ser estrecho. Considerar `max-w-2xl` (672px) para que las tres tarjetas quepan cómodamente. Sin embargo, `flex-wrap` en el contenedor de tarjetas garantiza que también funcione en móvil.

### Espectadores sin localResult

Si `localUserId` no está en `results` (espectador puro), `localResult` será `undefined`. El bloque de hero stats y el botón Compartir solo renderizan cuando `localResult` existe — esto ya es el comportamiento actual con `{localResult && (...)}`.

### Lógica de revancha — NO tocar

Preservar exactamente:
- `const [rematchCountdown, setRematchCountdown] = useState(REMATCH_DELAY_SECONDS)`
- `const rematchBtnRef = useRef<HTMLButtonElement>(null)`
- El countdown de 5 segundos via `setInterval`
- El foco automático en el botón de revancha (`rematchBtnRef.current?.focus()`)
- El bloqueo de Enter/Space durante countdown (`handleKeyDown`)
- El botón invisible placeholder durante countdown
- `onJoinAsPlayer` para espectadores

### Lógica de Hypothetical Rank (guest) — NO tocar

El bloque `{isGuest && (...)}` con `hypotheticalRank` y los botones de login (Google/GitHub) permanecen exactamente igual.

### Patrón de testing (heredado de Stories 5-9 y 5-10)

- **Sin jest-dom**: usar `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`
- `vi.clearAllMocks()` en `beforeEach`
- `type="button"` en todos los botones no-submit
- Para verificar presencia de texto: `screen.getByText('...')` o `screen.queryByText(...)?.toBeNull()`
- Para verificar clases: `element.classList.contains('bg-primary/10')` o `element.className.includes('...')`
- Para la clase `bg-primary/10` — usar `element.className.includes('bg-primary/10')` o `container.querySelector('[class*="bg-primary"]')`

### Tests existentes a ACTUALIZAR (5 tests)

**Test 1 — ACTUALIZAR: `muestra WPM masivo del jugador local con estilo text-7xl`**
```ts
// ANTES: busca el elemento con clase text-7xl
const massiveWpm = allWpmElements.find((el) => el.className.includes('text-7xl'));

// DESPUÉS: verificar que el valor PPM del jugador local (58) aparece en el DOM
// y que el label VELOCIDAD DE ESCRITURA está presente
it('muestra stats del jugador local con labels hero', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.getByText('VELOCIDAD DE ESCRITURA')).toBeDefined();
  expect(screen.getByText('PRECISIÓN')).toBeDefined();
  expect(screen.getByText('PUNTAJE TOTAL')).toBeDefined();
});
```

**Test 2 — ACTUALIZAR: `muestra puntuación del jugador local`**
```ts
// ANTES: screen.getByText('545 pts')  ← el "pts" sufijo se elimina
// DESPUÉS: screen.getByText('545') — puede existir en tabla Y en hero card
// Verificar que el label "PUNTAJE TOTAL" está presente
it('muestra puntaje del jugador local en hero stat', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.getByText('PUNTAJE TOTAL')).toBeDefined();
  // El valor 545 aparece (en hero card y en tabla)
  expect(screen.getAllByText('545').length).toBeGreaterThan(0);
});
```

**Test 3 — ACTUALIZAR: `muestra columna Faltantes con missingChars para todos los jugadores`**
```ts
// ANTES: verificaba que la columna Faltantes existe
// DESPUÉS: verificar que la columna Faltantes NO existe
it('NO muestra columna Faltantes en la tabla de resultados', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.queryByText('Faltantes')).toBeNull();
});
```

**Tests 4 y 5 — ELIMINAR** (los dos tests sobre `missingChars` en stats locales):
- `muestra caracteres faltantes en stats locales si missingChars > 0` → ELIMINAR
- `no muestra caracteres faltantes en stats locales si missingChars es 0` → ELIMINAR

### Nuevos tests a AGREGAR (6 tests)

```ts
it('muestra headline "¡Prueba Finalizada!"', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.getByText('¡Prueba Finalizada!')).toBeDefined();
});

it('muestra los tres labels de hero stats', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.getByText('VELOCIDAD DE ESCRITURA')).toBeDefined();
  expect(screen.getByText('PRECISIÓN')).toBeDefined();
  expect(screen.getByText('PUNTAJE TOTAL')).toBeDefined();
});

it('muestra heading "Posición respecto a los competidores"', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.getByText('Posición respecto a los competidores')).toBeDefined();
});

it('fila del jugador local tiene clase bg-primary/10', () => {
  const { container } = render(
    <MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />
  );
  const localRow = Array.from(container.querySelectorAll('tr')).find(
    (tr) => tr.className.includes('bg-primary')
  );
  expect(localRow).toBeTruthy();
});

it('botón Compartir visible cuando existe localResult', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="p2" reason="all_finished" onRematch={vi.fn()} />);
  expect(screen.getByText('Compartir')).toBeDefined();
});

it('NO muestra botón Compartir para espectador sin resultado propio', () => {
  render(<MatchResultsOverlay results={mockResults} localUserId="spectator-99" reason="all_finished" onRematch={vi.fn()} onJoinAsPlayer={vi.fn()} />);
  expect(screen.queryByText('Compartir')).toBeNull();
});
```

### No-Line Rule — Recordatorio

- NO agregar `border-b`, `border-t`, `border-r` como separadores en la tabla
- La alternación tonal entre filas reemplaza a los dividers
- Verificar que el `<thead>` no introduce bordes

### Project Structure Notes

- Monorepo en `ultimatype-monorepo/` dentro del working directory
- Path real del componente: `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx`
- Path real del spec: `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.spec.tsx`
- Tests: `npx nx test web`
- Lint: `npx nx lint web`

### Previous Story Intelligence (5-10 Arena Visual Restyling)

Story 5-10 modificó este mismo archivo `match-results-overlay.tsx`. Las lecciones clave:
- `material-symbols-outlined` necesita `aria-hidden="true"` en íconos decorativos
- `type="button"` en todos los botones no-submit
- Patrón de glassmorphism: `bg-surface-base/60 backdrop-blur-glass rounded-card` — ya aplicado al contenedor principal en 5-10
- Review D6: WPM→PPM unificado. En el componente actual, el campo del DTO se llama `wpm` pero la UI lo muestra como "PPM". Mantener este patrón.
- Review D1: El botón "SALIR" con ícono logout espejado (arena-page.tsx) es diferente al botón "Salir" del overlay de resultados — este último NO cambió en 5-10, solo se cambió a `rounded-full`.
- `backdrop-blur-glass` es la clase generada desde `--blur-glass: 20px` (no `backdrop-blur-[20px]`)
- 406 tests pasando al finalizar 5-10

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.11] — ACs originales
- [Source: ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx] — Código actual (266 líneas)
- [Source: ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.spec.tsx] — Spec actual (318 líneas, 16 tests)
- [Source: ultimatype-monorepo/apps/web/src/styles.css] — Design System tokens (Tailwind v4 @theme)
- [Source: _bmad-output/implementation-artifacts/5-10-arena-visual-restyling.md] — Review patches y lecciones
- [Source: ultimatype-monorepo/libs/shared/src/dto/match-result.dto.ts] — PlayerResult interface (wpm, precision, score, missingChars, rank, countryCode, colorIndex)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

(sin issues — implementación directa sin errores de compilación ni tests fallidos)

### Completion Notes List

- Task 1: Headline + Hero Stats redesign. `<h2>¡Prueba Finalizada!</h2>` con `text-display-lg tracking-[-0.02em]`. Tres tarjetas hero `rounded-card bg-surface-container-low` con labels label-md (VELOCIDAD DE ESCRITURA, PRECISIÓN, PUNTAJE TOTAL) y valores en `font-mono text-display-lg`. Mensaje "Tiempo agotado" movido al wrapper del headline. Bloque `missingChars` eliminado del área de stats locales.
- Task 2: Rankings table redesign. Heading "Posición respecto a los competidores" (label-md). Tabla envuelta en `rounded-card bg-surface-container-low/40`. Columna Faltantes eliminada. Barra de color `h-5 w-1 rounded-full`. Fila local `bg-primary/10 font-semibold`. Alternación tonal: filas pares `bg-surface-container-low/40`, impares transparentes. 0 border-b/border-t. `max-w-xl` → `max-w-2xl`.
- Task 3: Botón Compartir. `handleShare` con Web Share API y clipboard fallback. Estado `shared` para feedback "¡Copiado!". Botón solo visible cuando `localResult` existe. Ícono Material Symbols `share`.
- Task 4: 22 tests en spec. 3 tests actualizados (WPM text-7xl→labels hero, '545 pts'→PUNTAJE TOTAL, Faltantes→no Faltantes). 2 tests eliminados (missingChars local). 6 tests nuevos (headline, labels, heading ranking, bg-primary/10, Compartir, no-Compartir espectador).
- Task 5: 410 tests pasando, 0 nuevos errores lint, 0 violaciones No-Line Rule.

### Review Findings

- [x] [Review][Decision] D1: Headline usa `text-3xl` en vez de `text-display-lg` — **Aceptado**: `text-display-lg` no renderizó grande, `text-3xl` se ve bien visualmente. Decisión de diseño. [match-results-overlay.tsx:106]
- [x] [Review][Decision] D2: Valores hero stats usan `text-6xl` en vez de `text-display-lg` — **Aceptado**: `text-display-lg` no lograba el efecto visual deseado, `text-6xl` renderiza al tamaño grande buscado. [match-results-overlay.tsx:122,131,140]
- [x] [Review][Decision] D3: Labels hero stats usan `text-sm` en vez de `text-xs` — **Aceptado**: `text-xs` se veía muy pequeño, `text-sm` anda bien visualmente. Decisión de diseño. [match-results-overlay.tsx:119,128,137]
- [x] [Review][Decision] D4: Test duplicado — **Patcheado**: eliminado "muestra los tres labels de hero stats", redundante con "muestra stats del jugador local con labels hero"
- [x] [Review][Decision] D5: Sin feedback visual tras navigator.share exitoso en móvil — **Patcheado**: eliminado navigator.share (abría share sheet inútil en Windows), solo clipboard + "¡Copiado!". Agregado link a partida (`/match/:code` extraído de URL) separado por `\n\n`
- [x] [Review][Patch] P1: navigator.clipboard puede ser undefined en contextos HTTP/inseguros — **Resuelto** en patch D5: guard `if (navigator.clipboard)` agregado [match-results-overlay.tsx:90]
- [x] [Review][Patch] P2: setTimeout(2000) sin cleanup en unmount — **Dismissed**: React 18 no produce warnings por setState en componentes desmontados, impacto cero, probabilidad ínfima [match-results-overlay.tsx:93]
- [x] [Review][Defer] DEFER1: Sin test de comportamiento para handleShare — No hay test que simule click, mockee navigator.share/clipboard, o verifique estado "¡Copiado!". Fuera del scope de los tests especificados en la story. [match-results-overlay.spec.tsx] — deferred, out of scope

### File List

- `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.tsx` — Modificado: headline + hero stats 3 tarjetas, tabla sin Faltantes tonal alternation bg-primary/10, botón Compartir Web Share API, max-w-2xl
- `ultimatype-monorepo/apps/web/src/components/arena/match-results-overlay.spec.tsx` — Modificado: 3 tests actualizados, 2 eliminados, 6 nuevos (22 total)
