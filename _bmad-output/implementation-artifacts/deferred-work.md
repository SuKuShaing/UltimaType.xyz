# Deferred Work

## Deferred from: retrospectiva Epic 1 (2026-03-27)

- **Enforcement de `kebab-case` sin herramienta automática** — La convención de que todos los archivos deben usar `kebab-case.ts` / `kebab-case.tsx` es una regla crítica del proyecto pero no está enforced por ningún linter ni Nx constraint. Actualmente depende de la disciplina manual del agente dev. Impacto: cualquier archivo creado con `camelCase` o `PascalCase` viola la convención sin que nadie lo detecte automáticamente. Solución propuesta: configurar una regla ESLint personalizada (`check-file` plugin) o un custom Nx generator que valide nombres de archivo en CI. Tratar en una historia de mejora de calidad antes del Epic 3.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

## Deferred from: code review of 1-3-auto-detect-user-country-on-first-login (2026-03-26)

- **P2002 race condition — loser pierde countryCode** — En logins concurrentes simultáneos del mismo usuario nuevo, el request que pierde la carrera (P2002) retorna al usuario creado por el ganador. Si el ganador tenía IP sin geo (null) y el perdedor tenía IP con país, el countryCode se descarta. Baja frecuencia, aceptable para MVP.
- **geoip-lite DB estática sin mecanismo de actualización** — La base de datos MaxMind incluida en el paquete se desactualiza con el tiempo. Sin `updatedb.js` periódico, las IPs de rangos recién asignados retornarán null o país incorrecto. Considerar cron de actualización en producción.
- **req:any / res:any en auth.controller.ts** — Typing débil en métodos del controller. Pre-existente desde story 1-2. Refactorizar a tipos NestJS/Express correctos en limpieza futura.
- **@types/geoip-lite v1.4.x con runtime v2.0.x** — Los tipos son de la API v1 pero el runtime es v2. Funcionalmente compatible para el uso actual (`lookup()`). Actualizar si la API diverge.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

- **Refresh token sin rotación ni invalidación** — `auth.service.ts`. No hay persistencia de refresh tokens (tabla o Redis). Imposible revocar tokens robados. Requiere diseño de tabla/Redis para token blacklist (post-MVP).
- **Rate limiting ausente en endpoints auth** — `/auth/refresh`, `/auth/me`. Sin protección contra brute force. Requiere infraestructura de rate limiting (post-MVP).

## Deferred from: code review of 1-4-profile-dashboard-country-management (2026-03-27)

- **Ruta `/profile` sin guard a nivel de ruta** — `app.tsx:12`. La protección interna en `ProfilePage` es suficiente para MVP (redirect a `/`). Riesgo: flash de UI antes del redirect. Implementar `ProtectedRoute` wrapper en limpieza post-MVP.
- **`updateCountryCode` sin manejo de Prisma P2025** — `users.service.ts:54`. Si el userId no existe en DB, Prisma lanza P2025 sin transformar. Patrón consistente con otros métodos del servicio; añadir manejo global de errores Prisma en post-MVP.
- **Estado visual stale de `effectiveCountry` cuando refetch falla** — `profile-page.tsx`. Si `invalidateQueries` falla por red, el dropdown puede mostrar el valor seleccionado pero `user.countryCode` del cache puede diferir. Requiere Background Sync API (Service Worker) para encolar la mutación y enviarla al reconectarse — tratar junto con capacidades PWA post-MVP.
