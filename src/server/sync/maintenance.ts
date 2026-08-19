import { sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { MONTHS_AHEAD, PARTITIONED_TABLES, ensurePartitions, partitionRangeFor } from '@/server/db/partitions'
import { HISTORY_MONTHS } from './history-plan'

/**
 * Her gece çalışan bakım.
 *
 * Üç iş yapar ve üçü de ihmal edilirse sistem büyüdükçe sessizce bozulur:
 *
 * 1. İleriye dönük bölümleri açar. Bölümü olmayan bir tarihe yazmak
 *    Postgres hatasıdır; ay değiştiği gece toplama tamamen durur.
 * 2. Google'ın verdiğinden eski bölümleri düşürür. DELETE yerine
 *    DROP TABLE, çünkü milyonlarca satırı silmek saatler sürer ve
 *    tabloyu şişirir; bölüm düşürmek saniyeler alır.
 * 3. Silinmiş sitelerin satırlarını temizler. Bölümlenmiş tablolarda
 *    yabancı anahtar yok (her satır yazımını yavaşlatırdı), o yüzden
 *    artıkları burada topluyoruz.
 */
export async function runMaintenance(now = new Date()): Promise<void> {
  await ensurePartitions(db, now, MONTHS_AHEAD)

  // Google 16 ay veriyor; bir ay pay bırakıp öncesini düşürüyoruz.
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - HISTORY_MONTHS - 1, 1))
  const { suffix } = partitionRangeFor(cutoff)

  for (const table of PARTITIONED_TABLES) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS ${table}_${suffix}`))
  }

  await db.execute(sql`DELETE FROM query_daily WHERE site_id NOT IN (SELECT id FROM sites)`)
  await db.execute(sql`DELETE FROM page_daily  WHERE site_id NOT IN (SELECT id FROM sites)`)
}
