import { db } from '@/server/db'
import { HISTORY_MONTHS_BACK, MONTHS_AHEAD, ensurePartitions } from '@/server/db/partitions'

/**
 * Bolumleri elle acmak icin: pnpm db:partitions
 * Gunluk otomatik calisan surumu Task 14'teki bakim isidir.
 */
const now = new Date()
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - HISTORY_MONTHS_BACK, 1))

const created = await ensurePartitions(db, start, HISTORY_MONTHS_BACK + MONTHS_AHEAD)

console.log(`${created.length} bolum hazir (${created[0]} ... ${created[created.length - 1]})`)
process.exit(0)
