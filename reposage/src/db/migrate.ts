import '../env-load'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import { env } from '../env'

async function main(): Promise<void> {
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    onnotice: () => {},
  })
  const db = drizzle(client)

  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: 'drizzle' })
  console.log('Migrations applied.')

  await client.end()
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
