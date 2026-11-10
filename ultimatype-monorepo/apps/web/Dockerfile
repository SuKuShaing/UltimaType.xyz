# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# pnpm desde la imagen oficial (variante Alpine/musl, igual que la base)
COPY --from=ghcr.io/pnpm/pnpm:12-alpine /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared/package.json ./libs/shared/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm exec nx build web

# ── Stage 2: Nginx ─────────────────────────────────────────────
FROM nginx:1.31-alpine

LABEL org.opencontainers.image.source=https://github.com/SuKuShaing/UltimaType.xyz

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
