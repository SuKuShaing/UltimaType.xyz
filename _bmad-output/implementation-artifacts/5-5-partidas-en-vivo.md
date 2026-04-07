# Story 5.5: Partidas en Vivo (Backend + Frontend)

Status: done

## Story

As a user,
I want to see matches currently being played on the home page,
so that I can feel the competitive energy and optionally spectate live matches.

## Acceptance Criteria

1. **AC1 — Endpoint público `GET /rooms/active`**: El backend expone `GET /rooms/active` (sin autenticación) que retorna rooms con `status === 'waiting'` o `status === 'playing'`. Limitado a 10 rooms. Sin rooms activos retorna `{ rooms: [] }`.

2. **AC2 — Redis Set para tracking de rooms activos**: `RoomsService` mantiene el Redis Set `active:rooms`. Se agrega el código en `createRoom()`. Se elimina en `setRoomStatus(code, 'finished')` y cuando el room queda sin jugadores en `leaveRoom()`. El método `getActiveRoomCodes()` limpia stale entries (rooms null o finished) antes de retornar.

3. **AC3 — Payload de respuesta**: Cada room en la respuesta incluye: `code`, `status`, `level`, `playerCount`, y hasta 4 `players` con `{ displayName, colorIndex, avatarUrl, position? }`. Cuando `status === 'playing'`: incluye además `startedAt` (ISO string) y `textLength` (número).

4. **AC4 — Polling frontend cada 4 segundos**: `LiveMatchesSection` usa `useActiveRooms()` hook (React Query, `refetchInterval: 4000`, `staleTime: 3000`) que llama a `GET /api/rooms/active`.

5. **AC5 — Tarjetas de partida en vivo**: Por cada room activo se renderiza una tarjeta `bg-surface-container-low rounded-card p-4` con: header (nivel de dificultad, cuenta de jugadores, tiempo transcurrido si está jugando) + mini-leaderboard de hasta 4 jugadores + botón "Observar".

6. **AC6 — Filas del mini-leaderboard**: Cada fila muestra: punto de color circular 8×8px (`PLAYER_COLORS[colorIndex]`), nombre del jugador (truncado), WPM estimado (`Math.min(Math.round((position / 5) / elapsedMinutes), 500)` — solo si `status === 'playing'` y `elapsedMinutes > 0`), y barra de progreso compacta 4px height (`position / textLength * 100%`, `rounded-full`, track `bg-surface-raised`, fill `bg-primary`).

7. **AC7 — Estado vacío**: Sin rooms activos se muestra: ícono Material Symbols `sports_esports` (`text-4xl text-text-muted`), texto "No hay partidas en vivo" con subtítulo "¡Crea una partida y sé el primero!", y botón "Crear partida" que — si autenticado — hace `POST /rooms` y navega a `/room/:code`; si no autenticado — guarda `localStorage.returnAfterLogin` y abre `LoginModal`.

8. **AC8 — Botón "Observar"**: Navega a `/room/:code` via `useNavigate`. Sin requisito de autenticación.

9. **AC9 — Design System compliance**: Contenedor exterior `<section className="col-span-12 lg:col-span-4 rounded-card bg-surface-sunken p-6">` y `<h2>` con "PARTIDAS EN VIVO" sin cambios. Tarjetas internas usan `bg-surface-container-low` sin bordes 1px (No-Line Rule). `font-sans` para nombres/labels, `font-mono` para WPM y tiempos.

## Tasks / Subtasks

- [x] Task 1: Agregar `ActiveRoomDto` al shared library (AC: #3)
  - [x] 1.1 Crear `libs/shared/src/dto/active-room.dto.ts` con interfaces `ActiveRoomPlayerDto` y `ActiveRoomDto` (ver Dev Notes para estructura exacta)
  - [x] 1.2 Exportar desde `libs/shared/src/index.ts`: `export * from './dto/active-room.dto'`

- [x] Task 2: Actualizar `RoomsService` para tracking de rooms activos (AC: #2)
  - [x] 2.1 Agregar constante `const ACTIVE_ROOMS_KEY = 'active:rooms'` en `apps/api/src/modules/rooms/rooms.service.ts`
  - [x] 2.2 En `createRoom()`: `await this.redis.sadd(ACTIVE_ROOMS_KEY, room.code)` tras crear el room en Redis
  - [x] 2.3 En `setRoomStatus()`: cuando `status === 'finished'`, agregar `await this.redis.srem(ACTIVE_ROOMS_KEY, code)`
  - [x] 2.4 En `leaveRoom()`: cuando `updatedRoom.players.length === 0` (o todos disconnected), agregar `await this.redis.srem(ACTIVE_ROOMS_KEY, code)`
  - [x] 2.5 Agregar método `getActiveRoomCodes(): Promise<string[]>` con limpieza de stale entries (ver Dev Notes)

- [x] Task 3: Crear `GET /rooms/active` en `RoomsController` (AC: #1, #3)
  - [x] 3.1 Inyectar `MatchStateService` en `RoomsController` (verificar si `MatchesModule` exporta `MatchStateService`; si no, agregar a `exports` de `MatchesModule` e importar `MatchesModule` en `RoomsModule`)
  - [x] 3.2 Agregar método `getActiveRooms()` decorado con `@Get('active')` y `@Throttle({ default: { ttl: 60_000, limit: 30 } })`, SIN `@UseGuards`
  - [x] 3.3 Declarar `@Get('active')` **ANTES** de `@Get(':code')` en el controlador (crítico — ver Dev Notes)
  - [x] 3.4 Implementar lógica: obtener códigos → `getRoomState(code)` por cada uno → filtrar finished/null → para rooms 'playing' obtener `matchStateService.getMatchMetadata(code)` + `matchStateService.getMatchState(code)` → mapear a `ActiveRoomDto[]`

- [x] Task 4: Crear `useActiveRooms` hook (AC: #4)
  - [x] 4.1 Crear `apps/web/src/hooks/use-active-rooms.ts`
  - [x] 4.2 `useQuery({ queryKey: ['active-rooms'], queryFn: () => apiClient<{ rooms: ActiveRoomDto[] }>('/rooms/active'), refetchInterval: 4000, staleTime: 3000 })`

- [x] Task 5: Implementar `LiveMatchesSection` (AC: #4, #5, #6, #7, #8, #9)
  - [x] 5.1 Reemplazar placeholder en `apps/web/src/components/home/live-matches-section.tsx`
  - [x] 5.2 Usar `useActiveRooms()` y derivar `rooms = data?.rooms ?? []`
  - [x] 5.3 Estado vacío: mostrar cuando `!isLoading && rooms.length === 0`; estado loading: spinner o `null` en primera carga
  - [x] 5.4 Implementar `LiveMatchCard` como función interna del mismo archivo (no exportada)
  - [x] 5.5 En la card header: `DIFFICULTY_LEVELS.find(d => d.level === room.level)?.name`, playerCount, `formatElapsed()` si status === 'playing'
  - [x] 5.6 Calcular WPM y progreso client-side en cada render de la card (ver fórmulas en Dev Notes)
  - [x] 5.7 Estado vacío con CTA "Crear partida": lógica inline de `handleCreateRoom` + estado `showLogin` + `<LoginModal>`
  - [x] 5.8 Botón "Observar": `<button type="button" onClick={() => navigate(\`/room/\${room.code}\`)}>Observar</button>`

- [x] Task 6: Tests (AC: todos)
  - [x] 6.1 Crear `apps/web/src/components/home/live-matches-section.spec.tsx`:
    - Mock de `'../../hooks/use-active-rooms'`, `'react-router-dom'`, `'../ui/login-modal'`, `useAuth`, `'../../lib/api-client'`
    - Test: renderiza rooms cuando `useActiveRooms` retorna datos
    - Test: muestra nivel de dificultad y nombre del jugador en cada card
    - Test: botón "Observar" navega a `/room/:code`
    - Test: estado vacío muestra "No hay partidas en vivo"
    - Test: CTA "Crear partida" (autenticado) llama `apiClient` con POST `/rooms`
    - Test: CTA "Crear partida" (no autenticado) muestra `LoginModal`
    - Test: WPM se muestra para rooms en estado 'playing' con players con position > 0
    - Test: barra de progreso tiene ancho proporcional a `position / textLength`
  - [x] 6.2 Tests backend en `apps/api/src/modules/rooms/rooms.controller.spec.ts` (crear si no existe):
    - Test: `GET /rooms/active` retorna `{ rooms: [] }` cuando no hay rooms activos
    - Test: `GET /rooms/active` retorna rooms en estado 'waiting' y 'playing'
    - Test: `GET /rooms/active` NO incluye rooms con status 'finished'

- [x] Task 7: Validación Final (AC: todos)
  - [x] 7.1 Run `npx nx lint web` — cero nuevos errores
  - [x] 7.2 Run `npx nx lint api` — cero nuevos errores
  - [x] 7.3 Run `npx nx test web` — ≥303 tests pasando sin regresiones
  - [x] 7.4 Run `npx nx test api` — sin regresiones
  - [x] 7.5 Run `npx nx build web` y `npx nx build api` — builds limpios

## Dev Notes

### CRÍTICO: Orden de rutas en NestJS

`@Get('active')` DEBE declararse **ANTES** de `@Get(':code')`. NestJS procesa rutas en orden de declaración — si `:code` va primero, "active" se interpreta como un código de room y falla con 404.

```typescript
@Controller('rooms')
export class RoomsController {
  @Get('active')      // ← PRIMERO
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async getActiveRooms() { ... }

  @Get(':code')       // ← DESPUÉS
  async getRoomInfo(@Param('code') code: string) { ... }
}
```

### ActiveRoomDto — Estructura exacta

```typescript
// libs/shared/src/dto/active-room.dto.ts

export interface ActiveRoomPlayerDto {
  displayName: string;
  colorIndex: number;
  avatarUrl: string | null;
  position?: number;    // solo cuando status === 'playing'
}

export interface ActiveRoomDto {
  code: string;
  status: 'waiting' | 'playing';
  level: number;
  playerCount: number;
  players: ActiveRoomPlayerDto[];  // máx 4 (slicear en el backend)
  startedAt?: string;              // ISO string, solo cuando status === 'playing'
  textLength?: number;             // solo cuando status === 'playing'
}
```

### MatchStateService — Inyección en RoomsController

Verificar `apps/api/src/modules/matches/matches.module.ts`. Si `MatchStateService` no está en `exports`, agregarlo:
```typescript
@Module({
  providers: [MatchStateService],
  exports: [MatchStateService],  // agregar
})
export class MatchesModule {}
```
Luego importar `MatchesModule` en `RoomsModule`:
```typescript
@Module({
  imports: [MatchesModule],  // agregar
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
```

Si es difícil inyectar cross-module, alternativa más simple: mover la lógica de `getActiveRooms()` a `RoomsService` e inyectar allí el `MatchStateService`.

### getActiveRoomCodes() — Limpieza de stale entries

```typescript
async getActiveRoomCodes(): Promise<string[]> {
  const codes = await this.redis.smembers(ACTIVE_ROOMS_KEY);
  const valid: string[] = [];
  for (const code of codes) {
    const state = await this.getRoomState(code);
    if (!state || state.status === 'finished') {
      await this.redis.srem(ACTIVE_ROOMS_KEY, code);
    } else {
      valid.push(code);
    }
  }
  return valid.slice(-10); // últimos 10
}
```

### WPM Calculation — misma fórmula que SpectatorLeaderboard

Referencia: `apps/web/src/components/arena/spectator-leaderboard.tsx`

```typescript
// En el componente de la card (frontend):
const matchStartTime = room.startedAt ? new Date(room.startedAt).getTime() : null;
const elapsedMinutes = matchStartTime
  ? Math.max((Date.now() - matchStartTime) / 60_000, 0.01)
  : 0;

const wpm = (player.position && room.status === 'playing')
  ? Math.min(Math.round((player.position / 5) / elapsedMinutes), 500)
  : 0;
```

### Formato tiempo transcurrido

```typescript
function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Color dot del jugador

```tsx
import { PLAYER_COLORS } from '@ultimatype-monorepo/shared';

<span
  className="inline-block h-2 w-2 shrink-0 rounded-full"
  style={{ backgroundColor: PLAYER_COLORS[player.colorIndex] ?? PLAYER_COLORS[0] }}
  aria-hidden="true"
/>
```

### Nivel de dificultad

```tsx
import { DIFFICULTY_LEVELS } from '@ultimatype-monorepo/shared';

const levelInfo = DIFFICULTY_LEVELS.find(d => d.level === room.level);
// Ejemplo de render: "Nivel 3 · Puntuación" o solo levelInfo?.name
```

### handleCreateRoom en estado vacío — inline en LiveMatchesSection

```tsx
// Estado local necesario:
const [isCreating, setIsCreating] = useState(false);
const [showLogin, setShowLogin] = useState(false);
const navigate = useNavigate();
const { isAuthenticated, isFetchingProfile } = useAuth();

const handleCreateRoom = async () => {
  if (isFetchingProfile) return;
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

Imports necesarios: `CreateRoomResponse` desde `@ultimatype-monorepo/shared`, `apiClient` desde `'../../lib/api-client'`, `LoginModal` desde `'../ui/login-modal'`.

### useActiveRooms — implementación del hook

```typescript
// apps/web/src/hooks/use-active-rooms.ts
import { useQuery } from '@tanstack/react-query';
import { ActiveRoomDto } from '@ultimatype-monorepo/shared';
import { apiClient } from '../lib/api-client';

export function useActiveRooms() {
  return useQuery({
    queryKey: ['active-rooms'],
    queryFn: () => apiClient<{ rooms: ActiveRoomDto[] }>('/rooms/active'),
    refetchInterval: 4000,
    staleTime: 3000,
  });
}
```

### Patrón de testing heredado (Stories 5-2, 5-3, 5-4)

- Vitest + React Testing Library, **sin jest-dom**
- Assertions: `.toBeTruthy()`, `.toBeNull()`, `.toBe()`, `.classList.contains()`, `.className.includes()`
- `vi.clearAllMocks()` en `beforeEach`
- `setup()` helper con overrides de `useAuth` mockeado
- Mock de `react-router-dom`: `useNavigate` como `vi.fn()` retornando un mock de `navigate`
- `type="button"` en todos los botones no-submit
- `aria-label` en elementos interactivos sin texto visible
- Material Symbols: verificar presencia de `.material-symbols-outlined` en DOM, no apariencia visual

### Mock de useActiveRooms en tests

```typescript
vi.mock('../../hooks/use-active-rooms', () => ({
  useActiveRooms: vi.fn(),
}));

// En cada test:
const { useActiveRooms } = await import('../../hooks/use-active-rooms');
vi.mocked(useActiveRooms).mockReturnValue({
  data: { rooms: [/* tu fixture */] },
  isLoading: false,
  isError: false,
} as any);
```

### Design System Tokens (desde Story 5-1)

```
bg-surface-sunken          → fondo exterior sección (NO cambiar)
bg-surface-container-low   → fondo de tarjetas
bg-surface-raised          → track de barra de progreso
bg-primary                 → fill de barra de progreso
text-text-main             → nombres de jugadores
text-text-muted            → labels, contadores
rounded-card               → 2rem border-radius
font-sans                  → Space Grotesk
font-mono                  → IBM Plex Mono (WPM, tiempos)
transition-all duration-200 → hover effects
```

No-Line Rule: sin `border` ni separadores 1px — usar tonal shifts.

### Project Structure Notes

**Archivo a MODIFICAR (frontend):**
- `apps/web/src/components/home/live-matches-section.tsx` — reemplazar placeholder con implementación

**Archivos a CREAR (frontend):**
- `apps/web/src/hooks/use-active-rooms.ts` — hook de polling
- `apps/web/src/components/home/live-matches-section.spec.tsx` — tests

**Archivos a CREAR (backend/shared):**
- `libs/shared/src/dto/active-room.dto.ts` — DTOs del endpoint

**Archivos a MODIFICAR (backend/shared):**
- `libs/shared/src/index.ts` — exportar `ActiveRoomDto`
- `apps/api/src/modules/rooms/rooms.service.ts` — Redis Set + `getActiveRoomCodes()`
- `apps/api/src/modules/rooms/rooms.controller.ts` — `GET /rooms/active`
- Posiblemente `apps/api/src/modules/matches/matches.module.ts` — exportar `MatchStateService`
- Posiblemente `apps/api/src/modules/rooms/rooms.module.ts` — importar `MatchesModule`

**Archivos que NO cambian:**
- `apps/web/src/components/home/home-page.tsx` — grid/contenedor sin cambios
- `apps/web/src/components/home/game-actions-section.tsx` — sin cambios
- `apps/web/src/components/arena/spectator-leaderboard.tsx` — solo referencia de WPM
- Secciones placeholder: `leaderboard-preview-section.tsx`, `player-profile-section.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.5] — User story y ACs originales
- [Source: _bmad-output/implementation-artifacts/5-4-game-mode-selector.md] — Design System tokens, card patterns, testing patterns, handleCreateRoom pattern
- [Source: apps/api/src/modules/rooms/rooms.service.ts] — RoomsService, RoomState, Redis keys structure
- [Source: apps/api/src/modules/rooms/rooms.controller.ts] — Controller pattern existente
- [Source: apps/api/src/modules/matches/match-state.service.ts] — getMatchMetadata(), getMatchState(), PlayerMatchState
- [Source: apps/web/src/components/arena/spectator-leaderboard.tsx] — WPM formula de referencia
- [Source: apps/web/src/components/home/live-matches-section.tsx] — Placeholder a reemplazar
- [Source: libs/shared/src/constants/player-colors.ts] — PLAYER_COLORS[0..19]
- [Source: libs/shared/src/constants/difficulty-levels.ts] — DIFFICULTY_LEVELS
- [Source: libs/shared/src/index.ts] — Exports actuales del shared library

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Tests de `home-page.spec.tsx` fallaban con "Found multiple elements with text: Crear partida" — EmptyState agrega segundo botón. Corregido con `getAllByText`.
- Tests de `home-page.spec.tsx` fallaban con "No QueryClient set" — LiveMatchesSection usa `useQuery` internamente. Corregido mockeando `useActiveRooms` en ese archivo.

### Completion Notes List

- Task 1: Creado `active-room.dto.ts` con `ActiveRoomPlayerDto` y `ActiveRoomDto`. Exportado desde `index.ts`.
- Task 2: `RoomsService` actualizado con `ACTIVE_ROOMS_KEY`, sadd/srem en los 3 puntos de ciclo de vida, y `getActiveRoomCodes()` con limpieza de stale entries.
- Task 3: `MatchesModule` ya exportaba `MatchStateService`; importado en `RoomsModule`. Endpoint `GET /rooms/active` (throttle 30/min, sin auth) declarado antes de `GET /:code`. Retorna `ActiveRoomDto[]` combinando RoomState + MatchState para rooms playing.
- Task 4: Hook `use-active-rooms.ts` con `useQuery` (refetchInterval: 4000, staleTime: 3000).
- Task 5: `live-matches-section.tsx` completamente reemplazado. Funciones internas: `formatElapsed`, `MiniLeaderboardRow` (color dot + WPM + progress bar), `LiveMatchCard` (header + mini-leaderboard + Observar), `EmptyState` (sports_esports + CTA con handleCreateRoom inline). Contenedor exterior `col-span-12 lg:col-span-4` sin cambios.
- Task 6: 14 tests en `live-matches-section.spec.tsx`. Actualizado `home-page.spec.tsx` (mock useActiveRooms, test placeholder → empty state, getAllByText para "Crear partida").
- Task 7: 317 web tests pasando (+14 nuevos, sin regresiones). 0 nuevos errores de lint. Builds limpios.

### Review Findings

- [x] [Review][Patch] `setRoomStatusAtomically` no remueve de `active:rooms` al finish — agregado `srem` tras Lua script exitoso [rooms.service.ts]
- [x] [Review][Patch] `handleRematch` no re-agrega room a `active:rooms` — agregado `addToActiveRooms()` tras setRoomStatus('waiting') [game.gateway.ts]
- [x] [Review][Patch] Duplicación de filtrado de players + `basePlayers` desperdiciado — extraído `activePlayers`/`topPlayers` una vez, reusado en ambos branches [rooms.controller.ts]
- [x] [Review][Patch] `colorIndex` como React key puede colisionar — cambiado a key compuesto `displayName-colorIndex` [live-matches-section.tsx]
- [x] [Review][Patch] Controller sin try/catch per-room — agregado try/catch + Logger.warn + continue [rooms.controller.ts]
- [x] [Review][Patch] Clock skew → elapsed time negativo — agregado `Math.max(..., 0)` [live-matches-section.tsx]
- [x] [Review][Patch] Room 'playing' con metadata null → skip room — agregado `if (!meta) continue` [rooms.controller.ts]
- [x] [Review][Patch] Tests backend controller faltantes — 5 tests agregados: empty, waiting+playing, finished excluded, null meta skip, error resilience [rooms.controller.spec.ts]
- [x] [Review][Dismiss] N+1 Redis + awaits secuenciales + doble `getRoomState` — con patches 1-2 el Set se mantiene limpio; N real ≤10-15, costo despreciable
- [x] [Review][Dismiss] Elapsed time no hace tick en vivo — 4s polling aceptable para preview del home; arena usa WebSocket
- [x] [Review][Dismiss] `EmptyState` silencia errores de creación de room — ya diferido en review 5-4, depende de sistema de toasts
- [x] [Review][Dismiss] `ACTIVE_ROOMS_KEY` sin TTL en Redis — Set vacío negligible, limpieza lazy cada 4s
- [x] [Review][Dismiss] Frontend sin estado de error para polling — React Query reintenta 3x + refetchOnReconnect; patrón del codebase

### File List

- `libs/shared/src/dto/active-room.dto.ts` — Creado
- `libs/shared/src/index.ts` — Modificado: export de active-room.dto
- `apps/api/src/modules/rooms/rooms.service.ts` — Modificado: ACTIVE_ROOMS_KEY, sadd/srem, getActiveRoomCodes()
- `apps/api/src/modules/rooms/rooms.module.ts` — Modificado: import MatchesModule
- `apps/api/src/modules/rooms/rooms.controller.ts` — Modificado: inject MatchStateService, GET /rooms/active
- `apps/web/src/hooks/use-active-rooms.ts` — Creado
- `apps/web/src/components/home/live-matches-section.tsx` — Modificado: implementación completa
- `apps/web/src/components/home/live-matches-section.spec.tsx` — Creado: 14 tests
- `apps/web/src/components/home/home-page.spec.tsx` — Modificado: mock useActiveRooms, tests actualizados
