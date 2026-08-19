export type MetricRow = { clicks: number; impressions: number; position: number }

export type Totals = {
  clicks: number
  impressions: number
  /** clicks / impressions. Gösterim yoksa null — sıfır demek yanıltıcı olurdu. */
  clickRate: number | null
  /** Gösterim ağırlıklı ortalama sıra. Gösterim yoksa null. */
  rank: number | null
}

/**
 * Bu projede sayıların yanlış toplanmasının iki yolu var ve ikisi de burada
 * kapatılıyor:
 *
 * 1. Oran asla ortalamaların ortalaması değildir. Günlük oranları toplayıp
 *    bölmek, az gösterimli günleri çok gösterimli günlerle eşit sayar.
 * 2. Ortalama sıra gösterim sayısıyla ağırlıklandırılır. Bir gün 2. sırada
 *    100 kez, başka bir gün 12. sırada 900 kez görünen site ortalama 7.
 *    sırada değil, 11. sıradadır.
 *
 * Toplamayı yapan başka bir yer olmamalı; SQL tarafındaki karşılığı
 * metrics-read.repo.ts icindeki sum(position * impressions) / sum(impressions)
 * ifadesidir ve aynı kurala uyar.
 */
export function aggregate(rows: readonly MetricRow[]): Totals {
  let clicks = 0
  let impressions = 0
  let weightedPosition = 0

  for (const row of rows) {
    clicks += row.clicks
    impressions += row.impressions
    weightedPosition += row.position * row.impressions
  }

  return {
    clicks,
    impressions,
    clickRate: impressions === 0 ? null : clicks / impressions,
    rank: impressions === 0 ? null : weightedPosition / impressions,
  }
}
