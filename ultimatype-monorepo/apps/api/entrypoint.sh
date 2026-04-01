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

echo "Syncing texts from seed data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
(async () => {
  await prisma.text.deleteMany();
  const texts = require('./prisma/seed-data/texts.json');
  const result = await prisma.text.createMany({ data: texts });
  console.log('Synced ' + result.count + ' texts');
  await prisma.\$disconnect();
})();
"

echo "Starting API server..."
exec node dist/main.js
