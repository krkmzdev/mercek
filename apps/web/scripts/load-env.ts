// Side-effect import: loads .env.local BEFORE any module (e.g. @mercek/db's
// Prisma singleton) reads process.env. ESM evaluates imports in order, so this
// must be the first import in a script that touches the DB or LLM keys.
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });
