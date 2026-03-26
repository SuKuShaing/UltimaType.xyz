# Deferred Work

## Deferred from: code review of story 1-2-oauth-2-0-integration-google-github (2026-03-26)

- **Refresh token sin rotación ni invalidación** — `auth.service.ts`. No hay persistencia de refresh tokens (tabla o Redis). Imposible revocar tokens robados. Requiere diseño de tabla/Redis para token blacklist (post-MVP).
- **Rate limiting ausente en endpoints auth** — `/auth/refresh`, `/auth/me`. Sin protección contra brute force. Requiere infraestructura de rate limiting (post-MVP).
