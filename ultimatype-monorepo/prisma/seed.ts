import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('Error: DATABASE_URL is not set');
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface SeedText {
  level: number;
  language: string;
  content: string;
}

async function main() {
  const dataPath = path.join(__dirname, 'seed-data', 'texts.json');
  const texts: SeedText[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const result = await prisma.$transaction(async (tx) => {
    await tx.text.deleteMany();
    return tx.text.createMany({ data: texts });
  });
  console.log(`Seeded ${result.count} texts`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
