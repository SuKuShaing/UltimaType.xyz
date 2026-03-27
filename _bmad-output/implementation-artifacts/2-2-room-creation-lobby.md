# Story 2.2: Room Creation & Lobby

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to create a room, share a link, and see my friends join the lobby,
so that we can gather before starting a match.

## Acceptance Criteria

1. **Given** an authenticated user **When** they click "Crear Sala" **Then** a new room is created with a unique 6-character alphanumeric code **And** the user is redirected to the lobby as the host **And** a shareable link (`/room/:code`) is available to copy.
2. **Given** an authenticated user with a valid room link or code **When** they navigate to `/room/:code` **Then** they join the room via WebSocket **And** appear in the lobby as a `PlayerAvatarPill` with a dynamically assigned distinct color.
3. **Given** a lobby with connected players **When** a new player joins or leaves **Then** all connected clients receive a real-time update and the lobby UI reflects the change immediately.
4. **Given** the host in the lobby **When** they select a difficulty level (1-5) **Then** all connected clients see the selected level updated in real-time.
5. **Given** a lobby with at least 2 players **When** each player toggles their "Listo" status **Then** all clients see the updated ready state **And** the host's "Iniciar" button becomes enabled when all players are ready.
6. **Given** the host with all players ready **When** they press "Iniciar" **Then** a `match:start` event is emitted to all clients (the actual countdown/gameplay is story 2.4).
7. **Given** a room **When** 20 players have joined **Then** subsequent join attempts are rejected with an appropriate error message.
8. **Given** a WebSocket connection **When** the JWT token is invalid or missing **Then** the connection is rejected with an authentication error.
9. **Given** the host disconnects **When** other players remain **Then** the next player by join order is promoted to host **And** all clients are notified.

## Tasks / Subtasks

- [x] Task 1: Instalar dependencias de WebSocket, Redis y room codes (AC: todos)
  - [x] 1.1 `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io`
  - [x] 1.2 `npm install ioredis @socket.io/redis-adapter`
  - [x] 1.3 `npm install nanoid@3` (v3 compatible con CJS de NestJS)
  - [x] 1.4 `npm install socket.io-client` (frontend)
  - [x] 1.5 `npm install -D @types/ioredis` (si no incluye tipos)
- [x] Task 2: Agregar REDIS_URL al esquema de entorno (AC: #8)
  - [x] 2.1 Agregar `REDIS_URL` al esquema Zod en `apps/api/src/app/app.module.ts` (default: `redis://localhost:6379`)
  - [x] 2.2 Actualizar `.env.example` con `REDIS_URL=redis://localhost:6379`
- [x] Task 3: Crear RedisModule global con ioredis (AC: todos)
  - [x] 3.1 Crear `apps/api/src/redis/redis.module.ts` — modulo global que provee ioredis client
  - [x] 3.2 Crear `apps/api/src/redis/redis.service.ts` — wrapper service con metodos get/set/hset/hget/del/expire
  - [x] 3.3 Tests en `redis.service.spec.ts`
- [x]Task 4: Crear RedisIoAdapter para Socket.IO (AC: todos)
  - [x]4.1 Crear `apps/api/src/gateway/redis-io.adapter.ts` — extiende IoAdapter, conecta Redis pub/sub
  - [x]4.2 Actualizar `apps/api/src/main.ts` — aplicar RedisIoAdapter antes de `app.listen()`
  - [x]4.3 Habilitar CORS en el gateway para `FRONTEND_URL`
- [x]Task 5: Crear tipos compartidos en `libs/shared` (AC: todos)
  - [x]5.1 Crear `libs/shared/src/websocket/events.ts` — constantes de eventos WS tipados
  - [x]5.2 Crear `libs/shared/src/dto/room.dto.ts` — interfaces Room, Player, lobby state
  - [x]5.3 Crear `libs/shared/src/constants/player-colors.ts` — paleta de 20 colores neon
  - [x]5.4 Re-exportar desde `libs/shared/src/index.ts`
- [x]Task 6: Crear RoomsService con gestion de estado en Redis (AC: #1, #2, #3, #7, #9)
  - [x]6.1 Crear `apps/api/src/modules/rooms/rooms.service.ts`
  - [x]6.2 Metodo `createRoom(hostId, hostInfo)` — genera codigo con nanoid, almacena en Redis hash, TTL 24h
  - [x]6.3 Metodo `joinRoom(code, userId, userInfo)` — valida capacidad (max 20), asigna color, agrega player
  - [x]6.4 Metodo `leaveRoom(code, userId)` — remueve player, promueve host si necesario
  - [x]6.5 Metodo `getRoomState(code)` — retorna estado completo del room
  - [x]6.6 Metodo `setLevel(code, userId, level)` — solo host puede cambiar nivel
  - [x]6.7 Metodo `setReady(code, userId, ready)` — toggle estado listo del jugador
  - [x]6.8 Metodo `canStart(code)` — verifica minimo 2 players y todos listos
  - [x]6.9 Tests en `rooms.service.spec.ts`
- [x]Task 7: Crear RoomsController con endpoints REST (AC: #1)
  - [x]7.1 Crear `apps/api/src/modules/rooms/rooms.controller.ts`
  - [x]7.2 `POST /api/rooms` — crea room (requiere JwtAuthGuard), retorna `{ code, link }`
  - [x]7.3 `GET /api/rooms/:code` — retorna info del room (publico, para preview antes de unirse)
  - [x]7.4 Tests en `rooms.controller.spec.ts`
- [x]Task 8: Crear GameGateway con autenticacion JWT y eventos de lobby (AC: #2-#9)
  - [x]8.1 Crear `apps/api/src/gateway/game.gateway.ts` — WebSocketGateway con CORS
  - [x]8.2 Implementar JWT middleware en `afterInit()` — verifica token del handshake
  - [x]8.3 Handler `lobby:join` — une player al room y broadcast estado
  - [x]8.4 Handler `lobby:leave` — remueve player y broadcast estado
  - [x]8.5 Handler `lobby:ready` — toggle ready y broadcast estado
  - [x]8.6 Handler `lobby:select-level` — host cambia nivel y broadcast
  - [x]8.7 Handler `lobby:start` — host inicia partida, emite `match:start` a la room
  - [x]8.8 `handleDisconnect` — cleanup al desconectarse (leave room, host promotion)
  - [x]8.9 Crear `apps/api/src/gateway/game.module.ts` — importa RoomsModule
  - [x]8.10 Tests en `game.gateway.spec.ts`
- [x]Task 9: Registrar modulos en AppModule (AC: todos)
  - [x]9.1 Importar `RedisModule` en `AppModule`
  - [x]9.2 Importar `RoomsModule` en `AppModule` (si no lo importa GameModule)
  - [x]9.3 Importar `GameModule` en `AppModule`
- [x] Task 10: Configurar Tailwind CSS en web app (AC: #2)
  - [x]10.1 `npm install -D tailwindcss @tailwindcss/vite`
  - [x]10.2 Agregar plugin Tailwind al `vite.config.ts` de web
  - [x]10.3 Agregar `@import "tailwindcss"` al archivo CSS principal
  - [x]10.4 Configurar tema con tokens UX: colores surface (sunken/base/raised), primary (#FF9B51), success (#4ADE80), error (#FB7185), fuente Space Grotesk
  - [x]10.5 Verificar que componentes existentes no se rompan con Tailwind reset
- [x] Task 11: Crear utilidad de socket client (AC: #2, #8)
  - [x]11.1 Crear `apps/web/src/lib/socket.ts` — singleton Socket.IO client con auth JWT
  - [x]11.2 Funcion `connectSocket(token)` — crea conexion con `auth: { token }`
  - [x]11.3 Funcion `disconnectSocket()` — limpia conexion
- [x] Task 12: Crear hooks de React para lobby (AC: #2-#6)
  - [x]12.1 Crear `apps/web/src/hooks/use-socket.ts` — hook para conectar/desconectar socket, auto-reconnect
  - [x]12.2 Crear `apps/web/src/hooks/use-lobby.ts` — hook para estado del lobby (players, level, ready states)
- [x] Task 13: Crear componentes de lobby (AC: #1-#6)
  - [x]13.1 Crear `apps/web/src/components/lobby/player-avatar-pill.tsx` — componente sin bordes, color dinamico, No-Line Rule
  - [x]13.2 Crear `apps/web/src/components/lobby/lobby-page.tsx` — pagina principal del lobby (lista players, selector nivel, boton listo/iniciar, copiar link)
  - [x]13.3 Crear `apps/web/src/components/lobby/create-room-button.tsx` — boton en home para crear sala
- [x] Task 14: Agregar rutas de room al router (AC: #1, #2)
  - [x]14.1 Agregar ruta `/room/:code` al router en `app.tsx` — lobby page (protegida)
  - [x]14.2 Agregar boton "Crear Sala" en la pagina Home
  - [x]14.3 Flujo: POST /api/rooms → navigate to /room/:code → WebSocket connect → lobby:join
- [x] Task 15: Tests del frontend (AC: #1-#6)
  - [x]15.1 Tests de `PlayerAvatarPill` — renderiza nombre, color, sin bordes
  - [x]15.2 Tests de `LobbyPage` — mockear socket, verificar lista de players
- [x] Task 16: Verificacion de regresion (AC: todos)
  - [x]16.1 `npx nx test api` — todos los tests existentes pasan
  - [x]16.2 `npx nx test web` — todos los tests existentes pasan
  - [x]16.3 `npx nx lint api` y `npx nx lint web` — sin errores nuevos

### Review Findings

- [x] [Review][Patch] Race condition: join concurrente puede exceder MAX_PLAYERS — Lua script atómico [rooms.service.ts]
- [x] [Review][Patch] leaveRoom no atómico: delete+count+promote — Lua script atómico [rooms.service.ts]
- [x] [Review][Patch] No almacena joinedAt: promoción de host usa orden arbitrario — joinedAt agregado [rooms.service.ts, room.dto.ts]
- [x] [Review][Patch] Colisión de room code: createRoom no verifica existencia — loop con EXISTS [rooms.service.ts]
- [x] [Review][Patch] JWT verify sin restricción de algoritmo — algorithms: ['HS256'] [game.gateway.ts]
- [x] [Review][Patch] Socket singleton: token stale en auto-reconnect — auth como función [socket.ts]
- [x] [Review][Patch] RedisIoAdapter: conexiones pub/sub nunca se cierran — close() + shutdown hooks [redis-io.adapter.ts, main.ts]
- [x] [Review][Patch] RedisModule: cliente Redis no se desconecta — RedisShutdownService [redis.module.ts]
- [x] [Review][Patch] handleDisconnect no tiene try-catch — envuelto con logging [game.gateway.ts]
- [x] [Review][Patch] Sin validación de payloads WebSocket — regex + type checks en handlers [game.gateway.ts]
- [x] [Review][Patch] TTL drift: setReady/setLevel renuevan keys parcialmente — refreshTTL helper [rooms.service.ts]
- [x] [Review][Patch] setLevel no valida enteros/NaN — usa isValidLevel del shared [rooms.service.ts, game.gateway.ts]
- [x] [Review][Patch] Double emission: handleLeave + cleanup emiten LOBBY_LEAVE — removido del cleanup [use-lobby.ts]
- [x] [Review][Patch] Socket lifecycle: refs stale entre useLobby y LobbyPage — MATCH_START movido a useLobby [use-lobby.ts, lobby-page.tsx]
- [x] [Review][Patch] Initials crash con displayName vacío — filter(Boolean) + fallback '?' [player-avatar-pill.tsx]
- [x] [Review][Patch] clipboard.writeText sin error handling — async/await + feedback 'Copiado!' [lobby-page.tsx]
- [x] [Review][Patch] match:start payload sin textId — selección de texto via TextsService [game.gateway.ts, game.module.ts]
- [x] [Review][Patch] GET /rooms/:code expone PII — respuesta limitada a {code, playerCount, status, level} [rooms.controller.ts]
- [x] [Review][Patch] trust proxy sin condición — condicional a TRUST_PROXY env var [main.ts, app.module.ts]
- [x] [Review][Patch] HTTP CORS no habilitado — enableCors con FRONTEND_URL [main.ts]
- [x] [Review][Patch] CORS en @WebSocketGateway usa process.env — movido a afterInit con ConfigService [game.gateway.ts]
- [x] [Review][Patch] Host debe hacer click Listo + Iniciar redundante — auto-ready en handleStart [game.gateway.ts, lobby-page.tsx]
- [x] [Review][Patch] Versiones de dependencias con ^ — pinned a versiones exactas + .npmrc [package.json]
- [x] [Review][Defer] connections Map in-memory vs multi-instancia — aceptado single-instance, documentar para scaling futuro
- [x] [Review][Defer] connections Map in-memory — documentado como limitación single-instance conocida

## Dev Notes

### Contexto del Epic 2

Esta es la segunda story del Epic 2 (Live Multiplayer Arena) y la **primera que introduce WebSocket e infraestructura en tiempo real**. Todo lo construido aqui sera la base para stories 2.3 (Caret Sync), 2.4 (Focus Fade), 2.5 (Scoring) y 2.6 (Disconnection Handling). La calidad de esta infraestructura es critica.

**FRs cubiertos:** FR5 (crear sala + link), FR6 (unirse via link), FR7 (host selecciona nivel), FR8 (host inicia partida con 2+ listos), FR9 (hasta 20 jugadores), FR15 (colores distintos automaticos).

### Dependencias criticas — nanoid v3

**OBLIGATORIO usar nanoid@3, NO v5.** nanoid v5 es ESM-only y NestJS compila a CJS por defecto. Usar v5 causa `ERR_REQUIRE_ESM`. Instalar explicitamente:

```bash
npm install nanoid@3
```

Uso para room codes:

```typescript
import { customAlphabet } from 'nanoid';
// Excluir caracteres ambiguos: 0/O, 1/I/L
const generateRoomCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);
const code = generateRoomCode(); // => "A3F8K2"
```

### Estado de rooms en Redis (NO en PostgreSQL)

Segun la arquitectura: "Redis: Exclusivo para el estado efimero del multijugador". Las rooms son efimeras, NO se persisten en PostgreSQL. Estructura Redis:

```
room:{code}            → Hash {
  code: string,
  hostId: string,
  level: number,
  status: "waiting" | "playing" | "finished",
  createdAt: ISO timestamp,
  maxPlayers: 20
}

room:{code}:players    → Hash {
  {userId}: JSON({
    id: string,
    displayName: string,
    avatarUrl: string | null,
    colorIndex: number,
    isReady: boolean,
    joinedAt: ISO timestamp
  })
}
```

**TTL:** Cada room tiene TTL de 24h (86400s). Renovar TTL cada vez que hay actividad (join, ready, start).

**NO crear modelo Prisma para Room.** Usar exclusivamente Redis hashes.

### RedisModule — Proveedor global de ioredis

Archivo: `apps/api/src/redis/redis.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Redis(config.get('REDIS_URL', 'redis://localhost:6379'));
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

Inyectar en servicios con:
```typescript
constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}
```

### RedisIoAdapter — Adaptador Socket.IO + Redis

Archivo: `apps/api/src/gateway/redis-io.adapter.ts`

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: INestApplication, private redisUrl: string) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(this.redisUrl);
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

**Aplicar en `main.ts`:**
```typescript
const redisUrl = app.get(ConfigService).get('REDIS_URL', 'redis://localhost:6379');
const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

**CRITICO:** Aplicar el adapter ANTES de `app.listen()`.

### Actualizacion de main.ts

Archivo: `apps/api/src/main.ts`

Cambios necesarios:
1. Importar `ConfigService`
2. Crear y conectar `RedisIoAdapter`
3. Aplicar WebSocket adapter
4. Mantener el global prefix `/api` existente (no afecta WebSockets)

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);

  // WebSocket con Redis adapter
  const redisUrl = configService.get('REDIS_URL', 'redis://localhost:6379');
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
```

### GameGateway — Autenticacion JWT en WebSocket

Archivo: `apps/api/src/gateway/game.gateway.ts`

**JWT Middleware:** Verificar token en el handshake, NO en cada mensaje. Usar `server.use()` en `afterInit()`:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private roomsService: RoomsService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      try {
        const payload = verify(token, this.configService.get('JWT_SECRET'));
        socket.data.user = payload;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });
  }
}
```

**IMPORTANTE:** Usar `jsonwebtoken.verify()` directamente (ya instalado como dependencia de passport-jwt). NO intentar inyectar `JwtService` de NestJS en el middleware — el contexto de inyeccion no esta disponible en `afterInit`.

**Eventos WebSocket** — Namespace bidimensional `dominio:accion` (convencion de arquitectura):

| Evento (Client → Server) | Payload | Descripcion |
|--------------------------|---------|-------------|
| `lobby:join` | `{ code: string }` | Unirse a sala |
| `lobby:leave` | `{ code: string }` | Salir de sala |
| `lobby:ready` | `{ code: string, ready: boolean }` | Toggle estado listo |
| `lobby:select-level` | `{ code: string, level: number }` | Host cambia nivel |
| `lobby:start` | `{ code: string }` | Host inicia partida |

| Evento (Server → Client) | Payload | Descripcion |
|--------------------------|---------|-------------|
| `lobby:state` | `RoomState` completo | Broadcast estado actualizado |
| `lobby:error` | `{ message: string }` | Error de operacion |
| `match:start` | `{ code: string, textId: string }` | Partida iniciada (consumido en story 2.4) |

**Socket rooms:** Usar `socket.join(code)` de Socket.IO para agrupar conexiones por room. Broadcast con `this.server.to(code).emit(...)`.

### Tracking de socket-to-user mapping

Mantener un Map en el gateway para asociar `socket.id → { userId, roomCode }`:

```typescript
private connections = new Map<string, { userId: string; roomCode: string }>();
```

Esto permite:
- En `handleDisconnect`: saber de que room sacar al usuario
- Prevenir multiples conexiones del mismo usuario a distintas rooms

### RoomsService — Operaciones Redis

Archivo: `apps/api/src/modules/rooms/rooms.service.ts`

**Patron de inyeccion:** Inyectar Redis client via token `REDIS_CLIENT`.

**Asignacion de colores:** Usar el indice del primer "slot" libre en la lista de players (0-19). Los colores se definen en `libs/shared/src/constants/player-colors.ts`.

**Promocion de host:** Si el host se desconecta, el player con `joinedAt` mas antiguo se convierte en host. Actualizar `room:{code}` hash field `hostId`.

**Validacion de capacidad:** Antes de agregar un player, verificar `HLEN room:{code}:players < 20`.

### RoomsController — Endpoints REST

Archivo: `apps/api/src/modules/rooms/rooms.controller.ts`

```typescript
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRoom(@Req() req: AuthenticatedRequest) {
    const room = await this.roomsService.createRoom(req.user.sub, {
      id: req.user.sub,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
    });
    return { code: room.code, link: `/room/${room.code}` };
  }

  @Get(':code')
  async getRoomInfo(@Param('code') code: string) {
    const room = await this.roomsService.getRoomState(code);
    if (!room) throw new NotFoundException('Sala no encontrada');
    return room;
  }
}
```

**NOTA:** `POST /api/rooms` requiere `JwtAuthGuard`. `GET /api/rooms/:code` es publico (para mostrar preview antes de unirse).

**AuthenticatedRequest:** Verificar la forma del objeto `req.user` que devuelve `JwtStrategy`. En el proyecto actual, `JwtStrategy.validate()` retorna el payload del JWT. Asegurar que incluya `sub` (userId), `displayName`, y `avatarUrl`.

### Shared Types — WebSocket Events

Archivo: `libs/shared/src/websocket/events.ts`

```typescript
// Eventos Client → Server
export const WS_EVENTS = {
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_READY: 'lobby:ready',
  LOBBY_SELECT_LEVEL: 'lobby:select-level',
  LOBBY_START: 'lobby:start',
  // Server → Client
  LOBBY_STATE: 'lobby:state',
  LOBBY_ERROR: 'lobby:error',
  MATCH_START: 'match:start',
} as const;
```

### Shared Types — Room DTOs

Archivo: `libs/shared/src/dto/room.dto.ts`

```typescript
export interface PlayerInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  colorIndex: number;
  isReady: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  level: number;
  status: 'waiting' | 'playing' | 'finished';
  players: PlayerInfo[];
  maxPlayers: number;
}

export interface CreateRoomResponse {
  code: string;
  link: string;
}
```

### Player Colors — Paleta de 20 colores neon

Archivo: `libs/shared/src/constants/player-colors.ts`

```typescript
export const PLAYER_COLORS = [
  '#FF9B51', // 0: Primary Orange (host/local player first)
  '#06B6D4', // 1: Cyan
  '#A855F7', // 2: Purple
  '#F43F5E', // 3: Rose
  '#22D3EE', // 4: Light Cyan
  '#FACC15', // 5: Yellow
  '#34D399', // 6: Emerald
  '#F472B6', // 7: Pink
  '#60A5FA', // 8: Blue
  '#FB923C', // 9: Amber
  '#818CF8', // 10: Indigo
  '#2DD4BF', // 11: Teal
  '#E879F9', // 12: Fuchsia
  '#FCD34D', // 13: Gold
  '#4ADE80', // 14: Green
  '#F87171', // 15: Red
  '#38BDF8', // 16: Sky
  '#C084FC', // 17: Violet
  '#FBBF24', // 18: Warm Yellow
  '#67E8F9', // 19: Bright Cyan
] as const;
```

El color NO se asigna por orden de llegada sino por el primer indice libre (0-19) para evitar huecos al salir players.

### Configuracion de Tailwind CSS

**IMPORTANTE:** El frontend actualmente NO tiene Tailwind configurado. Se debe configurar como parte de esta story ya que es la primera que construye UI de lobby.

Archivo: `apps/web/vite.config.ts` — agregar plugin:
```typescript
import tailwindcss from '@tailwindcss/vite';
// En plugins: [react(), tailwindcss()]
```

Archivo: `apps/web/src/styles.css` — agregar imports y tema:
```css
@import "tailwindcss";

@theme {
  --color-surface-base: #0F1F29;
  --color-surface-sunken: #1A2630;
  --color-surface-raised: #25343F;
  --color-primary: #FF9B51;
  --color-success: #4ADE80;
  --color-error: #FB7185;
  --color-text-main: #F8F9FA;
  --color-text-muted: #8B949E;
  --font-sans: 'Space Grotesk', system-ui, sans-serif;
}
```

**Verificar:** Que el reset de Tailwind no rompa componentes existentes (Home, Profile, AuthCallback). Si usan inline styles, deberian estar bien. Si se rompen, ajustar los estilos existentes.

### Socket Client — Frontend

Archivo: `apps/web/src/lib/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      auth: { token: getAccessToken() },
      transports: ['websocket'], // Skip long-polling, no sticky sessions needed
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

**CRITICO:**
- Usar `transports: ['websocket']` para evitar necesidad de sticky sessions con Redis adapter.
- Usar `auth: { token }` (NO `extraHeaders`) — funciona con transporte WebSocket puro.
- La URL base `'/'` funciona porque Vite proxy redirige a la API (o en produccion estan en el mismo dominio).
- `getAccessToken()` ya existe en `api-client.ts` — reutilizar.

### Hook useLobby — Estado del lobby via WebSocket

Archivo: `apps/web/src/hooks/use-lobby.ts`

El hook debe:
1. Conectar el socket al montar
2. Emitir `lobby:join` con el code
3. Escuchar `lobby:state` para actualizar estado local
4. Escuchar `lobby:error` para manejar errores
5. Proveer funciones: `toggleReady()`, `selectLevel()`, `startMatch()`, `leaveRoom()`
6. Limpiar listeners al desmontar

**Estado local con useState** (NO Zustand para el lobby — Zustand se reserva para el estado de juego de alta frecuencia segun arquitectura).

### PlayerAvatarPill — Componente visual

Archivo: `apps/web/src/components/lobby/player-avatar-pill.tsx`

Requisitos UX:
- **Sin bordes** (No-Line Rule) — usar `bg-surface-raised` para elevation tonal
- Color semantico del player como accent (borde izquierdo de color? NO, usar fondo tintado o indicador de color)
- Mostrar: avatar (imagen o iniciales), displayName, indicador de color, estado "Listo"
- Host tiene indicador visual (corona/estrella o etiqueta "Host")

```tsx
interface PlayerAvatarPillProps {
  player: PlayerInfo;
  isHost: boolean;
  isLocal: boolean;
}
```

### Proxy de Vite para WebSocket

Verificar que el `vite.config.ts` del frontend tenga proxy configurado para WebSocket. Actualmente deberia tener proxy para `/api` al backend. Agregar soporte para WebSocket:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,
    },
  },
}
```

### Flujo completo (secuencia)

1. User en Home → click "Crear Sala" → `POST /api/rooms` (REST, con JWT)
2. API crea room en Redis → retorna `{ code, link }`
3. Frontend navega a `/room/{code}`
4. LobbyPage monta → hook `useLobby` conecta socket → emite `lobby:join`
5. GameGateway valida JWT en handshake → procesa `lobby:join` → agrega player en Redis → broadcast `lobby:state`
6. Otro user abre link `/room/{code}` → misma secuencia desde paso 4
7. Host selecciona nivel → emite `lobby:select-level` → gateway broadcast `lobby:state`
8. Players marcan "Listo" → emiten `lobby:ready` → gateway broadcast
9. Host presiona "Iniciar" → gateway verifica todos listos → emite `match:start`

### Patron de tests (Vitest)

**Backend:** Continuar con `vi.fn()` e instanciacion manual (patron de story 2-1). Para tests del gateway, mockear `Server` y `Socket`:

```typescript
const mockServer = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
const mockSocket = {
  id: 'socket-1',
  data: { user: { sub: 'user-1', displayName: 'Test' } },
  handshake: { auth: { token: 'valid-jwt' } },
  join: vi.fn(),
  leave: vi.fn(),
  emit: vi.fn(),
};
```

**Redis mock:** Mockear el ioredis client inyectado:

```typescript
const mockRedis = {
  hset: vi.fn(),
  hget: vi.fn(),
  hgetall: vi.fn(),
  hdel: vi.fn(),
  hlen: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
};
```

### Project Structure Notes

Archivos a crear:

```text
apps/api/src/
├── redis/
│   ├── redis.module.ts                    <- NUEVO (global module)
│   └── redis.service.spec.ts             <- NUEVO (tests opcionales)
├── gateway/
│   ├── redis-io.adapter.ts               <- NUEVO
│   ├── game.gateway.ts                   <- NUEVO
│   ├── game.gateway.spec.ts             <- NUEVO
│   └── game.module.ts                    <- NUEVO
└── modules/
    └── rooms/
        ├── rooms.module.ts               <- NUEVO
        ├── rooms.controller.ts           <- NUEVO
        ├── rooms.controller.spec.ts      <- NUEVO
        ├── rooms.service.ts              <- NUEVO
        └── rooms.service.spec.ts         <- NUEVO

apps/web/src/
├── lib/
│   └── socket.ts                         <- NUEVO
├── hooks/
│   ├── use-socket.ts                     <- NUEVO
│   └── use-lobby.ts                      <- NUEVO
├── components/
│   └── lobby/
│       ├── player-avatar-pill.tsx         <- NUEVO
│       ├── lobby-page.tsx                <- NUEVO
│       └── create-room-button.tsx        <- NUEVO
└── styles.css                            <- MODIFICAR (agregar Tailwind)

libs/shared/src/
├── websocket/
│   └── events.ts                         <- NUEVO
├── dto/
│   └── room.dto.ts                       <- NUEVO
├── constants/
│   └── player-colors.ts                  <- NUEVO
└── index.ts                              <- MODIFICAR (re-exports)
```

Archivos a modificar:

```text
apps/api/src/main.ts                      <- MODIFICAR (RedisIoAdapter)
apps/api/src/app/app.module.ts            <- MODIFICAR (imports: RedisModule, GameModule)
apps/web/vite.config.ts                   <- MODIFICAR (Tailwind plugin, WS proxy)
apps/web/src/app/app.tsx                  <- MODIFICAR (ruta /room/:code)
apps/web/src/styles.css                   <- MODIFICAR (Tailwind theme)
.env.example                              <- MODIFICAR (REDIS_URL)
```

**Archivos que NO deben modificarse:**
- `apps/api/src/modules/auth/*` — NO tocar
- `apps/api/src/modules/users/*` — NO tocar
- `apps/api/src/modules/texts/*` — NO tocar (se consumira en story 2.4 via `match:start`)
- `apps/api/src/modules/geo/*` — NO tocar
- `prisma/schema.prisma` — NO tocar (rooms no se persisten en PostgreSQL)

### Advertencias clave para el dev agent

1. **nanoid v3 obligatorio:** v5 es ESM-only y rompe CJS de NestJS. `npm install nanoid@3`.
2. **Redis solo para rooms:** NO crear modelo Prisma para Room. Las rooms son efimeras.
3. **transports: ['websocket']:** En el socket client, NO usar polling. Evita la necesidad de sticky sessions con Redis adapter.
4. **JWT en afterInit, no en guard:** Verificar el JWT del handshake en `server.use()` dentro de `afterInit()`, no con un guard de NestJS (el contexto de DI no esta disponible ahi adecuadamente para WebSocket middleware).
5. **jsonwebtoken.verify directamente:** Para el middleware WS, importar `verify` de `jsonwebtoken` directamente. NO intentar inyectar `JwtService` de `@nestjs/jwt` en el middleware.
6. **Socket.IO rooms:** Usar el concepto de "rooms" de Socket.IO (`socket.join(code)`) para agrupar conexiones y hacer broadcast eficiente con `server.to(code).emit()`.
7. **Verificar proxy WS en Vite:** El proxy de Vite debe tener `ws: true` para la ruta `/socket.io`.
8. **PrismaService getter pattern:** Si se necesita acceder a datos de usuario (para obtener displayName/avatar al joinear), usar el getter existente `this.prisma.user`.
9. **Tailwind CSS v4:** Usar `@tailwindcss/vite` plugin y `@import "tailwindcss"` (no `@tailwind base/components/utilities` que era v3).
10. **Labels en espanol:** La UI debe estar en espanol: "Crear Sala", "Listo", "Iniciar", "Copiar Link", "Nivel de Dificultad".

### Git intelligence (patrones del proyecto)

Ultimos commits:
- `47b1275` 2-1-text-content-management: done
- `10de9d0` epic-1-retrospective: done
- `df8a5b3` 1-4-profile-dashboard-country-management: done

Patrones establecidos:
- Commits nombrados por story key
- Modulos NestJS autosuficientes (module + controller + service + specs)
- Shared lib para tipos y constantes reutilizables (`@ultimatype-monorepo/shared`)
- Tests con Vitest + `vi.fn()` + instanciacion manual (NO TestingModule)
- Lint: 20 warnings pre-existentes en API, 0 errores
- `@ultimatype-monorepo/shared` es el path alias correcto

### Hallazgos relevantes de story 2-1

- `tsx` ya instalado como devDependency (para seed scripts)
- `parseInt` vs `Number()` — usar `Number()` para validaciones estrictas (evitar parseo parcial)
- Vitest 4.x no soporta `--testFile` — usar `--testNamePattern`
- `PrismaService` expone modelos via getters (`get user()`, `get text()`)
- Shared lib tiene `project.json` con `executor: nx:noop` (ya buildable)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — User story y acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#FR5] — Crear sala con link compartible
- [Source: _bmad-output/planning-artifacts/epics.md#FR6] — Unirse via link directo o codigo
- [Source: _bmad-output/planning-artifacts/epics.md#FR7] — Host selecciona nivel de dificultad
- [Source: _bmad-output/planning-artifacts/epics.md#FR8] — Host inicia partida con 2+ listos
- [Source: _bmad-output/planning-artifacts/epics.md#FR9] — Hasta 20 jugadores activos
- [Source: _bmad-output/planning-artifacts/epics.md#FR15] — Colores de caret distintos automaticos
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Redis para estado efimero, PostgreSQL para persistencia
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST para CRUD, WebSocket para motor de juego
- [Source: _bmad-output/planning-artifacts/architecture.md#API Naming Conventions] — Eventos WS: dominio:accion
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — gateway/ para WebSocket, modules/ para REST
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] — JWT en handshake WS
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PlayerAvatarPill] — Componente sin bordes, tonal bg-surface-raised
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — Multiplayer Carets: paleta neon
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation] — Tailwind CSS + Radix/Headless
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#No-Line Rule] — Sin bordes, separacion tonal
- [Source: _bmad-output/planning-artifacts/prd.md#FR5-FR9] — Room management requirements
- [Source: _bmad-output/planning-artifacts/prd.md#NFR5] — WebSocket connection en ≤500ms
- [Source: _bmad-output/planning-artifacts/prd.md#NFR15] — 120 conexiones WS por sala (20 players + 100 spectators)
- [Source: _bmad-output/implementation-artifacts/2-1-text-content-management.md] — Patrones de modulos, tests, PrismaService

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- JWT payload usa `{ sub, email, displayName }` pero JwtStrategy.validate retorna `{ userId, email, displayName }` — adaptado el controller para usar `req.user.userId`
- avatarUrl no esta en el JWT — se busca del DB via UsersService.findById al crear/unirse a rooms
- nanoid v3.3.11 instalado correctamente (CJS compatible)
- Vite config usa extension .mts, no .ts

### Completion Notes List

- Task 1: Dependencias instaladas — @nestjs/websockets, @nestjs/platform-socket.io, socket.io 4.8.3, ioredis 5.10.1, @socket.io/redis-adapter, nanoid@3.3.11, socket.io-client, @types/ioredis, tailwindcss, @tailwindcss/vite
- Task 2: REDIS_URL agregado al esquema Zod con default `redis://localhost:6379`. Ya existia en .env.example
- Task 3: RedisModule global creado con REDIS_CLIENT token. RedisService wrapper con metodos hash. 11 tests
- Task 4: RedisIoAdapter extiende IoAdapter con pub/sub Redis. main.ts actualizado con adapter antes de listen()
- Task 5: Tipos compartidos: WS_EVENTS, PlayerInfo, RoomState, CreateRoomResponse, PLAYER_COLORS (20 colores neon), MAX_PLAYERS
- Task 6: RoomsService con operaciones Redis: createRoom, joinRoom, leaveRoom, getRoomState, setLevel, setReady, canStart, setRoomStatus. Asignacion de color por primer indice libre. Promocion de host automatica. 21 tests
- Task 7: RoomsController con POST /api/rooms (protegido) y GET /api/rooms/:code (publico). Busca avatarUrl del DB. 4 tests
- Task 8: GameGateway con JWT middleware en afterInit usando jsonwebtoken.verify. Handlers para lobby:join/leave/ready/select-level/start. handleDisconnect con cleanup. Map de connections socket→user. 12 tests
- Task 9: RedisModule y GameModule registrados en AppModule
- Task 10: Tailwind CSS v4 configurado con @tailwindcss/vite plugin. Tema con tokens UX. Proxy para /api y /socket.io (ws:true) en Vite dev server
- Task 11: Socket client singleton con auth JWT, transports websocket-only, connectSocket/disconnectSocket
- Task 12: useSocket hook y useLobby hook con estado local via useState (no Zustand). Auto-connect, join, cleanup de listeners
- Task 13: PlayerAvatarPill sin bordes (No-Line Rule), color dinamico, iniciales/avatar, badge Host, estado Listo/Esperando. LobbyPage con lista players, selector nivel, botones Listo/Iniciar/Salir/Copiar Link. CreateRoomButton con POST REST
- Task 14: Ruta /room/:code protegida en app.tsx. Boton "Crear Sala" en Home para usuarios autenticados
- Task 15: 8 tests PlayerAvatarPill + 5 tests LobbyPage = 13 tests frontend
- Task 16: Regresion OK — API 95 tests (0 fail), Web 15 tests (0 fail), Lint API 0 errors 43 warnings (pre-existente), Lint Web 0 errors 2 warnings (pre-existente)

### File List

**Nuevos:**
- apps/api/src/redis/redis.module.ts
- apps/api/src/redis/redis.service.ts
- apps/api/src/redis/redis.service.spec.ts
- apps/api/src/gateway/redis-io.adapter.ts
- apps/api/src/gateway/game.gateway.ts
- apps/api/src/gateway/game.gateway.spec.ts
- apps/api/src/gateway/game.module.ts
- apps/api/src/modules/rooms/rooms.module.ts
- apps/api/src/modules/rooms/rooms.service.ts
- apps/api/src/modules/rooms/rooms.service.spec.ts
- apps/api/src/modules/rooms/rooms.controller.ts
- apps/api/src/modules/rooms/rooms.controller.spec.ts
- apps/web/src/lib/socket.ts
- apps/web/src/hooks/use-socket.ts
- apps/web/src/hooks/use-lobby.ts
- apps/web/src/components/lobby/player-avatar-pill.tsx
- apps/web/src/components/lobby/player-avatar-pill.spec.tsx
- apps/web/src/components/lobby/lobby-page.tsx
- apps/web/src/components/lobby/lobby-page.spec.tsx
- apps/web/src/components/lobby/create-room-button.tsx
- libs/shared/src/websocket/events.ts
- libs/shared/src/dto/room.dto.ts
- libs/shared/src/constants/player-colors.ts

**Modificados:**
- apps/api/src/main.ts
- apps/api/src/app/app.module.ts
- apps/web/vite.config.mts
- apps/web/src/styles.css
- apps/web/src/app/app.tsx
- libs/shared/src/index.ts
- package.json
- package-lock.json

### Change Log

- 2026-03-27: Implementacion completa de Story 2.2 — Room Creation & Lobby. Infraestructura WebSocket con Redis adapter, gestion de rooms efimera en Redis, GameGateway con autenticacion JWT, componentes de lobby frontend con Tailwind CSS, 110 tests totales (95 API + 15 Web) sin regresiones.
