---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments: ['prd.md', 'architecture.md', 'ux-design-specification.md']
---

# UltimaType - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for UltimaType, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Un usuario puede registrarse e iniciar sesión usando OAuth de Google
FR2: Un usuario puede registrarse e iniciar sesión usando OAuth de GitHub
FR3: Un usuario autenticado puede ver y configurar su perfil (avatar, nombre, país asociado, estadísticas)
FR4: Un usuario puede mantener sesión persistida entre visitas
FR5: Un usuario puede crear una sala de competencia y recibir un link/código compartible
FR6: Un usuario puede unirse a una sala existente mediante link directo o código
FR7: El creador de la sala (host) puede seleccionar el nivel de dificultad
FR8: El host puede iniciar la partida cuando al menos 2 jugadores estén listos
FR9: La sala soporta hasta 20 jugadores activos simultáneos
FR10: La sala soporta hasta 100 espectadores simultáneos en modo read-only
FR11: Un usuario puede elegir unirse como espectador en lugar de jugador
FR12: Un espectador puede transicionar a jugador para la siguiente partida
FR13: El sistema presenta un texto aleatorio del nivel seleccionado a todos los jugadores simultáneamente
FR14: Cada jugador ve su propio caret y los carets de todos los demás jugadores posicionados sobre el texto en tiempo real
FR15: Cada jugador tiene un color de caret distinto asignado automáticamente
FR16: El sistema muestra un countdown (3-2-1) antes de iniciar la competencia
FR17: La UI activa el patrón Focus Fade al iniciar la competencia
FR18: El sistema calcula WPM y precisión en tiempo real durante la partida
FR19: La partida finaliza cuando todos los jugadores completan el texto o pasa un timeout
FR20: Un jugador puede reconectarse a una partida en curso si pierde conexión
FR21: Al finalizar, el sistema muestra una pantalla de resultados con ranking, WPM y precisión de cada jugador
FR22: Cualquier jugador puede iniciar una revancha desde la pantalla de resultados
FR23: El sistema persiste los resultados de cada partida para cada jugador participante
FR24: El sistema carga textos desde archivos JSON con estructura `{level, language, content}`
FR25: El sistema selecciona aleatoriamente un texto del nivel elegido para cada partida
FR26: El sistema soporta 5 niveles de dificultad progresivos (minúsculas → mayúsculas → puntuación → números → símbolos)
FR27: Un usuario puede ver el leaderboard global con los mejores WPM y el país de procedencia de cada jugador
FR28: Un usuario puede filtrar el leaderboard por nivel de dificultad
FR29: El sistema actualiza el leaderboard automáticamente al finalizar cada partida
FR30: Un usuario puede ver su historial de partidas con WPM, precisión, nivel y fecha
FR31: Un usuario puede ver su WPM promedio y su mejor marca personal
FR32: Un usuario puede ver su progresión a lo largo del tiempo
FR33: El sistema detecta y guarda el país del usuario mediante una Geo API en el primer inicio de sesión
FR34: El usuario puede modificar manualmente su país asociado desde la configuración de su perfil
FR35: Un usuario puede filtrar el leaderboard global para ver los jugadores más rápidos por país específico

### NonFunctional Requirements

NFR1: Latencia de sincronización de carets ≤100ms percibidos entre jugadores
NFR2: Intervalo de throttle de WebSocket = 50ms (20 updates/segundo por jugador)
NFR3: First Contentful Paint ≤1.5s en conexión 4G
NFR4: Time to Interactive ≤3s incluyendo carga de fuente Space Grotesk
NFR5: Conexión WebSocket establecida en ≤500ms
NFR6: Cálculo de WPM y precisión en ≤10ms (client-side, sin bloquear render)
NFR7: Bundle size inicial ≤200KB gzip
NFR8: Autenticación vía OAuth 2.0 exclusivamente (sin passwords propios)
NFR9: Tokens JWT con refresh token y expiración ≤24h
NFR10: Comunicación cifrada vía HTTPS/WSS en producción
NFR11: Validación server-side de acciones de partida (anti-cheat: no aceptar posiciones que salten caracteres)
NFR12: Rate limiting en endpoints REST (100 req/min por IP)
NFR13: Soporte para ≥500 usuarios concurrentes conectados
NFR14: Soporte para ≥100 salas activas simultáneamente
NFR15: Cada sala soporta hasta 120 conexiones WebSocket (20 jugadores + 100 espectadores)
NFR16: Redis maneja ≥10,000 operaciones/segundo
NFR17: PostgreSQL soporta escritura de resultados sin degradar consultas de leaderboard
NFR18: Uptime ≥99.5% durante el periodo de hackathon
NFR19: Reconexión automática de WebSocket con retry exponencial (max 5 intentos)
NFR20: Graceful degradation: si Redis falla, la app sigue funcional para crear nuevas partidas
NFR21: Zero data loss en resultados de partidas (PostgreSQL con WAL)
NFR22: Contraste de texto ≥4.5:1 en toda la UI
NFR23: Navegación por teclado completa fuera del área de competencia
NFR24: `aria-labels` en todos los botones e iconos interactivos
NFR25: Focus indicators visibles en elementos interactivos

### Additional Requirements

- **Starter Template**: Nx Workspace (React+Vite / NestJS) -> **IMPORTANT for Epic 1 Story 1**. El comando `npx create-nx-workspace@latest ultimatype-monorepo --preset=react-monorepo --bundler=vite --e2eTestRunner=none --style=css` es el núcleo de inicialización.
- **Data Architecture:** PostgreSQL (v16+) para integridad estructural, Redis (v7+) para operaciones efímeras ultrarrápidas y sincronización. ORM: Prisma (v5+).
- **Frontend State Management:** TanStack Query v5 para hidratar datos asíncronos REST. Zustand para estado de juego (WebSocket) desconectado del cliclo de render de UI. Manipulación selectiva DOM (Refs) en `LiveTextCanvas` para evitar re-render global de React.
- **Naming Conventions:** Tablas/columnas DB (`snake_case`), Prisma transaccional (`camelCase`). Endpoints REST pluralizados unificados (`/api/users`). Eventos WebSocket con namespace bidimensional `dominio:acción`. Código estrictamente en `PascalCase` sin prefijo 'I'. Archivos estrictamente limitados a `kebab-case.ts`.
- **Project Structure:** `apps/web` (React/Vite), `apps/api` (NestJS), `libs/shared` (Tipos, DTOs exportados para API y Web).
- **Performance/Scaling:** CDN/Proxy Traefik/Nginx con Upgrade headers forzadas para soportar WebSocket (WSS). Redis Pub/Sub para broadcast de lobbies en múltiples nodos.
- **Security:** Los handshakes WS corren bajo middlewares de JWT. Validación de estado en servidor para lógica anti-cheat. 

### UX Design Requirements

UX-DR1: Implementar soporte inquebrantable de **temas Dual Claro/Oscuro** en Tailwind. El Dark Mode usará paletas de superficie oscuras (`#0F1F29`, `#1A2630`, `#25343F`) y el Light Mode sus equivalentes claros, ambas contrastadas por acento primario Naranja Vibrante (`#FF9B51`).
UX-DR2: Aplicar tipografía `Space Grotesk` globalmente y usar escalas de fuente dramáticas (`text-7xl` a `text-9xl`) para el WPM y elementos críticos.
UX-DR3: Aplicar "No-Line Rule", eliminando iteraciones de bordes rígidos y construyendo divisiones basadas íntegramente en saltos de capas de fondo (bg-surface).
UX-DR4: Construir `LiveTextCanvas` con lógica de manipulación extrema usando DOM Ref: revelar texto borrando el filtro Blur al iniciar, pintar cada acierto en Verde Esmeralda y errores en Rojo Coral.
UX-DR5: Construir componente visual `MultiplayerCaret` asignando físicas orgánicas simuladas con matemáticas elásticas (Spring Physics) en transformaciones CSS para enmascarar latencia.
UX-DR6: Integrar efecto visual `Focus Fade`: Atenuar drásticamente (<20% opacidad) el UI perimetral y destacar el propio canvas tecleado al iniciar la carrera.
UX-DR7: Construir componente `FocusWPMCounter`, visible estáticamente en la carrera o resultados perdiendo opacidad dinámicamente según estado del "Focus Fade".
UX-DR8: Construir el `PlayerAvatarPill` minimalista para el Lobby usando el sistema tonal de fondos elevados, indicando pertenencia y color semántico.
UX-DR9: Ocultar visualizaciones fragmentadas complejas al Screen Reader con `aria-hidden="true"`, creando una caja separada semánticamente escondida (clase `sr-only`) con el texto íntegro para WCAG AA.
UX-DR10: Controlar totalmente los loops de juego, revanchas y navegaciones por el teclado mediante `Tab`, `Enter` y `Esc`. 
UX-DR11: Evitar spinners genéricos de carga ("loading"); utilizar cursores parpadeantes `_` (terminal) o cambios progresivos de opacidad.
UX-DR12: Asegurar renderizado Responsive Desktop-First, reduciendo el ruido decorativo visual para las pantallas de tamaño móvil.

### FR Coverage Map

FR1: Epic 1 - Registro OAuth Google
FR2: Epic 1 - Registro OAuth GitHub
FR3: Epic 1 - Perfil, país y estadísticas
FR4: Epic 1 - Sesión persistida
FR5: Epic 2 - Crear sala y link
FR6: Epic 2 - Unirse a sala
FR7: Epic 2 - Host selecciona nivel
FR8: Epic 2 - Host inicia partida
FR9: Epic 2 - Soporte 20 jugadores
FR10: Epic 3 - Soporte 100 espectadores
FR11: Epic 3 - Unirse como espectador
FR12: Epic 3 - Espectador a jugador
FR13: Epic 2 - Texto sincronizado
FR14: Epic 2 - Carets en vivo
FR15: Epic 2 - Colores de caret
FR16: Epic 2 - Countdown
FR17: Epic 2 - Focus Fade
FR18: Epic 2 - Cálculo WPM/Precisión
FR19: Epic 2 - Fin partida/timeout
FR20: Epic 2 - Reconexión
FR21: Epic 2 - Resultados
FR22: Epic 2 - Revancha
FR23: Epic 4 - Persistencia de resultados
FR24: Epic 2 - Carga textos JSON
FR25: Epic 2 - Texto aleatorio
FR26: Epic 2 - 5 niveles progresivos
FR27: Epic 4 - Leaderboard global con país
FR28: Epic 4 - Filtro leaderboard por nivel y periodo temporal
FR29: Epic 4 - Actualización auto leaderboard
FR30: Epic 4 - Historial personal
FR31: Epic 4 - Promedio WPM y marcas
FR32: Epic 4 - Progresión en el tiempo
FR33: Epic 1 - Detección Geo API de país
FR34: Epic 1 - Cambio manual de país
FR35: Epic 4 - Filtro leaderboard por país

## Epic List

### Epic 1: User Identity & Profiles
Los usuarios pueden registrarse e iniciar sesión de forma rápida (vía Google/GitHub), detectando automáticamente su país (Geo API), con la posibilidad de gestionar su perfil (cambio manual de país) y mantener su sesión activa.
**FRs covered:** FR1, FR2, FR3, FR4, FR33, FR34

### Epic 2: Live Multiplayer Arena
Los usuarios pueden crear salas, invitar amigos y competir en carreras de mecanografía en tiempo real con cursores visibles sincronizados, inmersión "Focus Fade" y resultados al finalizar la ronda. Provee la experiencia jugable completa de principio a fin.
**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR24, FR25, FR26

### Epic 3: Spectator Experience
Los usuarios pueden unirse a salas activas simplemente para observar la competencia en tiempo real, viendo la carrera sin participar, con la opción de unirse como jugadores a la siguiente ronda.
**FRs covered:** FR10, FR11, FR12

### Epic 4: Global Progression & Rankings
Los usuarios pueden rastrear su progreso histórico, ver su WPM promedio y competir en tablas de posiciones globales filtradas por nivel de dificultad y país de origen, dándole persistencia y retención a largo plazo.
**FRs covered:** FR23, FR27, FR28, FR29, FR30, FR31, FR32, FR35

## Epic 1: User Identity & Profiles

Los usuarios pueden registrarse e iniciar sesión de forma rápida (vía Google/GitHub), detectando automáticamente su país (Geo API), con la posibilidad de gestionar su perfil (cambio manual de país) y mantener su sesión activa.

### Story 1.1: Workspace & Infrastructure Scaffolding

As a developer,
I want to initialize the Nx Workspace with React, Vite, and NestJS,
So that the foundational monorepo structure is ready for feature development following the architecture decisions.

**Acceptance Criteria:**

**Given** the project root directory
**When** the Nx creation command is executed
**Then** an `apps/web` (React+Vite) and `apps/api` (NestJS) structure is created
**And** the `libs/shared` directory is available for shared DTOs and types.

### Story 1.2: OAuth 2.0 Integration (Google & GitHub)

As a new or returning user,
I want to log in using my Google or GitHub account,
So that I can access the platform quickly without creating a new password and maintain a persistent session.

**Acceptance Criteria:**

**Given** an unauthenticated user on the landing page
**When** they click "Log in with Google" or "Log in with GitHub"
**Then** they are redirected to the respective OAuth provider
**And** upon successful authentication, a JWT is issued with a 24h expiration
**And** their session is persisted across browser reloads.

### Story 1.3: Auto-detect User Country on First Login

As a newly registered user,
I want the system to automatically detect my country of origin,
So that I don't have to manually configure my location for the global leaderboards.

**Acceptance Criteria:**

**Given** a user logging in for the very first time
**When** their profile is being created in the database
**Then** the backend queries a Geo API using their IP address
**And** saves the detected country code to their user profile
**And** this query is only performed once to avoid unnecessary API calls.

### Story 1.4: Profile Dashboard & Country Management

As an authenticated user,
I want to view my profile statistics and be able to change my associated country,
So that my identity on the leaderboards accurately reflects my preference.

**Acceptance Criteria:**

**Given** an authenticated user
**When** they navigate to their Profile section
**Then** they can see their avatar, name, and current country
**And** they can edit the country field using a dropdown list of valid countries
**And** saving the changes updates their profile immediately in the database.

## Epic 2: Live Multiplayer Arena

Los usuarios pueden crear salas, invitar amigos y competir en carreras de mecanografía en tiempo real con cursores visibles sincronizados, inmersión "Focus Fade" y resultados al finalizar la ronda. Provee la experiencia jugable completa de principio a fin.

### Story 2.1: Text Content Management

As the system,
I want to load JSON texts and provide a random text based on one of the 5 difficulty levels,
So that players have appropriate and varied content to type during matches.

**Acceptance Criteria:**

**Given** 5 difficulty levels defined in the system
**When** a match is created
**Then** a text from the specific level is randomly selected and sent to all clients.

### Story 2.2: Room Creation & Lobby

As a user,
I want to create a room, share a link, and see my friends join the lobby,
So that we can gather before starting a match.

**Acceptance Criteria:**

**Given** an authenticated user
**When** they create a room
**Then** a unique link is generated
**And** up to 20 users joining via that link appear in the lobby as `PlayerAvatarPill` components without borders, with dynamically assigned distinct colors.

### Story 2.3: Real-Time Caret Sync Engine

As a competitor,
I want to see my opponents' carets move smoothly over the text in real-time as they type,
So that I feel the pressure of a live race.

**Acceptance Criteria:**

**Given** players in an active room
**When** they type correctly
**Then** their `MultiplayerCaret` positions are broadcasted via WebSockets (Redis Pub/Sub backed)
**And** updated on all clients using direct DOM manipulation (Refs) and Spring Physics, avoiding React re-renders.

### Story 2.4: Focus Fade & Race Mechanics

As a competitor,
I want the UI to fade out and the text to clear its blur when the race starts,
So that I can enter a state of deep focus ("Flow").

**Acceptance Criteria:**

**Given** a lobby with ready players
**When** the host starts the match
**Then** a 3-2-1 countdown begins
**And** on "GO", the text blur is removed, and the perimeter UI fades to <20% opacity (`Focus Fade` pattern), allowing users to type the characters which turn green or red.

### Story 2.5: Real-Time Scoring & Match End

As a competitor,
I want to see my WPM continuously updated and a final results screen when the match finishes,
So that I know my performance and can quickly request a rematch.

**Acceptance Criteria:**

**Given** an active race
**When** typing
**Then** WPM and precision are calculated locally in <10ms intervals on the massive `FocusWPMCounter`
**And** when all players finish or timeout, the match ends, opacity is restored, and players see the final leaderboard with a one-click "Rematch" button.

### Story 2.6: Disconnection Handling

As a player with unstable internet,
I want to be able to reconnect to a race seamlessly,
So that a temporary disconnect doesn't ruin my match.

**Acceptance Criteria:**

**Given** an active player who loses WebSocket connection
**When** they reconnect
**Then** the server restores their room state from Redis and allows them to resume typing without resetting their local progress.

## Epic 3: Spectator Experience

Los usuarios pueden unirse a salas activas simplemente para observar la competencia en tiempo real, viendo la carrera sin participar, con la opción de unirse como jugadores a la siguiente ronda.

### Story 3.1: Spectator Mode & Room Capacity Management

As a spectator,
I want to join a room without consuming a player slot,
So that I can watch the match even if the 20-player limit is reached (up to 100 spectators).

**Acceptance Criteria:**

**Given** a spectator joining a full room (20 players) OR specifically choosing to spectate
**When** they connect
**Then** they are allocated to one of the 100 spectator slots in Redis
**And** they cannot trigger match actions (like "Ready" or "Start").

### Story 3.2: Lobby, Race & Host Controls Fixes

As a player or host,
I want all known UI/UX bugs to be fixed and missing host controls to be available,
So that the core multiplayer experience is polished before spectator features are added.

**Acceptance Criteria:**

**Given** any player in the lobby or race
**When** they interact with the UI
**Then** flags are correctly aligned in results, the waiting room title is fully visible, the "Listo" button has a pulse animation, the theme toggle icon is a monitor/PC, and the "..." menu is inside the player card.

**Given** a player joining a room for the first time
**When** they enter the lobby
**Then** the avatar of other players loads correctly (not only from the second session onwards).

**Given** a player who leaves the room
**When** their connection drops
**Then** the remaining players see an immediate visual indication (greyed out / "Disconnected") before the player is fully removed.

**Given** a player in an active race
**When** they want to exit early
**Then** a visible exit button allows them to leave and displays their partial score at the moment they exited.

**Given** a player in a race
**When** they type and advance through the text
**Then** their caret position is correctly broadcasted and remains in sync on all other clients throughout the entire race (no desync after a few words).

**Given** a player assigned a color at room creation
**When** the race starts
**Then** their own caret displays that assigned color (not always orange).

**Given** a host hovering over another player's card in the lobby
**When** they click the "..." menu
**Then** they see options: "Sacar jugador" and "Pasar a espectador"; upon selection, the affected player sees a notification message accordingly.

**Given** the UI in light mode
**When** any screen is displayed
**Then** all unselected buttons have sufficient contrast against the background (background is slightly darker than pure white) across all views.

### Story 3.3: Live Spectator View

As a spectator,
I want to see the live text canvas and all moving carets without participating myself,
So that I can enjoy the competition as an audience member.

**Acceptance Criteria:**

**Given** a spectator in an active match
**When** players type
**Then** the spectator's client receives and renders the WebSocket caret broadcasts identically to players
**But** their keyboard input is ignored and they don't have a personal caret.

### Story 3.4: Spectator to Player Transition

As a spectator in the post-match results screen,
I want to click a button to join the next match as a player,
So that I can seamlessly transition from watching to competing if a slot is available.

**Acceptance Criteria:**

**Given** a spectator viewing the post-match screen
**When** they click "Unirse a la partida"
**Then** the system checks if player slots (<20) are available
**And** if so, upgrades their connection role to Player for the next lobby.

## Epic 4: Global Progression & Rankings

Los usuarios pueden rastrear su progreso histórico, ver su WPM promedio y competir en tablas de posiciones globales filtradas por nivel de dificultad y país de origen, dándole persistencia y retención a largo plazo.

### Story 4.1: Match Results Persistence

As a player,
I want my match results to be saved securely after every race,
So that my historical performance is properly recorded in the database.

**Acceptance Criteria:**

**Given** a completed match
**When** the final results are generated
**Then** a record containing WPM, precision, level, and timestamp is safely persisted to PostgreSQL for each participating user.

### Story 4.2: Personal History & Progression Dashboard

As a player,
I want to view my past matches, average WPM, and best personal score,
So that I can see my typing progression over time.

**Acceptance Criteria:**

**Given** an authenticated user in their Profile screen
**When** they view their history section
**Then** they see a list of recent matches with their respective WPM, precision, level, and date played
**And** calculated metrics for their all-time "Average WPM" and "Best WPM".

**Given** an authenticated user viewing their history section
**When** they select a time range filter ("Últimos 7 días", "Últimos 30 días", "Todo el tiempo")
**Then** the match list updates to show only matches played within that range
**And** the "Average WPM" metric recalculates to reflect only the filtered matches
**And** "Best WPM" always reflects the all-time best regardless of the active filter.

**Given** an authenticated user viewing their history section
**When** they select a difficulty level filter (niveles 1–5 o "Todos")
**Then** the match list updates to show only matches played at that level
**And** the time range and level filters can be combined simultaneously.

### Story 4.3: Global Leaderboard

As a competitive player,
I want to view a global leaderboard showing the fastest players and their countries,
So that I can see how I rank against the global community.

**Acceptance Criteria:**

**Given** a user navigating to the Leaderboard page
**When** the page loads
**Then** it displays a paginated/top-100 list of players sorted by highest WPM
**And** each entry shows the player's name, avatar, WPM, and associated country.

### Story 4.4: Leaderboard Filtering (Level, Country & Period)

As a competitive player,
I want to filter the leaderboard by difficulty level, country, and time period,
So that I can find my ranking among peers in my region, skill bracket, or recent performance.

**Acceptance Criteria:**

**Given** the Leaderboard view
**When** the user selects a difficulty level (1-5 or "Todos"), a specific country (or "Todos"), and/or a time period
**Then** the leaderboard dynamically updates to show only the top scores matching those combined filters.

**Given** the time period filter
**When** the user selects a period option
**Then** the available options are: "Histórico" (all-time), "Último año", "Último mes", "Últimos 7 días"
**And** the leaderboard recalculates the best WPM within the selected period.

**Given** the Leaderboard view
**When** the user navigates to it
**Then** it is displayed in its own dedicated tab/view, separate from the personal history dashboard.

## Deferred to V2

- **Periodo personalizado (date-range picker):** Permite al usuario seleccionar un rango de fechas arbitrario para filtrar el leaderboard. Diferido por costo de cache (queries únicas no cacheables en Redis) y complejidad de UI (date picker component). El índice compuesto `(level, countryCode, createdAt)` ya soporta esta funcionalidad sin refactoring cuando se implemente.

### Story 4.5: Automated Leaderboard Updates

As the system,
I want to update the global leaderboards automatically as matches conclude,
So that the rankings are always fresh and accurate without manual intervention.

**Acceptance Criteria:**

**Given** a newly persisted match result
**When** the player's new score is higher than their previous best for that level
**Then** the system automatically updates their entry in the aggregated leaderboard view to ensure real-time accuracy.
