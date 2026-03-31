# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared/package.json ./libs/shared/
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npx nx build api

# ── Stage 2: Production ────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/SuKuShaing/UltimaType.xyz

COPY --from=builder /app/apps/api/dist ./dist/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/generated ./generated/
COPY --from=builder /app/prisma ./prisma/
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
