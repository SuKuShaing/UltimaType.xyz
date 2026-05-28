# Guía de actualización del VPS

Checklist de mantenimiento periódico del servidor de UltimaType. Repetir cada 2-3 meses.

---

## 0. Antes de empezar

Todo el procedimiento tiene downtime mínimo (~1-2 min por redeploy). Los contenedores tienen `restart: unless-stopped` y se recuperan solos.

Conectarse por SSH al VPS:

```bash
ssh root@<IP_VPS>
```

---

## 1. Sistema operativo (Debian)

```bash
sudo apt update && sudo apt upgrade -y
```

Si se actualizó el kernel (`linux-image-*` en el output):

```bash
sudo reboot
```

Verificar que volvió:

```bash
lsb_release -a
uname -a
sudo apt update   # debe decir "All packages are up to date"
```

---

## 2. Docker Engine

```bash
docker --version
sudo apt install --only-upgrade docker-ce docker-ce-cli containerd.io
sudo systemctl restart docker
docker ps            # verificar que los contenedores están Up
```

---

## 3. Dokploy

En el panel web (`http://<IP_VPS>:3000`), hacer clic en el botón "Update available" si aparece.

También por CLI:

```bash
docker pull dokploy/dokploy:latest
```

---

## 4. Verificar versiones corriendo

```bash
docker exec ultimatype-compose-aq0obb-postgres-1 psql --version
docker exec ultimatype-compose-aq0obb-redis-1 redis-server --version
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

> El nombre del contenedor (`aq0obb`) puede cambiar con el tiempo. Usar `docker ps` para ver el nombre actual.

---

## 5. Actualizar dependencias npm (en tu máquina local)

Estando en la carpeta `ultimatype-monorepo`:

```bash
npm outdated        # ver qué está atrasado
npm update          # actualizar minors/patches (seguro)
npx prisma generate # regenerar Prisma client
```

### Verificar que todo compila

```bash
npx nx build api
npx nx build web
```

Si falla la API con errores `TS6059` (rootDir):
> Editar `apps/api/tsconfig.app.json` y quitar la línea `"rootDir": "src",`. Esto permite que webpack incluya archivos de `libs/shared` en la compilación.

Verificar tests:

```bash
npx nx test api
npx nx test web
```

---

## 6. Actualizar imágenes base Docker (pineo de versiones)

Las imágenes están pineadas en estos archivos. Verificar en Docker Hub si hay versiones más recientes:

| Archivo | Imagen | Tag actual |
|---|---|---|
| `docker-compose.prod.yml` | PostgreSQL | `postgres:16.14-alpine` |
| `docker-compose.prod.yml` | Redis | `redis:7.4.9-alpine` |
| `apps/api/Dockerfile` | Node.js | `node:24-alpine` |
| `apps/web/Dockerfile` | Node.js | `node:24-alpine` |
| `apps/web/Dockerfile` | Nginx | `nginx:1.31-alpine` |

Links para verificar tags disponibles:
- https://hub.docker.com/_/postgres/tags
- https://hub.docker.com/_/redis/tags
- https://hub.docker.com/_/node/tags
- https://hub.docker.com/_/nginx/tags

> **Nota**: `apps/web/Dockerfile` NO se usa en producción (la API sirve los estáticos del frontend). Pero mantenerlo actualizado por si se usa en el futuro.

---

## 7. GitHub Actions

Verificar versiones en `.github/workflows/deploy.yml`:

```yaml
- uses: actions/checkout@v4
- uses: docker/login-action@v3
- uses: docker/build-push-action@v6
```

Buscar si hay versiones más nuevas en GitHub Marketplace.

---

## 8. Desplegar

```bash
git add -A
git commit -m "mantenimiento: actualizar dependencias e imagenes"
git push
```

El pipeline automático:
1. GitHub Actions construye la imagen de la API
2. La sube a GHCR (`ghcr.io/sukushaing/ultimatype-api:latest`)
3. Llama al webhook de Dokploy
4. Dokploy hace pull de las imágenes nuevas y redeploya

Verificar en Dokploy (Logs) que el deploy fue exitoso.

---

## Resumen rápido

```bash
# En el VPS
sudo apt update && sudo apt upgrade -y
sudo apt install --only-upgrade docker-ce docker-ce-cli containerd.io
sudo systemctl restart docker
docker ps

# En local
npm outdated
npm update
npx prisma generate
npx nx build api && npx nx build web
npx nx test api && npx nx test web
git add -A && git commit -m "mantenimiento" && git push
```
