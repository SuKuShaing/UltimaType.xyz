---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - technical-ultimatype-multiplayer-typing-platform-research-2026-03-25.md
  - Paleta de colores Dark.md
  - Paleta de colores Light.md
  - DESIGN Pantalla principal.md
  - DESIGN Puntajes Historicos.md
  - DESIGN competencia - En competencia.md
  - DESIGN competencia - Resultados.md
  - DESIGN previo a iniciar.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 0
  projectDocs: 0
  designDocs: 7
classification:
  projectType: 'Real-Time Web App (SPA + WebSocket)'
  domain: 'Competitive Social Typing'
  complexity: 'media-alta'
  projectContext: 'greenfield'
  differentiator: 'Live caret sync + Ghost Racing + Social + Premium UX'
  userMotivation: 'Demostrar ser el más rápido frente a amigos'
  northStar: 'Que el usuario se entretenga con sus amigos y opcionalmente suba en rankings'
  retention: 'Opcional — mejorar velocidad y dominar niveles superiores'
---

# Product Requirements Document - UltimaType

**Autor:** Seba
**Fecha:** 2026-03-25

## Executive Summary

UltimaType es una plataforma web de competencia de mecanografía en tiempo real donde los usuarios compiten simultáneamente contra amigos, con visibilidad en vivo de los carets de todos los participantes. La plataforma resuelve una brecha clara en el mercado: las herramientas de typing existentes ofrecen práctica individual premium (Monkeytype) o competencia multiplayer con UX anticuada (TypeRacer), pero ninguna combina ambas dimensiones. UltimaType une competencia social en tiempo real con un diseño editorial de alta gama y un sistema progresivo de dominio del teclado en 5 niveles.

El producto está orientado a usuarios que buscan entretenimiento competitivo con amigos, con retención orgánica a través de la progresión de habilidad y rankings opcionales. El modelo es gratuito. Stack tecnológico: React + TanStack Query (frontend), NestJS + Socket.IO (backend), PostgreSQL + Prisma (persistencia), Redis (estado de partida en tiempo real), con despliegue vía Dokploy en VPS CubePath. Autenticación por OAuth 2.0 con Google y GitHub.

### What Makes This Special

- **Carets en vivo:** Cada jugador ve en tiempo real la posición exacta de todos los oponentes mientras teclean, generando tensión competitiva visual directa.
- **Ghost Racing:** Los usuarios pueden competir contra la "sombra" grabada de su mejor rendimiento o el de otros jugadores. Las replays se almacenan como arrays ligeros de timestamps + posiciones (~2-5KB por partida), permitiendo retos asíncronos y auto-superación.
- **Invitación sin fricción:** Crear una partida e invitar a amigos debe ser un flujo de máximo 2-3 clicks.
- **Premium UX (Kinetic Monospace):** Design system con filosofía editorial — "The Analog Velocity". Sin líneas divisorias, glassmorphism, tipografía Space Grotesk, caret naranja (#FF9B51) de alta energía, y el patrón "Focus Fade" que desvanece toda la UI al 20% durante la competencia.
- **5 niveles de dominio del teclado:** Progresión por complejidad de caracteres (minúsculas → mayúsculas → puntuación → números → símbolos), no por velocidad.

## Project Classification

| Aspecto | Valor |
|---|---|
| **Tipo de Proyecto** | Real-Time Web App (SPA + WebSocket) |
| **Dominio** | Competitive Social Typing |
| **Complejidad** | Media-Alta |
| **Contexto** | Greenfield |
| **Diferenciador** | Live caret sync + Ghost Racing + Social + Premium UX |

## Success Criteria

### User Success

- **Momento "aha!":** Ver a tus amigos aparecer en la sala, cada uno con un caret de color distinto, y que todos empiecen a moverse en tiempo real.
- **Tiempo a primera partida:** Un usuario nuevo debe estar jugando en ≤30 segundos (target), máximo 1 minuto. Esto implica OAuth rápido → landing con botón directo "Crear Sala" o "Unirse".
- **Experiencia de competencia:** El usuario siente la adrenalina de ver los carets de sus oponentes avanzar, genera la urgencia de teclear más rápido.
- **Progresión clara:** Los 5 niveles de dominio del teclado hacen visible al usuario su crecimiento.

### Business Success (Hackathon)

- **Demo funcional end-to-end:** El flujo completo (registro → crear sala → invitar → competir → resultados → leaderboard) debe funcionar sin errores en demo en vivo.
- **Concurrencia masiva:** 5000 proyectos participando, todos se prueban entre sí. Soporte mínimo para cientos de usuarios concurrentes, con salas de hasta 20 jugadores activos + 100 espectadores.
- **Impacto visual:** El design system Kinetic Monospace debe ser lo primero que impresione a los jueces — la estética premium es un criterio de hackathon.
- **Estabilidad bajo carga:** La demo no puede caerse ni degradarse durante las pruebas cruzadas.

### Technical Success

- **Latencia de sincronización de carets:** ≤100ms percibidos entre la acción de un jugador y la actualización visual en los clientes de los demás.
- **WebSocket throttling:** 50ms de intervalo para updates de posición (20 updates/segundo).
- **Redis como source of truth de partida:** Estado efímero de la partida en Redis Hashes, resultados persistidos en PostgreSQL al finalizar.
- **Reconexión graceful:** Si un jugador pierde conexión momentáneamente, puede reincorporarse a la partida en curso.
- **OAuth ≤3 segundos:** El flujo de login con Google/GitHub debe completarse en menos de 3 segundos.

### Measurable Outcomes

| Métrica | Target V1 |
|---|---|
| Tiempo registro → primera partida | ≤60s |
| Latencia de caret percibida | ≤100ms |
| Usuarios concurrentes soportados | ≥500 |
| Uptime durante hackathon | 99.5%+ |
| Salas concurrentes | ≥100 |
| Jugadores activos por sala | Máximo 20 |
| Espectadores por sala | Hasta 100 |

## Product Scope

Detalle completo de features por fase en la sección **Project Scoping & Phased Development**.

- **V1 (Hackathon):** 10 features core — multiplayer con carets, lobby, OAuth, 5 niveles, Focus Fade, resultados, espectadores, leaderboard, historial
- **V2 (Growth):** Ghost Racing, práctica solo, admin panel, multi-idioma
- **V3 (Vision):** Torneos, personalización, API pública

## User Journeys

### Journey 1: "El Primer Duelo" — Competidor (Happy Path)

**Protagonista:** Camilo, 22 años, estudiante de ingeniería. Sus amigos le dicen que es lento tecleando.

**Opening Scene:** Camilo recibe un link de WhatsApp de su amigo: "Vení a jugar, a ver quién es más rápido". Hace click.

**Rising Action:**
1. Llega a UltimaType → ve un landing premium con gradiente oscuro y tipografía dramática
2. Click en "Iniciar con Google" → OAuth en 2 segundos, ya tiene avatar y nombre
3. El link lo lleva directamente al **Lobby** — ve que su amigo ya está ahí con un caret verde
4. Otros 2 amigos se unen. El lobby muestra 4 avatares, cada uno con un color distinto
5. El host selecciona "Nivel 2 — Mayúsculas y minúsculas" y presiona "COMENZAR"

**Climax:** 3... 2... 1... ¡GO! El texto aparece, los 4 carets empiezan a moverse. Camilo ve que el caret azul (su amigo Martín) va adelante. Adrenalina. Teclea más rápido. El Focus Fade ha desvanecido todo excepto el texto y los carets. Solo existe la competencia.

**Resolution:** Camilo termina segundo — 58 WPM, 94% precisión, 820 pts. La pantalla de resultados muestra el ranking de la partida ordenado por puntaje, con el WPM y precisión de cada jugador, y un botón "Revancha". Martín ganó con más puntaje (67 WPM, 97% precisión). Camilo dice "otra vez".

### Journey 2: "Vinimos a Ver" — Espectador

**Protagonista:** Lucía, 20 años. No quiere competir pero su grupo de amigos está jugando.

**Opening Scene:** Lucía recibe el link de la sala. Entra y ve que ya hay 4 jugadores listos.

**Rising Action:**
1. Login con GitHub (ya tiene cuenta) → entra a la sala
2. La sala la detecta como espectador (la sala ya tiene jugadores o ella elige "Solo mirar")
3. Ve los avatares de los jugadores con sus colores de caret asignados

**Climax:** La partida comienza. Lucía ve todos los carets moverse en vivo. Se ríe cuando ve que el caret de su amigo se queda atascado en una palabra difícil.

**Resolution:** Cuando termina, Lucía ve los resultados de todos. Decide que quiere intentar y presiona "Unirme a la próxima partida".

### Journey 3: "El Grind" — Retador que Regresa

**Protagonista:** Andrés, 25 años. Perdió ayer y quiere mejorar su récord.

**Opening Scene:** Andrés abre UltimaType directamente. Login automático (sesión persistida). Ve su perfil: puntaje promedio 480 pts, mejor puntaje 610 pts, Nivel 3 desbloqueado.

**Rising Action:**
1. Revisa el Leaderboard global filtrando por Nivel 3
2. Ve que su amigo Martín está en el top 10 con 1,240 pts
3. Crea una sala, selecciona Nivel 3, comparte el link
4. Mientras espera, revisa su historial de partidas — ve su progresión de puntaje en las últimas semanas

**Climax:** Martín se une. Esta vez Andrés gana: 630 pts vs 590 pts (63 WPM vs 59 WPM). Nuevo récord personal de puntaje.

**Resolution:** El leaderboard se actualiza. Andrés sube 3 posiciones. Abre el Nivel 4 para practicar con números.

### Journey V2: "Textos Nuevos" — Admin/Ops

**Protagonista:** Seba, administrador de la plataforma.

Panel admin con CRUD de textos, validación por regex según nivel, asignación de nivel e idioma, rol de admin protegido. Reservado para V2.

### Journey Requirements Summary

| Journey | Capacidades Reveladas |
|---|---|
| **El Primer Duelo** | OAuth rápido, deep-link a sala, lobby con avatares, selección de nivel, countdown, sync de carets, Focus Fade, pantalla de resultados, botón revancha |
| **Vinimos a Ver** | Modo espectador, detección/selección automática, vista read-only, transición espectador→jugador |
| **El Grind** | Sesión persistida, perfil con stats, leaderboard filtrable, historial de partidas, progresión visible |

### Nota: Esquema de Textos (JSON Seed V1)

Textos cargados vía JSON con esquema preparado para multi-idioma:

```json
{
  "level": 3,
  "language": "es",
  "content": "El rápido zorro marrón, saltó sobre el perro perezoso."
}
```

V1 usa solo el campo `level` para filtrar. El campo `language` se incluye desde el principio para preparar selección de idioma en V2/V3.

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Live Multi-Caret Sync** — Sincronización visual en tiempo real de N carets con colores distintos sobre el mismo texto. TypeRacer muestra barras de progreso, no carets reales posicionados en el texto. UltimaType muestra exactamente dónde está cada oponente, carácter por carácter. Esto transforma la competencia de un "dashboard de progreso" a una "experiencia de presencia compartida".

2. **Ghost Racing (V2)** — Competir contra replays grabados como carets fantasma. Inspirado en los ghosts de Mario Kart Time Trials. Los datos de replay son extremadamente ligeros (~2-5KB): solo `[{timestamp, position}]`. Habilita competencia asíncrona y auto-superación sin necesidad de jugadores en línea.

3. **Spectator Mode nativo** — Hasta 100 espectadores viendo los carets moverse en vivo, creando una experiencia de entretenimiento que trasciende al jugador activo. Inexistente en competidores.

4. **Focus Fade UX Pattern** — Cuando la competencia inicia, toda la UI se desvanece al 20% excepto el texto y los carets. Crea un estado de "flow" forzado que mejora el rendimiento del usuario. Inexistente en competidores.

### Market Context & Competitive Landscape

| Competidor | Carets en texto | Ghost Racing | Espectadores | Focus Fade | UX Premium |
|---|---|---|---|---|---|
| **Monkeytype** | ❌ Solo | ❌ | ❌ | ❌ | ✅ |
| **TypeRacer** | ❌ Barras | ❌ | ❌ | ❌ | ❌ |
| **10FastFingers** | ❌ Solo | ❌ | ❌ | ❌ | ❌ |
| **Keybr** | ❌ Solo | ❌ | ❌ | ❌ | ⚠️ |
| **UltimaType** | ✅ | ✅ (V2) | ✅ | ✅ | ✅ |

### Validation Approach

- **Caret sync:** Validar latencia percibida ≤100ms con 20 jugadores en la hackathon en vivo
- **Focus Fade:** Observar si los jugadores completan textos más rápido con Focus Fade activado
- **Espectadores:** Medir si espectadores se convierten en jugadores en la siguiente partida
- **Impacto visual:** Feedback de jueces de hackathon sobre primera impresión de UX

Riesgos de innovación consolidados en **Project Scoping > Risk Mitigation Strategy**.

## Real-Time Web App Specific Requirements

### Project-Type Overview

UltimaType es una SPA (Single Page Application) con comunicación WebSocket bidireccional para sincronización de carets en tiempo real. La arquitectura separa REST (auth, CRUD, leaderboard) de WebSocket (estado de partida, posiciones de caret, eventos de sala). Frontend en React con TanStack Query para caché de datos REST y Socket.IO para el canal en tiempo real.

### Browser Matrix

| Navegador | Versión | Prioridad | Notas |
|---|---|---|---|
| Chrome | Última | ✅ Obligatorio | Target principal, mejor soporte WebSocket |
| Firefox | Última | ✅ Recomendado | Soporte completo Socket.IO |
| Edge | Última (Chromium) | ✅ Gratis | Mismo engine que Chrome |
| Safari | Última | ⚠️ Nice-to-have | Posibles edge cases con WebSocket long-polling |

### Responsive Design

| Breakpoint | Experiencia |
|---|---|
| Desktop (≥1024px) | Experiencia completa: texto, carets, lobby, leaderboard |
| Tablet (768-1023px) | Funcional pero no optimizado para competencia (teclado virtual) |
| Mobile (<768px) | Solo espectador — la competencia requiere teclado físico |

### Performance Targets

Targets detallados en **Non-Functional Requirements > Performance** (NFR1-NFR7). Herramientas de medición: Lighthouse (FCP, LCP, TTI), Webpack analyzer (bundle size), custom metrics (WebSocket, caret sync).

### SEO Strategy

SEO no es prioritario. Requisitos mínimos: meta tags básicos en landing page, página de login indexable. Salas, competencia y resultados no requieren indexación.

### Accessibility Level (Basic)

Nivel básico. Detalle en **Non-Functional Requirements > Accessibility** (NFR22-NFR25). Screen reader: soporte en navegación, no en área de competencia (visualización de carets es inherentemente visual).

### Implementation Considerations

- **Code splitting:** React lazy loading para rutas (lobby, competencia, resultados, leaderboard)
- **State management:** TanStack Query para datos REST + zustand para estado de Socket.IO
- **WebSocket lifecycle:** Conexión al montar componente de sala, desconexión al salir, reconexión automática con retry exponencial
- **Asset optimization:** Space Grotesk pre-cargada via `<link rel="preload">`, imágenes en WebP

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — Demostrar que la combinación de carets en vivo + UX premium + invitación sin fricción crea una experiencia superior. El objetivo de la hackathon es impactar en los primeros 30 segundos de uso.

**Resource Requirements:** 1 developer full-stack (Seba), ~2-4 semanas de desarrollo intensivo.

### MVP Feature Set (Phase 1 — Hackathon)

**Core User Journeys Supported:**
- ✅ "El Primer Duelo" — Competidor (happy path)
- ✅ "Vinimos a Ver" — Espectador
- ✅ "El Grind" — Retador que regresa

**Must-Have Capabilities:**

| # | Feature | Justificación |
|---|---|---|
| 1 | OAuth (Google + GitHub) | Sin login no hay usuario. ≤3s. |
| 2 | Crear/unirse a sala via link | Sin sala no hay partida. ≤2 clicks. |
| 3 | Lobby con avatares y colores | Momento "aha!" — amigos con carets de colores. |
| 4 | Competencia con carets en vivo | Core del producto. 20 jugadores, ≤100ms latencia. |
| 5 | 5 niveles de dificultad | Progresión de dominio. Textos vía JSON seed. |
| 6 | Focus Fade | Diferenciador UX exclusivo. |
| 7 | Pantalla de resultados | WPM, precisión, ranking. Botón revancha. |
| 8 | Modo espectador | Hasta 100 espectadores read-only. |
| 9 | Leaderboard/Rankings | Global por puntaje (score), filtrable por nivel, país y período. Widget de posición propia con percentil. |
| 10 | Puntajes históricos | Historial de partidas del usuario. |

### Post-MVP Features

**Phase 2 — Growth:**
- Ghost Racing (replays como carets fantasma)
- Práctica solo (typing test individual)
- Panel admin para CRUD de textos
- Selección de idioma

**Phase 3 — Vision:**
- Torneos con brackets
- Personalización de carets y temas
- API pública

### Risk Mitigation Strategy

**Technical Risks:**

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Latencia caret >100ms | Media | Crítico | Redis Pub/Sub, throttle 50ms, delta updates |
| VPS se satura | Media | Crítico | Load testing previo, alertas CPU/RAM |
| Safari WebSocket edge cases | Baja | Medio | Fallback long-polling (Socket.IO automático) |

**Market/Hackathon Risks:**

| Riesgo | Mitigación |
|---|---|
| Demo falla en vivo | Recording de backup, pruebas e2e previas |
| UX no impresiona | Iterar design system pre-demo, testers |
| Demasiados usuarios | Rate limiting por sala, máximo configurable |

**Resource Risks:**

| Riesgo | Mitigación |
|---|---|
| Scope creep | MVP congelado — Ghost Racing es V2 |
| Solo 1 developer | Priorizar: core → auth → leaderboard → spectator |

## Functional Requirements

### Identity & Access

- **FR1:** Un usuario puede registrarse e iniciar sesión usando OAuth de Google
- **FR2:** Un usuario puede registrarse e iniciar sesión usando OAuth de GitHub
- **FR3:** Un usuario autenticado puede ver su perfil (avatar, nombre, estadísticas)
- **FR4:** Un usuario puede mantener sesión persistida entre visitas
- **FR33:** El sistema realiza la detección del país del usuario vía Geo API
- **FR34:** Un usuario puede realizar un cambio manual de su país desde el perfil

### Room Management

- **FR5:** Un usuario puede crear una sala de competencia y recibir un link/código compartible
- **FR6:** Un usuario puede unirse a una sala existente mediante link directo o código
- **FR7:** El creador de la sala (host) puede seleccionar el nivel de dificultad
- **FR8:** El host puede iniciar la partida cuando al menos 2 jugadores estén listos
- **FR9:** La sala soporta hasta 20 jugadores activos simultáneos
- **FR10:** La sala soporta hasta 100 espectadores simultáneos en modo read-only
- **FR11:** Un usuario puede elegir unirse como espectador en lugar de jugador
- **FR12:** Un espectador puede transicionar a jugador para la siguiente partida

### Live Competition

- **FR13:** El sistema presenta un texto aleatorio del nivel seleccionado a todos los jugadores simultáneamente
- **FR14:** Cada jugador ve su propio caret y los carets de todos los demás jugadores posicionados sobre el texto en tiempo real
- **FR15:** Cada jugador tiene un color de caret distinto asignado automáticamente
- **FR16:** El sistema muestra un countdown (3-2-1) antes de iniciar la competencia
- **FR17:** La UI activa el patrón Focus Fade al iniciar la competencia
- **FR18:** El sistema calcula WPM y precisión en tiempo real durante la partida
- **FR19:** La partida finaliza cuando todos los jugadores completan el texto o pasa un timeout
- **FR20:** Un jugador puede reconectarse a una partida en curso si pierde conexión

### Results & Rematch

- **FR21:** Al finalizar, el sistema muestra una pantalla de resultados con ranking, WPM y precisión de cada jugador
- **FR22:** Cualquier jugador puede iniciar una revancha desde la pantalla de resultados
- **FR23:** El sistema persiste los resultados de cada partida para cada jugador participante

### Text Content

- **FR24:** El sistema carga textos desde archivos JSON con estructura `{level, language, content}`
- **FR25:** El sistema selecciona aleatoriamente un texto del nivel elegido para cada partida
- **FR26:** El sistema soporta 5 niveles de dificultad progresivos (minúsculas → mayúsculas → puntuación → números → símbolos)

### Leaderboard & Rankings

- **FR27:** Un usuario puede ver el leaderboard global con los mejores puntajes (score), ordenado por score descendente. Cada fila muestra: posición, país, avatar + nombre, mejor puntaje, precisión promedio.
- **FR27b:** El usuario autenticado ve un widget "Tu posición" con su ranking mundial y por país, más su percentil (ej: "Top 8% del mundo").
- **FR28:** Un usuario puede filtrar el leaderboard por nivel de dificultad (1-5 o Todos) y por período (Histórico, Último año, Último mes, Últimos 7 días).
- **FR29:** El sistema invalida automáticamente el cache Redis del leaderboard cuando un jugador establece un nuevo puntaje personal máximo para un nivel. TTL de fallback: 12 horas.
- **FR35:** Un usuario puede filtrar el leaderboard por país de origen.

### Historical Scores

- **FR30:** Un usuario puede ver su historial de partidas con score, WPM, precisión, nivel y fecha. Cada entrada es clickeable y abre la vista completa de esa partida con todos los participantes (via matchCode).
- **FR31:** Un usuario puede ver su mejor puntaje personal all-time y su puntaje promedio (filtrable por período y nivel).
- **FR32:** Un usuario puede ver su progresión a lo largo del tiempo.

## Non-Functional Requirements

### Performance

- **NFR1:** Latencia de sincronización de carets ≤100ms percibidos entre jugadores
- **NFR2:** Intervalo de throttle de WebSocket = 50ms (20 updates/segundo por jugador)
- **NFR3:** First Contentful Paint ≤1.5s en conexión 4G
- **NFR4:** Time to Interactive ≤3s incluyendo carga de fuente Space Grotesk
- **NFR5:** Conexión WebSocket establecida en ≤500ms
- **NFR6:** Cálculo de WPM y precisión en ≤10ms (client-side, sin bloquear render)
- **NFR7:** Bundle size inicial ≤200KB gzip

### Security

- **NFR8:** Autenticación vía OAuth 2.0 exclusivamente (sin passwords propios)
- **NFR9:** Tokens JWT con refresh token y expiración ≤24h
- **NFR10:** Comunicación cifrada vía HTTPS/WSS en producción
- **NFR11:** Validación server-side de acciones de partida (anti-cheat: no aceptar posiciones que salten caracteres)
- **NFR12:** Rate limiting en endpoints REST (100 req/min por IP)

### Scalability

- **NFR13:** Soporte para ≥500 usuarios concurrentes conectados
- **NFR14:** Soporte para ≥100 salas activas simultáneamente
- **NFR15:** Cada sala soporta hasta 120 conexiones WebSocket (20 jugadores + 100 espectadores)
- **NFR16:** Redis maneja ≥10,000 operaciones/segundo
- **NFR17:** PostgreSQL soporta escritura de resultados sin degradar consultas de leaderboard

### Reliability

- **NFR18:** Uptime ≥99.5% durante el periodo de hackathon
- **NFR19:** Reconexión automática de WebSocket con retry exponencial (max 5 intentos)
- **NFR20:** Graceful degradation: si Redis falla, la app sigue funcional para crear nuevas partidas
- **NFR21:** Zero data loss en resultados de partidas (PostgreSQL con WAL)

### Accessibility

- **NFR22:** Contraste de texto ≥4.5:1 en toda la UI
- **NFR23:** Navegación por teclado completa fuera del área de competencia
- **NFR24:** `aria-labels` en todos los botones e iconos interactivos
- **NFR25:** Focus indicators visibles en elementos interactivos
