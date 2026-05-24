import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured')
}

declare global {
  // eslint-disable-next-line no-var
  var __pgClient__: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle<typeof schema>> | undefined
}

const client =
  globalThis.__pgClient__ ??
  postgres(databaseUrl, {
    max: 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 10,
  })

const db = globalThis.__db__ ?? drizzle(client, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgClient__ = client
  globalThis.__db__ = db
}

export { client, db }
