# Configuración de Cloudflare — Rate Limiting

## Requisitos previos

- DNS proxy mode habilitado (nube naranja) para que el tráfico pase por Cloudflare
- `TRUST_PROXY=true` en las variables de entorno de producción (Dokploy/Docker) para que NestJS lea `CF-Connecting-IP` / `X-Forwarded-For`

## Reglas de Rate Limiting (Cloudflare Dashboard → Security → WAF → Rate limiting rules)

### Regla 1: Auth endpoints
- **Match:** URI Path starts with `/api/auth/`
- **Rate:** Max 30 requests per minute per IP
- **Action:** Block (con challenge si se prefiere)

### Regla 2: API general
- **Match:** URI Path starts with `/api/`
- **Rate:** Max 200 requests per minute per IP
- **Action:** Block

## Security Level
- Configurar en **Medium** (Security → Settings → Security Level)

## Under Attack Mode
- Disponible para activación manual durante ataques activos
- Dashboard → Overview → Quick Actions → "I'm Under Attack!"
- Agrega un interstitial de 5 segundos para verificar que los visitantes son humanos

## Notas
- Los límites están pensados para acomodar IPs compartidas (universidad, oficina, café). 20 usuarios detrás de la misma IP no deberían verse afectados.
- Las capas de defensa son: Cloudflare (L1) → @nestjs/throttler (L2) → WebSocket guards (L3)
