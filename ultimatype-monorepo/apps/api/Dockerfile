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
RUN pnpm exec prisma generate
RUN pnpm exec nx build api
RUN pnpm exec nx build web

# ── Stage 2: Production ────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/SuKuShaing/UltimaType.xyz

COPY --from=builder /app/apps/api/dist ./dist/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/apps/web/dist ./public/
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
