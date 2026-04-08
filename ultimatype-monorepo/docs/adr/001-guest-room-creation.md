# ADR-001: Invitados pueden crear partidas sin registrarse

**Fecha:** 2026-04-08
**Estado:** Aprobado
**Contexto:** Reducir la friccion de entrada al juego permitiendo que cualquier visitante cree partidas.

## Decision

Los usuarios invitados (no registrados) pueden crear partidas. Antes era obligatorio iniciar sesion.

## Motivacion

- El muro de login antes de probar el producto es la mayor barrera de entrada.
- El core loop (crear partida, jugar, ver resultados) funciona sin cuenta.
- La motivacion para registrarse queda en: aparecer en la clasificacion (global y por pais) y conservar metricas/historial.

## Cambios realizados

### Backend

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/modules/auth/guards/optional-jwt-auth.guard.ts` | Nuevo guard que permite requests sin token JWT (no rechaza, devuelve `null`). |
| `apps/api/src/modules/rooms/rooms.controller.ts` | `POST /rooms` usa `OptionalJwtAuthGuard`. Si hay JWT, usa datos del usuario. Si no, espera `{ guestId, guestName }` en el body. |
| `apps/api/src/modules/leaderboard/leaderboard.controller.ts` | Nuevo endpoint `GET /leaderboard/hypothetical-rank?score=X&level=Y`. Sin JWT, throttle 2 req/min. Obtiene pais del header `cf-ipcountry` (Cloudflare). |
| `apps/api/src/modules/leaderboard/leaderboard.service.ts` | Nuevo metodo `getHypotheticalRank(score, level?, countryCode?)` — calcula posicion hipotetica en ranking global y por pais. |

### Shared

| Archivo | Cambio |
|---------|--------|
| `libs/shared/src/dto/leaderboard.dto.ts` | Nuevo `HypotheticalRankDto` con `globalRank`, `globalTotal`, `countryRank`, `countryTotal`, `countryCode`. |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/components/home/game-actions-section.tsx` | Eliminado el login modal y bloqueo por `isFetchingProfile`. Invitados envian `guestId`/`guestName` al crear sala. |
| `apps/web/src/components/arena/match-results-overlay.tsx` | Fetch de ranking hipotetico al terminar partida. Muestra "Hubieras quedado #X en [Pais] y #Y a nivel mundial" + CTA "Registrate para aparecer en la clasificacion". |
| `apps/web/src/components/arena/arena-page.tsx` | Nuevo prop `level` para pasar al overlay de resultados. |
| `apps/web/src/components/lobby/lobby-page.tsx` | Pasa `roomState.level` al `ArenaPage`. |

## Decisiones descartadas

| Opcion | Razon de rechazo |
|--------|-----------------|
| Guardar historial de partidas en `localStorage` para vincular al registrarse | Falsificable (cualquiera puede inyectar scores falsos). Complejidad innecesaria. |
| Vincular retroactivamente partidas de invitado a cuenta nueva | No vale la complejidad ni el riesgo de seguridad. Filosofia: "si queres conservar algo, registrate". |
| Permitir al invitado elegir nombre | Para eso que se registren. Se mantiene "Invitado #XXXX" generico desde `sessionStorage`. |
| Guard opcional con JWT (re-auth en el endpoint) | Se creo `OptionalJwtAuthGuard` que es mas limpio y reutilizable. |

## Flujo del invitado

```
1. Invitado abre la home → click "Crear partida"
2. Frontend envia POST /rooms con { guestId, guestName }
3. Backend crea sala con guestId como hostId
4. Invitado juega la partida normalmente
5. Al terminar, frontend llama GET /leaderboard/hypothetical-rank?score=X&level=Y
6. Overlay muestra: "Hubieras quedado #12 en Argentina y #50 a nivel mundial"
7. Debajo: CTA "Registrate para aparecer en la clasificacion" + botones OAuth
```

## Datos del invitado

- **ID:** `guest_` + UUID v4 (generado en `sessionStorage`, dura hasta cerrar browser)
- **Nombre:** `Invitado #` + random 1-9999 (en `sessionStorage`)
- **Resultados en DB:** NO se persisten (filtrados en `match-results.service.ts`)
- **Sesion:** Solo `sessionStorage`, nada en servidor. Al cerrar browser se pierde todo.

## Seguridad

- `POST /rooms`: throttle 5 req/min (pre-existente)
- `GET /leaderboard/hypothetical-rank`: throttle 2 req/min, sin JWT
- Pais del invitado: `cf-ipcountry` header de Cloudflare (no falsificable por el cliente)
- No se almacena nada del invitado en base de datos
