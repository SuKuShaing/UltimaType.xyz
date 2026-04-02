🗺️ Próximos Pasos — Módulo BMM (BMad Method)
Tu proyecto está en la Fase 1 - Análisis. Aquí está la ruta completa del método:

## Fase 1: Análisis (Opcional pero recomendada)

bmad-brainstorming — Sesión de brainstorming guiada (opcional)
bmad-technical-research — Investigación técnica (opcional, recomendada)
bmad-product-brief — Brief del producto (opcional)

## Fase 2: Planificación (Requerida)

bmad-create-prd — Crear el PRD ⚡ REQUERIDO
bmad-validate-prd — Validar el PRD (opcional)
bmad-create-ux-design — Diseño UX (opcional, tienes bosquejos que formalizar)

## Fase 3: Solucionamiento (Requerida)

bmad-create-architecture — Arquitectura técnica ⚡ REQUERIDO
bmad-create-epics-and-stories — Épicas e Historias ⚡ REQUERIDO
bmad-check-implementation-readiness — Verificar readiness ⚡ REQUERIDO

## Fase 4: Implementación

bmad-sprint-planning -- para hacer el Sprint Planning

### Lo que vendrá luego (El ciclo de vida del código)

Una vez que bmad-sprint-planning esté finalizado, el ritmo de desarrollo iterativo para cada "historia" o parte completa (feature) será:

Create Story (**bmad-create-story**): El Scrum Master toma la siguiente historia y prepara un archivo aislado con todo el contexto, lo que ayuda a que el agente desarrollador AI no se pierda.

Dev Story (**bmad-dev-story**): Un agente Ingeniero de Software toma toda la arquitectura, las directrices y la historia creada, y produce el código de tu programa.

Code Review (**bmad-code-review**): Revisión asertiva del código para cazar bugs y problemas de borde (opcional pero muy recomendado tras dev story).

💡 Recordatorio importante del método: Por favor, asegúrate de ejecutar cada uno de estos comandos en una nueva ventana de chat de contexto limpio. ¡Abre un nuevo chat y envía bmad-bmm-sprint-planning para darle vida a ese código!

### Promp de create-story y dev-story juntos

> usa la skill bmad-create-story para avanzar el punto X-X de @\_bmad-output/implementation-artifacts/sprint-status.yaml y cuando hayas terminado, solo en ese punto usa la siguiente skill bmad-dev-story para avanzar ese mismo punto

### Promp de code-review

> usa la skill bmad-code-review para avanzar el punto X-X de @\_bmad-output/implementation-artifacts/sprint-status.yaml

### Para la review

> me los vas a mostrar de uno en uno para analizarlos individualmente cada uno de los [tareas_a_analizar], dame todo el contexto necesario para tomar una buena decisión, cómo afecta al usuario o al sistema, los pro y contras de cada opción y tu sugerencia a elegir y porque eliges esa opción; El proceso es me pasas uno, decidimos sobre ese, una vez tenga la decisión, me pasas el siguiente

Para activar la retrospectiva del epic-1-retrospective, el comando que debes usar es (**bmad-retrospective**)

Además, si alguna vez tienes dudas sobre cuál es el siguiente paso, puedes usar (**bmad-sprint-status**) para obtener un resumen del progreso y una recomendación del flujo a seguir.
