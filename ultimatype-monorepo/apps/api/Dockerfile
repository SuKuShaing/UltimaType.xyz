# ── Stage 0: Base (Node + pnpm) ─────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app

# pnpm desde la imagen oficial (variante Alpine/musl, igual que la base)
COPY --from=ghcr.io/pnpm/pnpm:12-alpine /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done

# Manifiestos del workspace (compartidos por builder y prod-deps)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared/package.json ./libs/shared/

# ── Stage 1: Build ──────────────────────────────────────────────
FROM base AS builder

# Install deps first (better layer caching)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm exec prisma generate
RUN pnpm exec nx build api
RUN pnpm exec nx build web

# ── Stage 2: Production dependencies only ───────────────────────
# Sin devDependencies (nx, webpack, vite, vitest, typescript...).
# prisma y @prisma/client están en dependencies: el entrypoint corre
# las migraciones y la API usa el cliente en runtime.
FROM base AS prod-deps
RUN pnpm install --prod --frozen-lockfile
# prisma-client-js genera el cliente dentro de node_modules
COPY prisma ./prisma/
RUN pnpm exec prisma generate --schema prisma/schema.prisma

# ── Stage 3: Production ────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/SuKuShaing/UltimaType.xyz

COPY --from=builder /app/apps/api/dist ./dist/
COPY --from=prod-deps /app/node_modules ./node_modules/
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/apps/web/dist ./public/
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
