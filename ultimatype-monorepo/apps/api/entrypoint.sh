#!/bin/sh
set -e

# Prisma 7 needs datasource URL from prisma.config.ts, but TS files
# require a TypeScript runtime not available in production.
# Generate a native ESM config that Node can run directly.
cat > prisma.config.mjs << 'EOF'
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL },
});
EOF

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API server..."
exec node dist/main.js
