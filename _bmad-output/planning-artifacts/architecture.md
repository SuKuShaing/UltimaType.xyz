---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-26'
inputDocuments: 
  - file:///d:/Progra/Proyectos_personales/UltimaType/_bmad-output/planning-artifacts/prd.md
  - file:///d:/Progra/Proyectos_personales/UltimaType/_bmad-output/planning-artifacts/research/technical-ultimatype-multiplayer-typing-platform-research-2026-03-25.md
  - file:///d:/Progra/Proyectos_personales/UltimaType/_bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
project_name: 'UltimaType'
user_name: 'Seba'
date: '2026-03-26T14:55:17-03:00'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
El proyecto UltimaType requiere una arquitectura dividida claramente entre operaciones en tiempo real y operaciones REST estándar. La funcionalidad principal exige sincronización de baja latencia bidireccional para gestionar el "Live Caret Sync" (posiciones de los cursores de múltiples jugadores), inicio de partidas simultáneas, estados del lobby y métricas en vivo (WPM, precisión). Paralelamente, se necesita una sólida gestión de usuarios mediante OAuth 2.0 (Google/GitHub), administración y almacenamiento de textos con 5 niveles de dificultad, e historial de resultados y leaderboards. Estructuralmente, los componentes de frontend (LiveTextCanvas, MultiplayerCaret) deberán manipular el DOM de forma muy optimizada para no degradar el rendimiento a pesar de la alta frecuencia de eventos.

**Non-Functional Requirements:**
- **Rendimiento y Latencia:** Es vital mantener latencias percibidas ≤100ms y un "tick rate" de WebSocket de 50ms (20Hz). El frontend debe cargar rápido (FCP ≤1.5s, inicial <200KB gzip).
- **Escalabilidad:** Debe soportar ≥500 conexiones concurrentes y ≥100 salas simultáneas, además de hasta 100 espectadores pasivos por sala. Redis debe tolerar ≥10,000 operaciones por segundo.
- **Confiabilidad:** Autoreconexión eficiente de WebSockets y "graceful degradation".
- **UX/Visuals:** Aplicación estricta de la regla "No-Line", transiciones en tiempo real ("Focus Fade") y respuesta instantánea a los inputs físicos del teclado.

**Scale & Complexity:**
El proyecto se posiciona como una SPA distribuida moderna en tiempo real, de complejidad media-alta.
- Primary domain: Web / Real-Time SPA
- Complexity level: Media-Alta
- Estimated architectural components: ~9 (API REST, WebSocket Gateway, Motor PostgreSQL, Redis In-Memory State, Frontend Core Engine, UI/UX Headless Layer, Auth Service, Text Management, Leaderboard/History)

### Technical Constraints & Dependencies
- Uso exclusivo de Teclado físico en la arena de competencia (Desktop-First).
- Backend estructurado en NestJS + Socket.IO con **doble motor de datos**:
  - **Redis:** Exclusivo para el estado efímero del multijugador y sincronización de carets (Hashes, Pub/Sub).
  - **PostgreSQL:** Persistencia para datos históricos, resultados de partidas, perfiles de usuario, textos y leaderboards.
- Frontend React + TanStack Query para el caching y estado del cliente, evitando el re-render innecesario de componentes críticos.
- Despliegue en CubePath vía Dokploy (contenedores Docker). El Reverse Proxy (Traefik/Nginx) debe garantizar el soporte persistente de `Upgrade` headers para WebSockets.

### Cross-Cutting Concerns Identified
- **Seguridad y Anti-cheat:** Validación de progresión de texto en el servidor para evitar posiciones ilegales saltando caracteres.
- **Gestión de Estado Híbrido:** Interacción fluida entre TanStack Query (para datos cacheados asincrónicos desde PostgreSQL) y el control de estado efímero del WebSocket desde Redis.
- **Sincronización vs Sobrecarga de Render:** Emitir actualizaciones de UI (LiveTextCanvas y WPM en tiempo real) a alta frecuencia (20Hz) corre el riesgo de bloquear el hilo principal de React. Será crucial aislar/mermar estas actualizaciones para mantener <16ms por frame.

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Monorepo (React + Vite, NestJS) based on project requirements analysis.

### Starter Options Considered

1. **Turborepo Custom Setup:** Excelente para proyectos con Next.js, pero requiere configuración manual adicional para integrar limpiamente Vite (frontend) y NestJS (backend) estableciendo las dependencias compartidas y scripts manualmente.
2. **Nx Workspace (react-monorepo):** Solución de grado empresarial con generadores integrados out-of-the-box para React (con Vite) y NestJS. Proporciona caché de tareas, un árbol de dependencias claro y herramientas visuales, adaptándose perfectamente a despliegues en contenedores como manda la investigación de CubePath.

### Selected Starter: Nx Workspace (React + NestJS)

**Rationale for Selection:**
Nx es la opción más robusta y automatizada para un monorepo que combina específicamente React (vía Vite) y NestJS. A diferencia de Turborepo que está más enfocado en el ecosistema Next.js, Nx ofrece comandos nativos (`nx g @nx/nest:application`) para "andamiar" tanto el frontend como el backend de manera simultánea, compartiendo la misma configuración base de TypeScript, ESLint y Prettier. Su abstracción de caché acelerará las compilaciones durante el desarrollo.

**Initialization Command:**

```bash
npx create-nx-workspace@latest ultimatype-monorepo --preset=react-monorepo --bundler=vite --e2eTestRunner=none --style=css
# Posteriormente:
# npm install -D @nx/nest
# npx nx g @nx/nest:application api
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript por defecto globalmente (strict mode). Node.js como runtime principal.

**Styling Solution:**
Soporte integrado para Tailwind CSS post-inicialización en la app Vite, encajando en el requerimiento "No-Line" del UX.

**Build Tooling:**
Vite para la compilación y HMR del frontend React. Esbuild/Webpack para el backend NestJS. Nx coordinando el pipeline y la caché de las tareas de construcción unificadas.

**Testing Framework:**
Vitest configurado predeterminadamente para pruebas unitarias y de componentes rápidas.

**Code Organization:**
Adopta el patrón `/apps` (donde residirán `web` y `api`) y `/libs` (para el código compartido como Tipos genéricos de Payload WebSocket, DTOs y utilidades).

**Development Experience:**
Lanzamiento en paralelo nativo (`nx run-many -t serve`), tipado end-to-end garantizado, linting transversal y soporte de extensión oficial en editores.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- System Foundation: Nx Workspace (React+Vite / NestJS)
- Real-Time Communication: Socket.IO via `@nestjs/websockets`
- Data Persistence & ORM: PostgreSQL + Prisma ORM
- In-Memory Data Store: Redis (Pub/Sub & Hashes)

**Important Decisions (Shape Architecture):**
- Authentication: OAuth 2.0 (Google/GitHub) via Passport.js + JWT
- Client-Side State: Zustand (volatile game state) + TanStack Query (cached server state)
- UI/UX Layer: Tailwind CSS + Radix/shadcn (Headless UI) sin bordes interactivos

**Deferred Decisions (Post-MVP):**
- Ghost Racing Replays: Estructura de guardado para posiciones asincrónicas (V2)
- Panel de Administración y roles avanzados

### Data Architecture

- **Primary Database:** PostgreSQL (v16+) para integridad estructural (usuarios, historial, textos).
- **In-Memory Store:** Redis (v7+) para operaciones efímeras ultrarrápidas y sincronización (Pub/Sub) de Salas.
- **ORM:** Prisma (v5+) por su tipado robusto generado y soporte DTO en ecosistemas monorepo.
- **Caching Strategy:** State caching en cliente vía TanStack Query (TTL adaptativo) / State cache global en Servidor vía Redis.

### Authentication & Security

- **Auth Method:** JWT firmados con RS256 / HS256 generados luego del flujo OAuth (Passport.js).
- **Socket Security:** El Handshake de WebSockets estará protegido por middlewares de JWT.
- **Anti-Cheat:** Single source of truth. El servidor recibe posiciones, pero la validación final del estado "Completo" es validada contrastando el string final directamente en NestJS, no confiando ciega en el cliente.

### API & Communication Patterns

- **REST (HTTP):** Para inicialización del lobby, operaciones CRUD (usuarios, historiales) y Autenticación.
- **WebSockets (WSS):** Canal bidireccional enfocado exclusivamente al motor de juego (Lobby state local y sincronización de Carets).
- **Throttling/Rate Limits:** Broadcast de WebSockets limitados (throttled) a 50ms-100ms (10-20 actualizaciones/segundo) para mantener performance.

### Frontend Architecture

- **Framework:** React 18+ (bundled by Vite).
- **State Segregation:** 
  - *TanStack Query v5* para hidratar datos asíncronos REST.
  - *Zustand* para almacenar el estado del juego (`socket.on('caret:sync')`) desconectado del ciclo de render de la UI periférica.
- **Render Optimization:** Manipulación selectiva del DOM (Refs) en `LiveTextCanvas` para colorear letras instantáneamente (<16ms) sin provocar un re-render global de React.

### Infrastructure & Deployment

- **Hosting:** VPS CubePath con Dokploy.
- **Containerization:** Docker Compose manejado automáticamente por Dokploy. Aislando los servicios (`api`, `web`, `postgres`, `redis`).
- **CDN / Proxy:** Traefik/Nginx, con Headers `Upgrade` y `Connection` forzados para permitir WebSockets WSS en el puerto 443 SSL.

### Decision Impact Analysis

**Implementation Sequence:**
1. Setup de Nx Workspace (Estructura base, apps/web, apps/api).
2. Modelado de base de datos (Prisma Schema inicial para Perfiles y Textos) + Setup Redis.
3. Auth Flow (Passport JWT) en REST.
4. Core Game Engine (LiveTextCanvas en Cliente + Reducers locales).
5. Multiplayer Adapter (Socket.IO + Transmisión por Redis Pub/Sub).
6. Lobbies & Leaderboard (Uniendo piezas REST y WS).

**Cross-Component Dependencies:**
- Los módulos de autenticación (JWT) de NestJS deben estar disponibles para la abstracción del cliente WebSocket.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
Identificamos 4 áreas de conflicto donde diferentes agentes de IA podrían divergir, causando inconsistencias o bugs sutiles en la sincronización del estado y los despliegues.

### Naming Patterns

**Database Naming Conventions:**
- Tablas y columnas físicas en PostgreSQL usarán `snake_case` (ej. `match_results`, `created_at`).
- Prisma Schema mapeará todo a `camelCase` para uso en TypeScript (ej. `@@map("match_results")` pero expuesto transaccionalmente como `matchResults`).

**API Naming Conventions:**
- Endpoints REST en NestJS seguirán un formato plural unificado (ej. `/api/users`, `/api/matches`).
- Eventos WebSocket usarán nomenclatura namespace bidimensional: `dominio:acción` (ej. `lobby:join`, `caret:sync`), nunca strings arbitrarios ni UpperCamelCase.

**Code Naming Conventions:**
- Tipos e Interfaces en `libs/shared` usarán estricto `PascalCase` sin prefijo "I" (ej. `UserProfile`, no `IUserProfile`).
- **Sistema de Archivos:** Regla absoluta de `kebab-case.ts` para TODOS los nombres de archivos (ej. `live-text-canvas.tsx`, `auth-controller.ts`) para prevenir incidentes de case-sensitivity en CI/CD (Windows vs Linux).

### Structure Patterns

**Project Organization:**
- `apps/web`: Aplicación React/Vite (Frontend).
- `apps/api`: Aplicación NestJS (Backend).
- `libs/shared`: Tipos, DTOs compartidos (Zod schemas o Clases Validadoras) y utilidades de configuración unificadas en el ecosistema Nx.

**File Structure Patterns:**
- Componentes React: Un directorio por componente si requiere estilos o submódulos (ej. `apps/web/src/components/live-text-canvas/live-text-canvas.tsx`).

### Format Patterns

**API Response Formats:**
- Patrón estándar NestJS. Éxito devuelve código 2XX y el JSON directo (`{ id: 1, name: '...' }`).
- Listas y paginación devuelven envelop: `{ data: [...], meta: { total, page } }`.
- Errores estrictos usando `HttpException` de Nest: `{ statusCode: 400, message: "Detalle humano", error: "Bad Request" }`.

**Data Exchange Formats:**
- ISO 8601 Strings para todas las fechas viajando por WebSockets o REST (`2026-03-24T12:00:00Z`).

### Communication Patterns

**Event System Patterns:**
- Todo Emitted Event (Redis -> NestJS -> Client) debe incluir un `timestamp` (`Date.now()`) en el payload para permitir conciliación local (Client-Side Prediction & Server Reconciliation).

**State Management Patterns:**
- *TanStack Query v5:* Fetching imperativo/reactivo estándar para REST.
- *Zustand:* Almacena el estado global estable.
- *Bypass de React Muta-Ref (Live Caret Sync):* El evento de alta frecuencia `caret:sync` (20Hz) evitará disparar re-renderizados Reactivos masivos. Actualizará un ref interno del Canvas/Overlay transladando coordenadas CSS transform directamente (`ref.current.style.transform = ...`).

### Process Patterns

**Loading State Patterns:**
- Nomenclatura local de variables booleanas de estado debe usar `is` + Verbo de acción principal gerundio: `isFetchingMatches`, `isJoiningLobby`.

### Enforcement Guidelines

**All AI Agents MUST:**
- Respetar rigurosamente el `kebab-case` en archivos y directorios en todo el Workspace Nx base.
- Nunca atar suscripciones de eventos WebSocket directos (20Hz) a dependencias de Hooks de Contexto general que fuercen re-renders en React. Usar Zustand transitorio o direct-DOM manipulación con Refs para la arena de tipeo competitiva.
- Sincronizar todos los DTOs y tipos entre API (NestJS) y Web (React 19 + Vite) exportándolos siempre desde la librería monorepo `@ultimatype/shared` (`libs/shared/`).

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
ultimatype-monorepo/
├── docker-compose.yml            # Levanta infraestructura (PostgreSQL + Redis) local
├── nx.json                       # Configuración core de la Caché y Pipeline de Nx
├── package.json
├── apps/
│   ├── web/                      # [Frontend React 19 + Vite]
│   │   ├── tailwind.config.ts    # Tokens UX "Kinetic Monospace"
│   │   └── src/
│   │       ├── components/
│   │       │   ├── arena/        # Engine: LiveTextCanvas, SpectatorView, Caret
│   │       │   └── ui/           # Componentes base Radix UI / Headless
│   │       ├── hooks/            # useArenaSocket, Zustand store
│   │       └── lib/              # api-client (fetchers de TanStack Query)
│   └── api/                      # [Backend NestJS]
│       └── src/
│           ├── gateway/          # Motor WebSocket (Socket.IO + Redis Adapter)
│           ├── modules/
│           │   ├── auth/         # Passport JWT (Google/Github Auth)
│           │   ├── users/        # CRUD Perfiles e Historial
│           │   └── matches/      # Matchmaking y validación concurrente
│           └── prisma/           # schema.prisma y migraciones SQL
└── libs/
    └── shared/                   # Código omnipresente en el monorepo
        └── src/
            ├── dto/              # Validadores de carga compartida
            ├── types/            # Interfaces base (ej. MatchResult, UserProfile)
            └── websocket/        # Constantes y Eventos Tipados (ej. LOBBY_JOIN)
```

### Architectural Boundaries

**API Boundaries:**
- **REST vs WSS:** Operaciones asíncronas estándar (login, buscar rankings recientes) usan REST vía `lib/api-client.ts`. Toda sincronización en tiempo de juego (Live Sync) usa exclusivamente WebSockets sobre Socket.IO.

**Component Boundaries:**
- **React Render Isolation:** Los componentes dentro de `components/arena/` tienen estrictamente prohibido disparar renders globales en toda la aplicación. Utilizan referencias DOM mutables (Refs) unidas a escuchadores manuales de Zustand u eventos directos de Socket para sostener la demanda extrema de frames visuales.

**Data Boundaries:**
- **Prisma Isolation:** El SDK de `@prisma/client` solo es orquestado por `apps/api/src/modules`. El Frontend vive ajeno de la base de datos subyacente porque el tipado TypeScript cruza los dominios a través de `libs/shared`.

### Integration Points

**Internal Communication:**
- **Redis Pub/Sub:** Las instancias replicadas virtuales de NestJS usan Redis Adapter para hacer *broadcast* horizontal sincronizado de ticks de web sockets entre diferentes máquinas anfitrionas que sostienen un mismo "lobby".

**External Integrations:**
- OAuth 2.0 Providers (Autenticación nativa) se enrutan aisladamente a los flujos REST de `apps/api/src/modules/auth`.

### File Organization Patterns

**Source Organization:**
- NestJS agrupa por **Dominios Verticales** (Módulo, Servicio, Controlador por feature - ej. Perfiles, Torneos).
- React agrupa por **Capa y Funcionalidad** (Hooks de React, Librerías, Componentes Visuales Genéricos e interfaces interactivas de Arena separadas entre sí).

## Architecture Validation Results

### Coherence Validation ✅

- **Decision Compatibility:** La base tecnológica (React 19, Vite, Nx, NestJS, Prisma, PostgreSQL y Redis) conforma un ecosistema moderno absolutamente interoperable y perfectamente aislable bajo Docker/Dokploy. 
- **Pattern Consistency:** Existe una coherencia de tipo 100% end-to-end gracias al cruce unificado de DTOs en el espacio de trabajo de Nx.

### Requirements Coverage Validation ✅

- **Epic/Feature Coverage:** Los cuatro bloques cardinales (Live Engine WSS, Profiling, History y Auth) poseen espacios lógicos preestablecidos en Backend y Frontend.
- **Non-Functional Requirements Coverage:** El requerimiento de máxima sensibilidad a latencia (<100ms Ping / <16ms Frame Time Visual) está asegurado estructuralmente, prohibiendo los re- renders del Virtual DOM general de React en favor de transformaciones transitorias por `useRef` direct-DOM manipuladas desde la subscripción base del WebSocket.

### Implementation Readiness Validation ✅

- **Decision Completeness:** El entorno de trabajo, los puertos lógicos de base de datos, caché y websockets están definidos.
- **Structure Completeness:** Topología en árbol definida por completo, abarcando backend, frontend, configuraciones Docker y librerías transversales.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented (React 19, NestJS, Prisma, Redis, Nx)
- [x] Technology stack fully specified
- [x] Integration patterns defined (TanStack + Zustand + Native Refs)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (kebab-case, camelCase vs snake_case)
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Loading and UI State patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Nx monorepo boundaries established

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** High

**Key Strengths:** Abstracción del Live Game Data (Aislando React renders), Fuerte tipado estático SSR/CSR, Infraestructura auto-contenida Dokploy.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use `kebab-case` consistently for all files in the Nx monorepo.
- Do NOT utilize React state logic hooks (`useState`, `useContext`) for high-frequency DOM manipulation.
- Store all shared contracts and constants (DTOs, WSS namespace variables) in `libs/shared/src`.

**First Implementation Priority:**
Initialize the Nx Workspace and implement the primary project scaffolding:
`npx create-nx-workspace@latest ultimatype-monorepo --preset=react-monorepo --bundler=vite --e2eTestRunner=none --style=css`




