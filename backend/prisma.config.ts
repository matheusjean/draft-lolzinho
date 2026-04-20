import { defineConfig } from 'prisma/config';

import { applyEnvironmentFallbacks } from './src/config/env-fallbacks';

applyEnvironmentFallbacks();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --project tsconfig.json --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
