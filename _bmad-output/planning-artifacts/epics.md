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

## Epic 5: La Visual — Rediseño Pantalla Principal

Transformar la pantalla principal de un placeholder minimalista a un dashboard de competición rico y atractivo que funcione tanto para usuarios loggeados como no loggeados, alineado con el Design System "Kinetic Monospace". La pantalla debe transmitir energía competitiva, mostrar partidas en vivo, y ofrecer acceso rápido a las acciones principales del juego.

### Dependencias

- Epic 4 (Stories 4.2, 4.3) debe completarse antes o en paralelo para las APIs de leaderboard y stats personales.
- Referencia visual: `Bosquejos/Pantalla Principal/screen Pantalla principal.png` y `Bosquejos/Pantalla Principal/DESIGN Pantalla principal.md`.

### Story 5.1: Design System Migration

As a developer,
I want to migrate and extend the CSS tokens to align with the "Kinetic Monospace" Design System,
So that all new and existing components share a consistent visual language across light and dark modes.

**Acceptance Criteria:**

**Given** the existing Tailwind theme in `styles.css`
**When** the design system migration is applied
**Then** color tokens are extended/mapped to include `surface-container-low`, `surface-container-lowest`, `on-surface-variant`, `outline` and their dark-mode counterparts
**And** typography uses Space Grotesk for headlines/body and IBM Plex Mono for typing areas
**And** border-radius uses `2rem`/`2.5rem` for cards and `full` (pill) for buttons
**And** the "No-Line" rule is applied: no 1px borders to separate sections, use tonal shifts instead
**And** the default theme is `system` (browser preference), persisted when user changes it.

### Story 5.2: Rediseño del NavBar

As a user,
I want a redesigned navigation bar with clear navigation tabs,
So that I can quickly access the main sections of the platform.

**Acceptance Criteria:**

**Given** any user visiting the site
**When** the navbar renders
**Then** the logo "UltimaType" is displayed on the left (clickable, navigates to home)
**And** navigation tabs are shown: "Principal" (home), "Leaderboard" (links to Epic 4 leaderboard page)
**And** for authenticated users: avatar + profile link appears on the right
**And** for unauthenticated users: an "Iniciar sesión" button appears on the right
**And** on mobile (< 768px) the tabs collapse into a hamburger menu
**And** the existing "Focus Fade" behavior during arena matches is preserved.

### Story 5.3: HomePage Layout & Extraction

As a developer,
I want to extract the home page from `app.tsx` into a dedicated `HomePage` component with a rich layout,
So that the codebase is maintainable and the home page can host multiple sections.

**Acceptance Criteria:**

**Given** the current inline home page in `app.tsx`
**When** the extraction is completed
**Then** a new `HomePage` component exists with a 12-column grid layout
**And** the layout has 3 main sections: game actions (top), live matches (middle), leaderboard + profile (bottom)
**And** each section is a separate, independently importable component
**And** the page works for both authenticated and unauthenticated users (same structure, conditional content)
**And** the layout is responsive: vertical stack on mobile, grid on desktop.

### Story 5.4: GameModeSelector (Main Actions)

As a user,
I want to see the available game actions prominently displayed,
So that I can start playing quickly.

**Acceptance Criteria:**

**Given** the game mode section of the home page
**When** it renders
**Then** two action cards are displayed with Material Symbols icons:
  - "Crear partida" → calls `POST /rooms` and redirects to lobby (existing behavior)
  - "Unirse a una partida" → input field for room code + join button (existing behavior)
**And** cards have hover animations (scale, shadow) and directional arrows
**And** for authenticated users: buttons are fully functional
**And** for unauthenticated users: clicking redirects to login with saved redirect location
**And** the section has a "MODO DE JUEGO" label and descriptive subtitle.

### Story 5.5: Partidas en Vivo (Backend + Frontend)

As a user,
I want to see matches currently being played on the home page,
So that I can feel the competitive energy and optionally spectate live matches.

**Acceptance Criteria:**

**Given** the home page
**When** the "Partidas en Vivo" section loads
**Then** it displays a list of rooms with `status === 'playing'` or `status === 'waiting'`

**Given** the backend
**When** `GET /api/rooms/active` is called (public, no auth required)
**Then** it returns a list of active rooms including for each room: code, status, difficulty level, elapsed seconds, and player data (displayName, avatar, position, colorIndex, totalChars)
**And** results are limited to the latest N active rooms (e.g., 10)
**And** the endpoint reads from in-memory room state (already maintained by RoomsService/Redis), no additional persistence needed.

**Given** a live match card on the home page
**When** a match has `status === 'playing'`
**Then** a mini-leaderboard is shown inside the card with up to 4 players
**And** each row shows: player color dot, name, estimated WPM, and a compact progress bar (% of text completed)
**And** WPM and progress are calculated client-side from position/totalChars/elapsedSeconds (same logic as existing SpectatorLeaderboard)
**And** the card header shows: difficulty level, elapsed time, and player count.

**Given** the "Partidas en Vivo" section is visible
**When** time passes
**Then** the home polls `GET /api/rooms/active` every 3-5 seconds to refresh mini-leaderboard data
**And** player positions, WPM, and progress bars update smoothly on each poll.

**Given** a live match card on the home page
**When** the user clicks "Observar"
**Then** they are redirected to the room as a spectator (using existing spectator mode)
**And** the "Observar" button may require login depending on spectator auth requirements.

**Given** no active matches exist
**When** the section renders
**Then** an elegant empty state is shown with a subtle icon (e.g., Material Symbols `sports_esports`)
**And** the text "No hay partidas en vivo ahora" with subtitle "¡Crea una partida y sé el primero!"
**And** a CTA button "Crear partida" that triggers the same create-room flow from Story 5.4.

**Given** the section is visible
**When** matches start or end
**Then** the list auto-refreshes via polling to reflect new/finished matches.

### Story 5.6: Global Leaderboard Preview (Home)

As a user,
I want to see a summary of the global leaderboard on the home page,
So that I'm motivated to compete and improve my ranking.

**Acceptance Criteria:**

**Given** the home page leaderboard section
**When** it renders for an authenticated user
**Then** it shows a compact table with the top 5-10 players (consuming Epic 4 `GET /api/leaderboard`)
**And** a toggle for "Mundial" / "Local" filtering (if Epic 4 supports country filter)
**And** a "Ver clasificación completa" link navigating to the full Leaderboard page from Epic 4.

**Given** Epic 4 APIs are not yet available
**When** the section renders
**Then** it shows a graceful empty state: "Próximamente" or placeholder content.

**Given** the home page leaderboard section
**When** it renders for an unauthenticated user
**Then** the table is visible with the same data
**And** a CTA is shown: "Inicia sesión para competir".

### Story 5.7: Player Profile & Ranking Card (Home)

As an authenticated user,
I want to see my position, score, and ranking on the home page,
So that I can track my progress at a glance.

**Acceptance Criteria:**

**Given** an authenticated user on the home page
**When** the profile card renders
**Then** it displays: avatar, display name, total score / best WPM, global ranking position ("Top X Mundial"), and country flag
**And** it consumes Epic 4 APIs (`GET /api/users/:id/matches` for stats, `/api/leaderboard` for position).

**Given** Epic 4 APIs are not yet available
**When** the card renders for an authenticated user
**Then** it shows: "Juega tu primera partida para ver tus stats".

**Given** an unauthenticated user on the home page
**When** the profile card area renders
**Then** it shows a CTA card: "Inicia sesión para ver tu ranking".

### Story 5.8: Responsive & Polish

As a user,
I want the redesigned home page to look professional on any device,
So that I have a consistent experience regardless of screen size.

**Acceptance Criteria:**

**Given** the home page on mobile (< 768px)
**When** it renders
**Then** the layout stacks vertically with full-width cards.

**Given** the home page on tablet (768-1024px)
**When** it renders
**Then** the layout uses a 2-column grid.

**Given** the home page on desktop (> 1024px)
**When** it renders
**Then** the layout uses the full 12-column grid.

**Given** any interactive element
**When** the user hovers or focuses
**Then** smooth transitions and hover animations are applied (scale, shadow, color shifts)
**And** loading skeletons are shown for each section while data loads
**And** tonal surface shifts follow the "No-Line" rule from the Design System.

### Story 5.9: Lobby Visual Restyling

As a user in a room lobby,
I want the lobby to follow the same visual aesthetic as the redesigned home page,
So that the experience feels consistent across the platform.

**Acceptance Criteria:**

**Given** the existing lobby page (`lobby-page.tsx`)
**When** the Design System tokens from Story 5.1 are applied
**Then** the lobby uses the same surface hierarchy: `surface-container-low` for sections, `surface-container-lowest` for nested cards
**And** border-radius uses `2rem`/`2.5rem` for cards, `full` for pills and buttons
**And** the "No-Line" rule is applied: tonal shifts instead of 1px borders for section separation.

**Given** the player pills in the lobby
**When** they render
**Then** `PlayerAvatarPill` uses compact pills with player color border, initials, and name aligned with the Design System typography and spacing
**And** Material Symbols icons are used for action buttons (settings, timer, groups, bolt).

**Given** the configuration panel (difficulty, time limit, max players)
**When** it renders for the host
**Then** selectors use rounded surfaces (`surface-container-lowest`) with the Design System's tonal layering
**And** the active difficulty level is highlighted with `primary` color (pill style)
**And** the "Iniciar" / "Start" button uses the primary pill style with `bolt` icon.

**Given** the lobby's text preview area (pre-match)
**When** the match has not started yet
**Then** the text area follows the Design System's typing area styling (IBM Plex Mono, rounded container)
**And** the visual treatment is consistent with the arena's text canvas.

### Story 5.10: Arena Visual Restyling

As a player in an active match,
I want the arena to follow the same visual aesthetic as the redesigned home page,
So that the experience feels consistent and polished across the platform.

**Acceptance Criteria:**

**Given** the arena page during an active match
**When** the Design System tokens from Story 5.1 are applied
**Then** the text canvas uses `surface-container-lowest` background with `2.5rem` border-radius
**And** typography in the typing area uses IBM Plex Mono
**And** surface hierarchy follows tonal layering (no 1px borders).

**Given** the WPM and precision display (`FocusWPMCounter`)
**When** it renders during a match
**Then** PPM and Error are shown as separate pill-shaped badges (rounded-full, `surface-container-lowest` background)
**And** PPM value uses `primary` color with headline-scale font weight
**And** labels use `label-md` style (uppercase, small, muted).

**Given** the "Salir" button during an active match
**When** it renders
**Then** it is styled as a prominent red pill button labeled "DETENER" with a `stop_circle` Material Symbols icon
**And** it maintains the existing exit/abandon match behavior.

**Given** the match timer
**When** it renders during a timed match
**Then** it shows only the remaining time as text (no progress bar)
**And** it follows the Design System typography tokens.

**Given** the countdown overlay, results overlay, and waiting-for-others overlay
**When** they render
**Then** they use the Design System's glassmorphism treatment (surface with 60% opacity, 20px backdrop-blur)
**And** buttons and cards within overlays use the Design System's rounded surfaces and primary color accents
**And** the Focus Fade effect is preserved exactly as-is (full-screen text focus, all other UI fades to 20% opacity).

### Story 5.11: Match Results Overlay Redesign

As a player who just finished a match,
I want to see my results presented in a dramatic and celebratory way,
So that I feel the impact of my performance and can share my achievement.

**Acceptance Criteria:**

**Given** a completed match
**When** the results overlay renders
**Then** a "¡Prueba Finalizada!" headline is displayed at the top in display-scale typography
**And** three hero stat cards are shown prominently: WPM (display-lg scale, primary color), Precisión (display-lg scale), and Puntaje Total (display-lg scale, existing `score` field)
**And** each hero stat has a `label-md` style label above it (e.g., "VELOCIDAD DE ESCRITURA", "PRECISIÓN", "PUNTAJE TOTAL").

**Given** the results ranking table
**When** it renders below the hero stats
**Then** it shows "Posición respecto a los competidores" as section heading
**And** each row displays: rank, player color bar, name with country flag, precision %, WPM, and score
**And** the local player's row is highlighted with `primary/10` background
**And** the table follows the Design System's "No-Line" rule (tonal shifts between rows, no divider lines)
**And** cards and surfaces use `2rem` border-radius with tonal layering.

**Given** the action area below the results
**When** it renders
**Then** a "Compartir" button is shown (tertiary style or icon button) that copies a text summary of results to clipboard (WPM, precision, score, rank) or uses Web Share API where available
**And** the "Reintentar Prueba" / "Revancha" button (host only) uses the primary pill style
**And** the "Salir" button uses the Design System styling
**And** all existing rematch logic (5-second countdown, host-only, spectator join) is preserved.

### Story 5.12: Leaderboard Page Visual Design

As a user viewing the global leaderboard,
I want the leaderboard page to follow the "Kinetic Monospace" Design System,
So that it feels visually consistent with the rest of the platform.

**Acceptance Criteria:**

**Given** the Leaderboard page built by Epic 4 (Stories 4.3/4.4)
**When** the Design System is applied
**Then** the page header shows "GLOBAL RANKINGS" label (label-md style) + "Puntajes Históricos" headline (display-lg scale)
**And** the leaderboard is a single filtrable table (not separate cards per level)
**And** filter controls (level, country, period) use the Design System's pill-style selectors and dropdowns
**And** the table follows the "No-Line" rule: tonal row alternation instead of divider lines
**And** each row shows: rank, player avatar, name, country flag, WPM, and score
**And** the local player's row is highlighted with `primary/10` background
**And** cards use `2rem`/`2.5rem` border-radius with `surface-container-low` backgrounds.

**Given** the leaderboard page
**When** it renders
**Then** a "Récord de la Semana" card is displayed prominently
**And** it shows the #1 player from level 5 in the last 7 days (consuming Epic 4's `GET /api/leaderboard?level=5&period=7d&limit=1`)
**And** the card displays: player name, WPM achieved, precision, and a brief highlight text
**And** if no data is available, the card shows a graceful empty state.

**Given** the leaderboard page
**When** it renders for an authenticated user
**Then** a "Tu Posición Global" card is shown (reuses the design pattern from Story 5.7's PlayerRankCard)
**And** it displays the user's global rank, score, and a motivational message.

**Given** the leaderboard page
**When** it renders for an unauthenticated user
**Then** the table and "Récord de la Semana" are fully visible
**And** the "Tu Posición Global" card shows a CTA: "Inicia sesión para ver tu ranking".

**Note:** "Ver Repetición" (match replays) is deferred to a future version.
