import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: .env is not auto-loaded; `dotenv/config` above loads it.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
