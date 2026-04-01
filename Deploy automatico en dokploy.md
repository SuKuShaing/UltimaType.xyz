# Guia de Despliegue - UltimaType

Guia paso a paso para desplegar UltimaType en un VPS con Dokploy, GitHub Actions y GHCR.

## Arquitectura del pipeline

```
Push a main --> GitHub Actions (build) --> GHCR (imagenes) --> Webhook --> Dokploy (deploy)
```

- **GitHub Actions**: compila los Dockerfiles y sube las imagenes a GHCR
- **GHCR** (GitHub Container Registry): almacena las imagenes Docker
- **Dokploy**: orquesta los contenedores en el VPS via Docker Compose
- **Cloudflare**: proxy DNS y SSL externo

---

## Paso 1: Preparar el VPS

1. Crear un VPS en CubePath (o proveedor similar) con Ubuntu 24.04
   - Minimo recomendado: 2 vCPU, 4 GB RAM (plan gp.micro)
   - IPv4 requerido si se usa Cloudflare como proxy DNS
2. Instalar Dokploy en el VPS:
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```
3. Acceder al panel de Dokploy en `http://<IP_VPS>:3000`

---

## Paso 2: Configurar los paquetes de GHCR como publicos

1. Ir a `https://github.com/<usuario>?tab=packages`
2. Para cada paquete (`ultimatype-api`, `ultimatype-web`):
   - Click en el paquete --> Package settings --> Danger Zone --> Change visibility --> **Public**

> Esto permite que Dokploy descargue las imagenes sin autenticacion.
> Si los paquetes aun no existen, se crean automaticamente en el primer push exitoso de GitHub Actions (paso 6). Volver a este paso despues.

---

## Paso 3: Crear el proyecto Compose en Dokploy

1. En Dokploy --> **Create Project** --> nombre descriptivo
2. Dentro del proyecto --> **Create Service** --> **Compose**
3. En la pestana **General**:
   - **Provider**: GitHub
   - **Repository**: `<usuario>/UltimaType.xyz`
   - **Branch**: `main`
   - **Compose Path**: `./ultimatype-monorepo/docker-compose.prod.yml`

---

## Paso 4: Configurar variables de entorno en Dokploy

Ir a la pestana **Environment** del compose y agregar:

```env
POSTGRES_PASSWORD=<contraseña_segura_generada>
JWT_SECRET=<secreto_jwt_generado>
JWT_REFRESH_SECRET=<secreto_refresh_generado>
GOOGLE_CLIENT_ID=<id_oauth_google>
GOOGLE_CLIENT_SECRET=<secreto_oauth_google>
GOOGLE_CALLBACK_URL=https://<dominio>/api/auth/google/callback
GITHUB_CLIENT_ID=<id_oauth_github>
GITHUB_CLIENT_SECRET=<secreto_oauth_github>
GITHUB_CALLBACK_URL=https://<dominio>/api/auth/github/callback
FRONTEND_URL=https://<dominio>
```

**Importante**: no usar comillas ni punto y coma al final de los valores.

---

## Paso 5: Configurar dominio en Dokploy

1. Ir a la pestana **Domains** --> **Add Domain**
2. Configurar:
   - **Host**: `<dominio>` (ej: `ultimatype.xyz`)
   - **Service**: seleccionar el servicio `web`
   - **Port**: `80`
   - **HTTPS**: activar (Let's Encrypt)

---

## Paso 6: Configurar Cloudflare

1. En Cloudflare, agregar registro DNS:
   - **Tipo**: A
   - **Nombre**: `@` (o subdominio)
   - **Contenido**: IP del VPS
   - **Proxy**: activado (nube naranja)
2. En SSL/TLS --> modo **Full (Strict)**

---

## Paso 7: Obtener la URL del webhook de Dokploy

1. En Dokploy, dentro del compose, buscar la seccion de deployments o settings
2. Copiar la **Webhook URL**, tiene este formato:
   ```
   http://<host_vps>:3000/api/deploy/compose/<compose_id>
   ```
3. Guardarla para el siguiente paso

---

## Paso 8: Configurar secretos en GitHub

Ir al repositorio en GitHub --> **Settings** --> **Secrets and variables** --> **Actions** --> **New repository secret**:

| Secreto | Valor |
|---------|-------|
| `DOKPLOY_WEBHOOK_URL` | La URL del webhook de Dokploy (paso 7, usar `http://`, NO `https://`) |

> `GITHUB_TOKEN` ya existe automaticamente, no hace falta crearlo.

---

## Paso 9: Archivos necesarios en el repositorio

Estos archivos ya existen en el repo. Se listan para referencia:

### `.github/workflows/deploy.yml`

El workflow de GitHub Actions que:
1. Se activa en push a `main` (solo si cambian archivos en `ultimatype-monorepo/`)
2. Construye las imagenes Docker (API y Web)
3. Las sube a GHCR con tags `:latest` y `:<commit_sha>`
4. Llama al webhook de Dokploy para disparar el redeploy

Puntos clave del webhook:
- Usar `http://` (puerto 3000 no tiene SSL)
- Incluir header `X-GitHub-Event: push`
- Incluir payload con `{"ref":"refs/heads/main"}` para que Dokploy valide el branch

### `ultimatype-monorepo/docker-compose.prod.yml`

Define los servicios de produccion:
- `postgres`: base de datos
- `redis`: cache y pub/sub
- `api`: imagen de GHCR, ejecuta migraciones y seed al arrancar
- `web`: imagen de GHCR, nginx sirve SPA y hace proxy a la API

Puntos clave:
- `pull_policy: always` en `api` y `web` para que siempre descargue la imagen mas reciente
- Red `dokploy-network` (external) para que Traefik de Dokploy pueda rutear al servicio web

### `ultimatype-monorepo/apps/api/Dockerfile`

Build multi-stage:
- **Stage 1 (builder)**: instala dependencias, genera Prisma client, compila con Nx
- **Stage 2 (production)**: copia dist, node_modules, prisma y entrypoint

Usa `node:24-alpine` (debe coincidir con la version de Node del `package-lock.json`).

### `ultimatype-monorepo/apps/web/Dockerfile`

Build multi-stage:
- **Stage 1 (builder)**: instala dependencias, compila con Nx
- **Stage 2 (nginx)**: sirve archivos estaticos con nginx

### `ultimatype-monorepo/apps/api/entrypoint.sh`

Se ejecuta al arrancar el contenedor API:
1. Genera `prisma.config.mjs` (Prisma 7 necesita config en JS, no TS, en produccion)
2. Ejecuta migraciones (`prisma migrate deploy`)
3. Sincroniza textos desde `prisma/seed-data/texts.json` (borra y recrea, solo tabla `texts`)
4. Inicia el servidor Node

### `ultimatype-monorepo/apps/web/nginx.conf`

- Sirve la SPA de React
- Proxy reverso: `/api/` y `/socket.io/` redirigen al contenedor `api:3000`
- Headers de WebSocket para Socket.IO

---

## Paso 10: Primer deploy

1. Hacer push a `main`
2. Esperar a que GitHub Actions termine (verificar en la pestana **Actions** del repo)
3. Si es el primer push, los paquetes GHCR se crean automaticamente. Volver al **Paso 2** para hacerlos publicos
4. En Dokploy, hacer **Deploy** manualmente la primera vez
5. Verificar en **Logs** que la API muestre:
   ```
   Synced 25 texts
   Application is running on: http://localhost:3000/api
   ```

---

## Deploys posteriores (automatico)

Solo hacer push a `main`. El pipeline completo se ejecuta automaticamente:

1. GitHub Actions detecta el push y construye las imagenes (~2-3 min)
2. Las imagenes se suben a GHCR
3. El webhook notifica a Dokploy
4. Dokploy hace pull de las imagenes nuevas y recrea los contenedores
5. El entrypoint ejecuta migraciones y seed automaticamente

---

## Troubleshooting

### Dokploy no actualiza los contenedores
- Verificar que `pull_policy: always` este en `docker-compose.prod.yml`
- En los logs de deploy, debe decir `Pulled` y `Recreated`, no solo `Running`

### Webhook dice "Branch Not Match"
- El curl debe incluir `-H "X-GitHub-Event: push"` y el payload con `"ref":"refs/heads/main"`
- Verificar que el branch configurado en Dokploy coincida con `main`

### Webhook falla con SSL error (exit code 35)
- Usar `http://` en la URL del webhook, NO `https://`
- El puerto 3000 de Dokploy es HTTP directo, no tiene SSL

### Prisma falla con "datasource.url property is required"
- Es porque `prisma.config.ts` no se puede ejecutar en produccion (no hay runtime TS)
- El `entrypoint.sh` genera `prisma.config.mjs` en runtime para resolver esto

### npm ci falla con dependencias faltantes
- Verificar que la version de Node en los Dockerfiles coincida con la que genero el `package-lock.json`
- Si el lock file se genero con npm 11 (Node 24), los Dockerfiles deben usar `node:24-alpine`

### Agregar textos nuevos
- Editar `ultimatype-monorepo/prisma/seed-data/texts.json`
- Push a main. El seed se ejecuta en cada deploy y sincroniza la tabla `texts`
- No afecta usuarios ni registros historicos
