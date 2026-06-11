/**
 * Side-effect module: loads .env.local / .env into process.env.
 * Import this BEFORE `@/env` in standalone scripts (drizzle.config.ts,
 * migrate.ts, workers). Next.js loads env files itself, so app code
 * never needs this.
 */
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })
