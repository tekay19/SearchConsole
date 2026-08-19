import type { GscRow } from '@/server/gsc/types'

export type DailyTotalInsert = {
  siteId: string
  date: string
  clicks: number
  impressions: number
  position: number
}

export type DimensionKind = 'query' | 'page' | 'country' | 'device'

/**
 * Dönen satır hangi boyut istendiyse o sütunu taşır. `Record<string, …>`
 * kullanmak tipi kaybettiriyordu ve yanlış tabloya yazmak derlemeden geçerdi.
 */
export type DimensionInsert<K extends DimensionKind> = DailyTotalInsert & { [P in K]: string }

/**
 * Google'ın satırları anahtar dizisiyle gelir; sıra istenen boyutlarla aynıdır.
 * `['date']` istendiyse keys[0] tarih, `['date', 'query']` istendiyse
 * keys[1] arama terimidir.
 *
 * Google'ın döndürdüğü `ctr` alanı bilerek hiçbir satıra girmez. Oran her
 * zaman clicks / impressions ile yeniden hesaplanır; iki kaynaktan iki
 * farklı oran çıkması mümkün olmamalı.
 */
export function toDailyTotalRows(siteId: string, rows: readonly GscRow[]): DailyTotalInsert[] {
  return rows.flatMap((row) => {
    const date = row.keys[0]
    if (!date) return []
    return [{ siteId, date, clicks: row.clicks, impressions: row.impressions, position: row.position }]
  })
}

export function toDimensionRows<K extends DimensionKind>(
  siteId: string,
  dimension: K,
  rows: readonly GscRow[],
): Array<DimensionInsert<K>> {
  return rows.flatMap((row) => {
    const date = row.keys[0]
    const value = row.keys[1]

    // Boş metin geçerli bir değerdir (Google boş arama terimi döndürebiliyor);
    // yalnızca anahtarın hiç olmaması satırı atar.
    if (!date || value === undefined) return []

    // Hesaplanmış anahtarlı nesne literali TypeScript'te daraltılamıyor;
    // tek daraltma noktası burası ve dönüş tipi doğru olanı zorluyor.
    return [
      {
        siteId,
        date,
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        [dimension]: value,
      } as DimensionInsert<K>,
    ]
  })
}
