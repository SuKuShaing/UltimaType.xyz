# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared/package.json ./libs/shared/
RUN npm ci

# Copy source and build
COPY . .
RUN npx nx build web

# ── Stage 2: Nginx ─────────────────────────────────────────────
FROM nginx:alpine

LABEL org.opencontainers.image.source=https://github.com/SuKuShaing/UltimaType.xyz

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
