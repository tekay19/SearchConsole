import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/server/env'
import * as schema from './schema'

/**
 * Havuz hem web sürecinde hem işçi süreçte paylaşılır. Next.js geliştirme
 * modunda modülleri yeniden yüklediği için bağlantıyı globalde saklarız;
 * aksi halde her sıcak yenilemede yeni bir havuz açılır ve Postgres
 * bağlantı sınırı dolar.
 */
const globalForDb = globalThis as unknown as { __spClient?: ReturnType<typeof postgres> }

const client = (globalForDb.__spClient ??= postgres(env.DATABASE_URL, { max: 10 }))

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__spClient = client
}

export const db = drizzle(client, { schema })
export type Db = typeof db
