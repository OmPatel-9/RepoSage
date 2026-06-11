import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '../env'

import * as schema from './schema'

/**
 * Cache the postgres-js client on globalThis so Next.js HMR (which re-evaluates
 * modules) doesn't open a new connection pool on every reload. The worker
 * process imports this module once, so it simply gets a fresh client.
 */
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined
}

const client =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client
}

export const db = drizzle(client, { schema })

export type Db = typeof db
