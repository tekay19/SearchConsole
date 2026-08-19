import { sql } from 'drizzle-orm'
import type { Db } from './index'

/**
 * Yalnızca bu iki tablo bölümlenir. Arama kelimesi ve sayfa satırları
 * hacmin tamamına yakınını oluşturur (site başına günde binlerce satır);
 * ülke ve cihaz tabloları küçük kaldığı için bölümlenmez.
 */
export const PARTITIONED_TABLES = ['query_daily', 'page_daily'] as const

export type PartitionRange = { suffix: string; from: string; to: string }

/** Google en fazla 16 ay geriye veri verir; bir ay pay bırakıyoruz. */
export const HISTORY_MONTHS_BACK = 17

/** Bakım işi her gün bu kadar ay ileriyi önden açar. */
export const MONTHS_AHEAD = 3

const iso = (date: Date) => date.toISOString().slice(0, 10)

/** Verilen günün içinde bulunduğu ayın bölüm aralığı. Üst sınır dışlayıcıdır. */
export function partitionRangeFor(day: Date): PartitionRange {
  const year = day.getUTCFullYear()
  const month = day.getUTCMonth()
  return {
    suffix: `${year}_${String(month + 1).padStart(2, '0')}`,
    from: iso(new Date(Date.UTC(year, month, 1))),
    to: iso(new Date(Date.UTC(year, month + 1, 1))),
  }
}

/** `from` ayından başlayarak ardışık `months` adet aylık aralık. */
export function partitionsToCreate(from: Date, months: number): PartitionRange[] {
  return Array.from({ length: months }, (_, offset) =>
    partitionRangeFor(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + offset, 1))),
  )
}

/**
 * Eksik bölümleri oluşturur, var olanlara dokunmaz.
 *
 * Bölümü olmayan bir tarihe yazmak Postgres hatasıdır, bu yüzden Task 14'teki
 * bakım işi her gün ileriye dönük birkaç ayı önden açar.
 */
export async function ensurePartitions(db: Db, from: Date, months: number): Promise<string[]> {
  const created: string[] = []

  for (const range of partitionsToCreate(from, months)) {
    for (const table of PARTITIONED_TABLES) {
      const name = `${table}_${range.suffix}`
      // sql.raw yalnızca burada kullanılır. Buraya giren her değer tarih
      // hesabından üretilir; dışarıdan gelen hiçbir girdi bu dizeye ulaşmaz.
      await db.execute(
        sql.raw(
          `CREATE TABLE IF NOT EXISTS ${name} PARTITION OF ${table} ` +
            `FOR VALUES FROM ('${range.from}') TO ('${range.to}')`,
        ),
      )
      created.push(name)
    }
  }

  return created
}
