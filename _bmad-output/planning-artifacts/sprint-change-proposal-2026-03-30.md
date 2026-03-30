# Sprint Change Proposal — 2026-03-30

**Proyecto:** UltimaType
**Fecha:** 2026-03-30
**Solicitado por:** Seba
**Estado:** Aprobado

---

## Sección 1: Resumen del Issue

Durante las pruebas post-implementación de las stories 2-2 a 2-6 (Lobby, Caret Sync, Race, Scoring, Disconnection) y la story 3-1 (Spectator Mode), se identificaron 12 issues de UI/UX, bugs funcionales y features faltantes que deben ser resueltos antes de continuar con el desarrollo del modo espectador (antiguas 3-2 y 3-3).

Los issues abarcan:
- **5 bugs visuales:** bandera desalineada, título sala cortado, `...` fuera del rectángulo, caret propio siempre naranja, contraste insuficiente en light mode
- **4 bugs funcionales:** avatar no carga en primera sesión, sala no actualiza al salir jugador, caret desync tras avanzar palabras
- **2 UX improvements:** botón "Listo" sin animación, ícono de tema confuso (tuerca → monitor)
- **2 features faltantes:** botón salir de partida + puntaje parcial, controles de host (echar / pasar a espectador)

---

## Sección 2: Análisis de Impacto

### Epic Impact
- **Epic 2 (done):** Afectado indirectamente — los fixes corrigen implementación de sus stories. No se reabre el epic; los cambios van en una nueva story.
- **Epic 3 (in-progress):** Se inserta una nueva story 3-2 antes de continuar con Live Spectator View y Spectator-to-Player Transition. Las stories existentes se renumeran.
- **Epics 4+:** Sin impacto.

### Conflictos en Artefactos
- **PRD:** Los issues #2 (salir + puntaje parcial) y #12 (host kick/spectate) no tienen FR correspondiente — son nuevas funcionalidades emergentes del uso real. No modifican el MVP pero lo enriquecen.
- **Architecture:** El issue #9 (caret desync) requiere investigación en el throttle WS / Redis Pub/Sub. Potencialmente un bug en la lógica de posicionamiento acumulativo del caret.
- **UX Spec:** Afecta `PlayerAvatarPill`, lobby screen, race screen, y los tokens de color del light mode.

---

## Sección 3: Enfoque Recomendado

**Opción seleccionada: Ajuste Directo (Opción 1)**

Crear la story `3-2-lobby-race-fixes-and-host-controls` que agrupa los 12 fixes antes de continuar con las stories de espectador.

**Justificación:**
- Bajo riesgo: todos los fixes son en código ya existente (excepto las 2 features nuevas que son aditivas)
- Mantiene el momentum del sprint sin reabrir epics completados
- Deja las stories de espectador limpias para implementarse sobre una base estable

**Esfuerzo estimado:** Medio
**Riesgo:** Bajo
**Impacto en timeline:** +1 story antes de 3-3 (antes 3-2)

---

## Sección 4: Cambios Detallados

### sprint-status.yaml

```
ANTES:
  epic-3: in-progress
  3-1-spectator-mode-room-capacity-management: done
  3-2-live-spectator-view: backlog
  3-3-spectator-to-player-transition: backlog

DESPUÉS:
  epic-3: in-progress
  3-1-spectator-mode-room-capacity-management: done
  3-2-lobby-race-fixes-and-host-controls: ready-for-dev   ← NUEVA
  3-3-live-spectator-view: backlog                         ← era 3-2
  3-4-spectator-to-player-transition: backlog              ← era 3-3
```

### epics.md — Epic 3

Story 3.2 (nueva), 3.3 (era 3.2), 3.4 (era 3.3) actualizadas con los acceptance criteria correspondientes.

### Issues incluidos en Story 3-2

| # | Issue | Categoría |
|---|---|---|
| 1 | Bandera desalineada en pantalla de resultados | Bug visual |
| 2 | Botón salir de partida + puntaje parcial | Feature nueva |
| 3 | Título "Sala de Espera" cortado | Bug visual |
| 4 | Avatar del otro jugador no carga en primera sesión | Bug funcional |
| 5 | Sala no actualiza al salir jugador (sin estado intermedio) | Bug funcional |
| 6 | Botón "Listo" sin animación de llamada a acción | UX mejora |
| 7 | Ícono de tema = tuerca → monitor/PC | UX mejora |
| 8 | "..." fuera del rectángulo del jugador | Bug visual |
| 9 | Carets pierden sincronización tras avanzar palabras | Bug funcional crítico |
| 10 | Poco contraste botones en light mode (toda la UI) | NFR visual |
| 11 | Host puede echar / pasar a espectador jugadores | Feature nueva |
| 12 | Caret propio siempre naranja, ignora color asignado | Bug visual |

---

## Sección 5: Handoff

**Alcance:** Menor-Moderado — implementación directa por dev
**Siguiente paso:** Ejecutar `bmad-create-story` para la story `3-2-lobby-race-fixes-and-host-controls`
**Criterio de éxito:** Los 12 issues verificados manualmente antes de continuar con Story 3-3 (Live Spectator View)
