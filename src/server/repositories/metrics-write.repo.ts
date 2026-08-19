import { sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { countryDaily, dailyTotals, deviceDaily, pageDaily, queryDaily } from '@/server/db/schema'

/**
 * Tek seferde yazılan satır sayısı. Postgres'in sorgu parametre sınırı
 * (65535) satır başına 5-6 sütunla çarpıldığında bu civarda doluyor.
 */
const CHUNK = 2_000

async function inChunks<T>(rows: readonly T[], write: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let index = 0; index < rows.length; index += CHUNK) {
    await write(rows.slice(index, index + CHUNK))
  }
}

/**
 * Çakışmada üzerine yaz. Google son günlerin verisini geriye dönük
 * düzelttiği için aynı gün defalarca yazılır ve her seferinde en güncel
 * değer kazanır. Aynı işin iki kez çalışması da sonucu değiştirmez.
 */
const overwriteMetrics = {
  clicks: sql`excluded.clicks`,
  impressions: sql`excluded.impressions`,
  position: sql`excluded.position`,
}

export const metricsWriteRepo = {
  upsertDailyTotals: (rows: readonly (typeof dailyTotals.$inferInsert)[]) =>
    inChunks(rows, (chunk) =>
      db
        .insert(dailyTotals)
        .values(chunk)
        .onConflictDoUpdate({ target: [dailyTotals.siteId, dailyTotals.date], set: overwriteMetrics }),
    ),

  upsertQueryDaily: (rows: readonly (typeof queryDaily.$inferInsert)[]) =>
    inChunks(rows, (chunk) =>
      db
        .insert(queryDaily)
        .values(chunk)
        .onConflictDoUpdate({
          target: [queryDaily.siteId, queryDaily.date, queryDaily.queryKey],
          set: overwriteMetrics,
        }),
    ),

  upsertPageDaily: (rows: readonly (typeof pageDaily.$inferInsert)[]) =>
    inChunks(rows, (chunk) =>
      db
        .insert(pageDaily)
        .values(chunk)
        .onConflictDoUpdate({
          target: [pageDaily.siteId, pageDaily.date, pageDaily.pageKey],
          set: overwriteMetrics,
        }),
    ),

  upsertCountryDaily: (rows: readonly (typeof countryDaily.$inferInsert)[]) =>
    inChunks(rows, (chunk) =>
      db
        .insert(countryDaily)
        .values(chunk)
        .onConflictDoUpdate({
          target: [countryDaily.siteId, countryDaily.date, countryDaily.country],
          set: overwriteMetrics,
        }),
    ),

  upsertDeviceDaily: (rows: readonly (typeof deviceDaily.$inferInsert)[]) =>
    inChunks(rows, (chunk) =>
      db
        .insert(deviceDaily)
        .values(chunk)
        .onConflictDoUpdate({
          target: [deviceDaily.siteId, deviceDaily.date, deviceDaily.device],
          set: overwriteMetrics,
        }),
    ),
}
