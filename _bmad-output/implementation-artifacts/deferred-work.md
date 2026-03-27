# Deferred Work

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

## Deferred from: code review of 1-3-auto-detect-user-country-on-first-login (2026-03-26)

- **P2002 race condition — loser pierde countryCode** — En logins concurrentes simultáneos del mismo usuario nuevo, el request que pierde la carrera (P2002) retorna al usuario creado por el ganador. Si el ganador tenía IP sin geo (null) y el perdedor tenía IP con país, el countryCode se descarta. Baja frecuencia, aceptable para MVP.
- **geoip-lite DB estática sin mecanismo de actualización** — La base de datos MaxMind incluida en el paquete se desactualiza con el tiempo. Sin `updatedb.js` periódico, las IPs de rangos recién asignados retornarán null o país incorrecto. Considerar cron de actualización en producción.
- **req:any / res:any en auth.controller.ts** — Typing débil en métodos del controller. Pre-existente desde story 1-2. Refactorizar a tipos NestJS/Express correctos en limpieza futura.
- **@types/geoip-lite v1.4.x con runtime v2.0.x** — Los tipos son de la API v1 pero el runtime es v2. Funcionalmente compatible para el uso actual (`lookup()`). Actualizar si la API diverge.

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

- **Refresh token sin rotación ni invalidación** — `auth.service.ts`. No hay persistencia de refresh tokens (tabla o Redis). Imposible revocar tokens robados. Requiere diseño de tabla/Redis para token blacklist (post-MVP).
- **Rate limiting ausente en endpoints auth** — `/auth/refresh`, `/auth/me`. Sin protección contra brute force. Requiere infraestructura de rate limiting (post-MVP).
