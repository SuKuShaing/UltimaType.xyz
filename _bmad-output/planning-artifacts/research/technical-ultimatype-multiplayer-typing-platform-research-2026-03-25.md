---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Plataforma de competencia de tipeo multiplayer en tiempo real con React, TanStack Query, NestJS, PostgreSQL, Redis, WebSockets y despliegue en CubePath'
research_goals: 'Evaluar y validar el stack tecnológico propuesto para una plataforma de competencia de tipeo en vivo con sincronización de carets en tiempo real, autenticación OAuth (Google + GitHub), sistema de gestión de textos con niveles de dificultad, y caching client-side con TanStack Query'
user_name: 'Seba'
date: '2026-03-25'
web_research_enabled: true
source_verification: true
---

# Investigación Técnica: UltimaType — Plataforma de Competencia de Tipeo Multiplayer en Tiempo Real

**Fecha:** 2026-03-25  
**Autor:** Seba  
**Tipo:** Investigación Técnica  

---

## Resumen Ejecutivo

Esta investigación evalúa el stack tecnológico propuesto para **UltimaType**: React + TanStack Query (frontend), NestJS + Socket.IO (backend), PostgreSQL (persistencia), Redis (estado en tiempo real y pub/sub), con despliegue en CubePath vía Dokploy (Docker).

**Conclusión principal:** El stack propuesto es **sólido y bien validado** para este tipo de aplicación. Socket.IO sobre NestJS provee la mejor relación costo-beneficio para la V1, Redis es ideal para estado de partida y sincronización de carets, y TanStack Query optimiza la experiencia del cliente con caching inteligente.

### Hallazgos Clave

| Área | Recomendación | Nivel de Confianza |
|---|---|---|
| Comunicación en tiempo real | Socket.IO via `@nestjs/websockets` | 🟢 Alto |
| Estado de partida | Redis Hashes + Pub/Sub | 🟢 Alto |
| Persistencia | PostgreSQL con TypeORM/Prisma | 🟢 Alto |
| Caching client-side | TanStack Query v5 | 🟢 Alto |
| Autenticación | Passport.js + JWT (Google + GitHub OAuth) | 🟢 Alto |
| Despliegue | CubePath + Dokploy (Docker containers) | 🟢 Alto |
| Sincronización de carets | Throttled WebSocket broadcasts (50-100ms) | 🟢 Alto |

---

## 1. Análisis de Arquitectura del Sistema

### 1.1 Arquitectura General Propuesta

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTES (React)                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ TanStack  │  │ Socket.IO    │  │ REST API Client   │  │
│  │ Query     │  │ Client       │  │ (fetch/axios)     │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
└───────┼────────────────┼───────────────────┼────────────┘
        │ HTTP           │ WebSocket         │ HTTP
        │                │                   │
┌───────▼────────────────▼───────────────────▼────────────┐
│                    NestJS Backend                        │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ REST         │  │ WebSocket     │  │ Auth Module  │  │
│  │ Controllers  │  │ Gateway       │  │ (Passport)   │  │
│  │ (CRUD, Auth) │  │ (Socket.IO)   │  │              │  │
│  └──────┬───────┘  └───────┬───────┘  └──────────────┘  │
│         │                  │                             │
│  ┌──────▼──────────────────▼────────────────────────┐   │
│  │              Capa de Servicios                     │   │
│  │  GameService  │  MatchService  │  TextService     │   │
│  └──────┬────────────────┬───────────────┬──────────┘   │
└─────────┼────────────────┼───────────────┼──────────────┘
          │                │               │
   ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
   │ PostgreSQL  │  │   Redis   │  │ PostgreSQL  │
   │ (Usuarios,  │  │ (Estado   │  │ (Textos,    │
   │  Rankings)  │  │  partida, │  │  Niveles)   │
   │             │  │  Pub/Sub) │  │             │
   └─────────────┘  └───────────┘  └─────────────┘
```

### 1.2 Flujo de una Partida Multiplayer

1. **Lobby/Sala de Espera** → REST API crea la sala, WebSocket la une
2. **Countdown** → Gateway emite evento `game:countdown` a la room
3. **Partida en Curso** → Cada keystroke emite posición del caret vía WebSocket
4. **Sincronización de Carets** → Redis almacena posiciones, broadcast a todos los jugadores
5. **Fin de Partida** → Se calculan WPM, precisión; se persisten resultados en PostgreSQL

---

## 2. Stack Tecnológico — Evaluación Detallada

### 2.1 Socket.IO vs WebSocket Nativo

**Recomendación: Socket.IO** (via `@nestjs/platform-socket.io`)

| Criterio | WebSocket Nativo | Socket.IO | ¿Por qué importa para UltimaType? |
|---|---|---|---|
| Reconexión automática | ❌ Manual | ✅ Built-in | Jugadores con conexión inestable |
| Rooms/Salas | ❌ Manual | ✅ Built-in | Cada partida es una "room" |
| Broadcasting | ❌ Manual | ✅ `server.to(room).emit()` | Broadcast de carets a todos |
| Namespaces | ❌ N/A | ✅ `/game`, `/lobby` | Separar tráfico de juego vs lobby |
| Fallback transports | ❌ Solo WS | ✅ HTTP long-polling fallback | Compatibilidad amplia |
| Overhead de mensajes | Mínimo | ~2-5% mayor | Aceptable para esta escala |
| Escalabilidad Redis | ❌ Manual | ✅ `@socket.io/redis-adapter` | Escalar horizontalmente |

**Fuentes:** [Ably — Socket.IO vs WebSocket](https://ably.com/topic/socketio-vs-websocket), [VideoSDK — NestJS WebSocket 2025](https://www.videosdk.live/developer-hub/websocket/nest-js-websocket), [Velt — Socket.IO vs WebSocket Guide 2025](https://velt.dev/blog/socketio-vs-websocket-guide-developers)

> **Nota:** Para la escala de UltimaType V1 (~100-500 conexiones concurrentes), el overhead de Socket.IO es despreciable. La productividad ganada con rooms, namespaces y auto-reconnect justifica la elección.

### 2.2 NestJS WebSocket Gateway

NestJS provee integración de primera clase con WebSockets mediante el módulo `@nestjs/websockets`:

```typescript
// Ejemplo: Gateway de partida
@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('caret:update')
  handleCaretUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; position: number; wpm: number }
  ) {
    // Broadcast posición del caret a otros jugadores en la sala
    client.to(data.roomId).emit('caret:sync', {
      playerId: client.data.userId,
      position: data.position,
      wpm: data.wpm,
      timestamp: Date.now()
    });
  }
}
```

**Ventajas clave de NestJS para WebSockets:**
- Decoradores `@SubscribeMessage`, `@WebSocketServer`, `@ConnectedSocket`
- Lifecycle hooks: `handleConnection`, `handleDisconnect`
- Guards para autenticación JWT en WebSocket
- Inyección de dependencias con servicios compartidos entre REST y WS

**Fuentes:** [Medium — Real-Time Communication with WebSockets in React.js and NestJS](https://medium.com/sisalhubs/real-time-communication-with-websockets-in-react-js-and-nestjs-842337fbade3), [Medium — Scaling WebSockets with NestJS](https://medium.com/@hydrurdgn/scaling-websockets-with-nestjs-in-a-microservices-architecture-1fbfbf870b5a)

### 2.3 Redis — Estado de Partida y Sincronización

**Uso recomendado de Redis para UltimaType:**

| Estructura Redis | Uso en UltimaType | TTL |
|---|---|---|
| `Hash` — `game:{id}:info` | Estado de la partida (fase, texto_id, countdown) | 2 horas |
| `Hash` — `game:{id}:player:{pid}` | Posición del caret, WPM, precisión por jugador | 2 horas |
| `Set` — `game:{id}:players` | Lista de jugadores en la partida | 2 horas |
| `Pub/Sub` — `game:{id}:events` | Notificaciones de eventos (start, finish, join) | N/A |
| `String` — `lobby:{id}` | Estado del lobby (jugadores en espera) | 30 min |

**Patrón de sincronización de carets:**

```typescript
// Servicio de partida
async updateCaretPosition(gameId: string, playerId: string, position: number, wpm: number) {
  const key = `game:${gameId}:player:${playerId}`;
  
  // Actualización atómica con pipeline
  const pipe = this.redis.pipeline();
  pipe.hset(key, {
    position: position.toString(),
    wpm: wpm.toString(),
    lastUpdate: Date.now().toString()
  });
  pipe.expire(key, 7200);
  await pipe.exec();
}
```

**Fuentes:** [OneUptime — How to Implement Game State Management with Redis (2026)](https://oneuptime.com/blog/post/2026-01-21-redis-game-state-management/view), [OneUptime — Redis Pub/Sub Patterns for Real-Time Event Broadcasting (2026)](https://oneuptime.com/blog/post/2026-02-09-redis-pubsub-event-broadcasting/view)

> **Insight crítico:** Usar Lua scripts para operaciones atómicas que requieren múltiples lecturas/escrituras, como la validación de fin de partida.

### 2.4 PostgreSQL — Persistencia

**Esquema de datos principales (no en tiempo real):**

| Tabla | Propósito |
|---|---|
| `users` | Perfil del usuario, OAuth tokens, avatar |
| `texts` | Textos para tipear (contenido, fuente, dificultad) |
| `text_sources` | Fuentes de textos (categoría, metadatos) |
| `matches` | Historial de partidas completadas |
| `match_results` | Resultados individuales (WPM, precisión, puesto) |
| `difficulty_levels` | Configuración de niveles de dificultad |

**ORM Recomendado:** Prisma (type-safety, migraciones, excelente DX con NestJS)

> **Nota sobre separación de responsabilidades:** PostgreSQL almacena datos permanentes; Redis maneja estado efímero de partida. Al terminar una partida, los resultados se persisten de Redis → PostgreSQL.

### 2.5 TanStack Query v5 — Caching Client-Side

**Casos de uso específicos para UltimaType:**

| Query Key | Datos | staleTime | gcTime |
|---|---|---|---|
| `['user', userId]` | Perfil, avatar, nombre | 5 min | 30 min |
| `['texts', difficultyId]` | Lista de textos por dificultad | 10 min | 1 hora |
| `['difficulty-levels']` | Niveles de dificultad disponibles | 30 min | 1 hora |
| `['match-history', userId]` | Historial de partidas | 2 min | 10 min |

```typescript
// Hook para datos de usuario con caching
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    staleTime: 5 * 60 * 1000,   // 5 min antes de refetch
    gcTime: 30 * 60 * 1000,     // 30 min en garbage collection
  });
}
```

**Integración con WebSocket:** TanStack Query se complementa con WebSocket. Los datos estáticos (perfil, textos) se cachean con TanStack Query, mientras que los datos en tiempo real (posición de carets) fluyen directamente por WebSocket sin pasar por TanStack Query.

**Fuentes:** [TanStack Query v5 Docs — Caching Examples](https://tanstack.com/query/v5/docs/react/guides/caching), [DEV Community — TanStack Query v5 + React + Vite](https://dev.to/myogeshchavan97/react-query-complete-beginners-guide-tanstack-query-v5-react-vite-4h60), [Reddit — Understanding Tanstack Query reactivity](https://www.reddit.com/r/react/comments/1jm2gxz/understanding_tanstack_query_reactivity_and_best/)

### 2.6 Autenticación — OAuth 2.0 (Google + GitHub)

**Stack recomendado:**

```
@nestjs/passport + passport-google-oauth20 + passport-github2 + @nestjs/jwt
```

**Flujo:**

1. Frontend redirige a `/auth/google` o `/auth/github`
2. NestJS AuthGuard maneja el callback OAuth
3. Se crea/actualiza usuario en PostgreSQL
4. Se retorna JWT (access token + refresh token)
5. JWT se envía en headers HTTP y en handshake de Socket.IO

```typescript
// Guard de WebSocket para validar JWT
@UseGuards(WsJwtGuard)
@SubscribeMessage('game:join')
handleJoinGame(@ConnectedSocket() client: Socket, @MessageBody() data: JoinGameDto) {
  const userId = client.data.user.id;  // Extraído del JWT en el guard
  // ...
}
```

**Fuentes:** [Medium — Multi-Provider OAuth2 Authentication in NestJS (2024)](https://medium.com/@camillefauchier/multi-provider-oauth2-authentication-in-nestjs-beyond-basic-jwt-7945ece51bb3), [DEV Community — Implement Google OAuth in NestJS using Passport](https://dev.to/chukwutosin_/implement-google-oauth-in-nestjs-using-passport-1j3k), [GitHub — nestjs-social-login](https://github.com/m-haecker/nestjs-social-login)

### 2.7 Despliegue — CubePath + Dokploy

**Dokploy** es un PaaS open-source auto-hospedado que simplifica el despliegue de aplicaciones vía Docker en VPS. Se instala en el servidor CubePath y gestiona contenedores, dominios, SSL, y redeploys automáticos.

**Arquitectura de despliegue:**

```yaml
# docker-compose.yml (gestionado por Dokploy)
version: '3.8'
services:
  api:
    build: ./apps/api
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: always

  web:
    build: ./apps/web
    ports:
      - '80:80'
    depends_on:
      - api

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=ultimatype
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes

volumes:
  pgdata:
  redisdata:
```

**Ventajas de Dokploy sobre PM2 directo:**
- **Despliegue declarativo** — Docker Compose define toda la infraestructura
- **Aislamiento** — Cada servicio en su propio contenedor
- **SSL automático** — Dokploy gestiona certificados Let's Encrypt
- **Redeploy con un clic** — Push a Git → redeploy automático
- **PostgreSQL y Redis como servicios** — No requieren instalación manual
- **Rollbacks** — Volver a versiones anteriores fácilmente

> ⚠️ **Consideración WebSocket con Docker:** Asegurar que el reverse proxy (Traefik/Nginx incluido en Dokploy) tenga configurado correctamente el soporte de WebSocket (`Upgrade` headers). Dokploy maneja esto por defecto.

**Fuentes:** [Dokploy — Deploy Apps with Docker Compose 2025](https://dokploy.com/blog/how-to-deploy-apps-with-docker-compose-in-2025), [YouTube — Dokploy: Deploy to VPS in 2025](https://www.youtube.com/watch?v=ELkPcuO5ebo)

---

## 3. Sincronización de Carets en Tiempo Real — Diseño Técnico

### 3.1 Arquitectura de Sincronización

Este es el componente más crítico y diferenciador de UltimaType. El objetivo: que cada jugador vea las posiciones de los carets de todos los demás en tiempo real.

**Patrones investigados:**

| Patrón | Latencia | Complejidad | Escalabilidad |
|---|---|---|---|
| Broadcast directo por keystroke | ~10-20ms | Baja | Baja (excesivo tráfico) |
| **Throttled broadcast (50-100ms)** | ~50-100ms | Media | **Alta** ✅ |
| Delta state updates | ~50ms | Alta | Alta |
| Server-side interpolation | ~100-200ms | Muy alta | Alta |

**Recomendación: Throttled broadcast a 50-100ms** — Suficientemente rápido para visualización fluida de carets, sin saturar la red.

### 3.2 Flujo de Sincronización de Carets

```
Jugador A teclea →  Client debounce/throttle (50ms)
                    → WebSocket emit 'caret:update' { position, wpm, accuracy }
                    → NestJS Gateway recibe
                    → Redis HSET actualiza estado del jugador
                    → Gateway broadcast a room (excluye al emisor)
                    → Jugadores B, C, D reciben 'caret:sync'
                    → React actualiza posiciones de carets con interpolación CSS
```

### 3.3 Optimización del Cliente

```typescript
// Hook de throttle para emitir posición del caret
function useCaretSync(socket: Socket, roomId: string) {
  const throttledEmit = useCallback(
    throttle((position: number, wpm: number) => {
      socket.emit('caret:update', { roomId, position, wpm });
    }, 50),  // Máximo 20 actualizaciones/segundo
    [socket, roomId]
  );
  
  return throttledEmit;
}
```

### 3.4 Proyectos de Referencia

| Proyecto | Stack | Relevancia |
|---|---|---|
| [TYPECHAMP](https://www.reddit.com/r/IndieGaming/comments/1qedl70/) | WebSocket + cursores en tiempo real | Validación directa del concepto de cursor sync |
| [TypeDuel](https://github.com/8tp/typeduel) | Multiplayer typing combat | Mecánica de tipeo competitivo con daño basado en WPM |
| [Monkeytype](https://monkeytype.com/) | Solo play (sin multiplayer aún) | Referencia de UX y mecánica de tipeo |
| [TypeRacer](https://play.typeracer.com/) | Multiplayer con progreso visual | Referencia de la experiencia de "carrera" |

**Fuentes:** [Reddit — TYPECHAMP multiplayer typing race](https://www.reddit.com/r/IndieGaming/comments/1qedl70/), [GitHub — TypeDuel](https://github.com/8tp/typeduel), [GitHub — Monkeytype multiplayer discussion](https://github.com/monkeytypegame/monkeytype/discussions/7452)

---

## 4. Sistema de Textos Multi-Fuente con Niveles de Dificultad

### 4.1 Modelo de Datos para Textos

```
text_sources (fuentes)
├── id, name, description, type (manual, api, scraping)
└── metadata (URL de API, configuración)

texts (textos individuales)
├── id, content, language, word_count, character_count
├── source_id (FK → text_sources)
├── difficulty_level_id (FK → difficulty_levels)
├── avg_completion_time, times_played
└── is_active, created_at

difficulty_levels (niveles)
├── id, name, slug, level_order
├── description
├── allowed_chars (regex/set de caracteres permitidos)
├── includes_lowercase, includes_uppercase
├── includes_punctuation, includes_numbers, includes_symbols
└── icon, color (para UI)
```

### 4.2 Sistema de 5 Niveles por Dominio del Teclado

Los niveles se definen por **dominio progresivo del teclado** — cada nivel añade un nuevo conjunto de caracteres:

| Nivel | Nombre | Caracteres Incluidos | Ejemplo |
|---|---|---|---|
| 1️⃣ | **Solo Minúsculas** | `a-z` + espacios | `the quick brown fox jumps over the lazy dog` |
| 2️⃣ | **Mayúsculas y Minúsculas** | `a-z`, `A-Z` + espacios | `The Quick Brown Fox Jumps Over The Lazy Dog` |
| 3️⃣ | **+ Puntuación** | Niveles anteriores + `, . ; : - '` | `The fox, jumping quickly; crossed the road.` |
| 4️⃣ | **+ Números** | Niveles anteriores + `0-9` | `En 1969, el Apollo 11 aterrizó; 3 astronautas.` |
| 5️⃣ | **+ Símbolos** | Niveles anteriores + `!"#$%&/()=?'¿*[]{}+@` | `console.log("Hello!"); // cost = $99 & tax (15%)` |

> **Filosofía:** El nivel no cambia la longitud del texto, sino la complejidad de los caracteres requeridos. Un texto de Nivel 1 puede tener la misma cantidad de palabras que uno de Nivel 5, pero el Nivel 5 exige dominio completo del teclado.

**Validación de textos por nivel:**

```typescript
// Regex de validación por nivel
const LEVEL_PATTERNS = {
  1: /^[a-z\s]+$/,                                    // Solo minúsculas
  2: /^[a-zA-Z\s]+$/,                                 // + Mayúsculas
  3: /^[a-zA-Z\s,.;:'\-]+$/,                           // + Puntuación
  4: /^[a-zA-Z0-9\s,.;:'\-]+$/,                        // + Números
  5: /^[\x20-\x7E\xA1\xBF\xC0-\xFF]+$/,               // + Símbolos (ASCII extendido)
};
```

### 4.3 Ingesta de Textos Multi-Fuente

**Interfaz administrativa** para agregar textos:
1. **Manual** — Input directo de texto con clasificación de dificultad
2. **Importación en lote** — CSV/JSON con textos pre-clasificados
3. **API externa** — Integración futura con APIs de citas/libros (e.g., Quotable API)

> **Recomendación V1:** Empezar con ingesta manual + importación por lote. La integración con APIs externas puede ser V2.

---

## 5. Patrones de Integración

### 5.1 Separación REST vs WebSocket

| Funcionalidad | Protocolo | Justificación |
|---|---|---|
| Login/Registro OAuth | REST | Flujo OAuth estándar por HTTP |
| CRUD de perfil de usuario | REST | Operaciones no en tiempo real |
| Listar/crear salas (lobbies) | REST | TanStack Query cachea la lista |
| Unirse a una sala | WebSocket | Suscripción en tiempo real a la room |
| Sincronización de carets | WebSocket | Baja latencia, alta frecuencia |
| Countdown de partida | WebSocket | Sincronización temporal |
| Resultados de partida | REST + WS | WS notifica fin, REST persiste y consulta |
| Obtener textos | REST | TanStack Query cachea por dificultad |

### 5.2 Modelo de Eventos WebSocket

```typescript
// Eventos Client → Server
'lobby:create'     // Crear nueva sala
'lobby:join'       // Unirse a sala existente
'lobby:leave'      // Salir de sala
'lobby:ready'      // Jugador listo
'game:start'       // Host inicia partida
'caret:update'     // Actualizar posición del caret
'game:finish'      // Jugador termina el texto

// Eventos Server → Client
'lobby:updated'    // Estado del lobby actualizado
'lobby:player-joined'  // Nuevo jugador entró
'lobby:player-left'    // Jugador salió
'game:countdown'   // Countdown antes de empezar
'game:started'     // Partida iniciada (incluye texto)
'caret:sync'       // Posiciones de carets de otros jugadores
'game:player-finished' // Un jugador terminó
'game:results'     // Resultados finales de la partida
```

---

## 6. Consideraciones de Rendimiento y Escalabilidad

### 6.1 Métricas Objetivo

| Métrica | V1 Target | Justificación |
|---|---|---|
| Latencia de caret sync | < 100ms | Perceptivamente "en tiempo real" |
| Conexiones WS concurrentes | 500+ | ~50-100 salas activas |
| Jugadores por sala | 2-8 | Límite razonable para V1 |
| Tick rate de carets | 20 Hz (50ms) | Fluido sin saturar la red |
| Tiempo de inicio de partida | < 2s | Countdown + envío de texto |

### 6.2 Estrategias de Optimización

1. **Throttle del cliente** — Limitar emisiones de `caret:update` a cada 50ms
2. **Redis pipeline** — Batch de actualizaciones de estado
3. **Socket.IO rooms** — Broadcasting eficiente solo dentro de la sala
4. **TanStack Query** — Evita requests innecesarios al servidor (datos estáticos)
5. **Docker containers via Dokploy** — Escalar horizontalmente en CubePath
6. **Interpolación CSS en el cliente** — Movimiento suave de carets entre actualizaciones

### 6.3 Escalabilidad Horizontal

```
                    ┌──────────────┐
                    │  Traefik /   │
                    │  Nginx       │
                    │  (Reverse    │
                    │   Proxy +    │
                    │   WS support)│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──┐  ┌──────▼─────┐  ┌──▼──────────┐
    │ Docker     │  │ Docker     │  │ Docker      │
    │ Container 1│  │ Container 2│  │ Container 3 │
    │ (NestJS)   │  │ (NestJS)   │  │ (NestJS)    │
    └─────┬──────┘  └─────┬──────┘  └─────┬───────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
              ┌───────────┼───────────┐
              │                       │
       ┌──────▼───────┐      ┌───────▼──────┐
       │    Redis     │      │  PostgreSQL  │
       │  (Adapter +  │      │   (Docker)   │
       │  Game State) │      │              │
       └──────────────┘      └──────────────┘
```

> **Nota:** Dokploy gestiona el stack completo como Docker Compose. `@socket.io/redis-adapter` sigue siendo necesario si se escala a múltiples contenedores NestJS.

---

## 7. Riesgos Técnicos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Latencia de carets perceptible | Media | Alto | Throttle + interpolación CSS + Redis en el mismo datacenter |
| Desconexiones durante partida | Alta | Alto | Socket.IO auto-reconnect + estado en Redis para reconexión |
| Dokploy/Traefik no pasa WebSocket headers | Baja | Crítico | Verificar configuración de `Upgrade` headers en reverse proxy; Dokploy lo soporta por defecto |
| Redis pierde estado si se cae | Baja | Medio | TTLs cortos + partida se invalida si Redis falla (gracia) |
| Concurrencia en fin de partida | Media | Medio | Lua scripts atómicos en Redis para determinar ganador |
| OAuth token expirado durante partida | Media | Bajo | Refresh token silencioso; JWT con vida de 1h |

---

## 8. Dependencias Principales Recomendadas

### Backend (NestJS)
```json
{
  "@nestjs/core": "^10.x",
  "@nestjs/websockets": "^10.x",
  "@nestjs/platform-socket.io": "^10.x",
  "@nestjs/passport": "^10.x",
  "@nestjs/jwt": "^10.x",
  "passport-google-oauth20": "^2.x",
  "passport-github2": "^0.1.x",
  "@socket.io/redis-adapter": "^8.x",
  "ioredis": "^5.x",
  "@prisma/client": "^5.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

### Frontend (React)
```json
{
  "react": "^18.x",
  "@tanstack/react-query": "^5.x",
  "socket.io-client": "^4.x",
  "react-router-dom": "^6.x"
}
```

---

## 9. Recomendaciones para Próximos Pasos

1. **PRD (Product Requirements Document)** — Documentar requisitos funcionales y no funcionales formalmente
2. **Arquitectura Técnica** — Diseñar esquema de base de datos, diagramas de secuencia detallados, y contratos de API
3. **Prueba de Concepto** — Implementar el flujo mínimo: 2 jugadores, 1 texto, carets sincronizados
4. **Verificar CubePath** — Confirmar soporte para WebSocket y Redis en el plan contratado
5. **Diseño UX** — Integrar los bosquejos existentes (Kinetic Monospace) con los flujos técnicos definidos

---

## Fuentes Verificadas

| # | Fuente | Fecha | Relevancia |
|---|---|---|---|
| 1 | [VideoSDK — Mastering NestJS WebSocket 2025](https://www.videosdk.live/developer-hub/websocket/nest-js-websocket) | 2025 | NestJS WebSocket gateway setup, Redis scaling |
| 2 | [OneUptime — Redis Game State Management](https://oneuptime.com/blog/post/2026-01-21-redis-game-state-management/view) | 2026-01-21 | Redis patterns para estado de juego |
| 3 | [Ably — Socket.IO vs WebSocket](https://ably.com/topic/socketio-vs-websocket) | 2025-05-15 | Comparación detallada de tradeoffs |
| 4 | [Dokploy — Deploy Apps with Docker Compose 2025](https://dokploy.com/blog/how-to-deploy-apps-with-docker-compose-in-2025) | 2025 | Despliegue Docker vía Dokploy |
| 5 | [Medium — Multi-Provider OAuth2 in NestJS](https://medium.com/@camillefauchier/multi-provider-oauth2-authentication-in-nestjs-beyond-basic-jwt-7945ece51bb3) | 2024-01-19 | OAuth Google+GitHub con Passport |
| 6 | [TanStack Query v5 — Caching Docs](https://tanstack.com/query/v5/docs/react/guides/caching) | Actual | Patrones de caching |
| 7 | [OneUptime — Redis Pub/Sub Patterns](https://oneuptime.com/blog/post/2026-02-09-redis-pubsub-event-broadcasting/view) | 2026-02-09 | Pub/Sub para broadcasting |
| 8 | [GitHub — TypeDuel](https://github.com/8tp/typeduel) | 2024 | Referencia de typing multiplayer |
| 9 | [Reddit — TYPECHAMP](https://www.reddit.com/r/IndieGaming/comments/1qedl70/) | 2024 | Validación del concepto de cursor sync |
| 10 | [Medium — WebSockets in React.js and NestJS](https://medium.com/sisalhubs/real-time-communication-with-websockets-in-react-js-and-nestjs-842337fbade3) | 2024 | Implementación React + NestJS WebSocket |
