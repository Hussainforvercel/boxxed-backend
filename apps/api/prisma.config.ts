import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env itself. Local dev reads apps/api/.env; CI/VPS inject env vars.
if (existsSync('.env')) process.loadEnvFile('.env');

// Migrations use the direct (non-pooled) Neon URL: PgBouncer transaction mode breaks
// migrate's advisory locks (docs/12-deployment.md). `prisma generate` needs no URL.
const directUrl = process.env.DIRECT_URL;
// Throwaway database used by `migrate dev` and the CI drift check (`migrate diff --from-migrations`).
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  ...(directUrl
    ? { datasource: { url: directUrl, ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}) } }
    : {}),
});
