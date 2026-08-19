import { previousPeriod, type Period } from '@/lib/date/period'
import type { Totals } from '@/lib/metrics/aggregate'
import { compareMetric, type Trend } from '@/lib/metrics/trend'
import { metricsReadRepo, type DailyPoint, type SiteScope } from '@/server/repositories/metrics-read.repo'

/**
 * Kapsam tipi servis yüzeyinden dışa açılır. Arayüz repository'ye
 * bakamaz (katman kuralı) ama bu tipe ihtiyacı var.
 */
export type { DailyPoint, SiteScope }

export type Overview = {
  totals: Totals
  previous: Totals
  trends: {
    clicks: Trend
    impressions: Trend
    clickRate: Trend
    rank: Trend
  }
  series: DailyPoint[]
}

export const performanceService = {
  /**
   * Panelin üst yarısının ihtiyaç duyduğu her şey.
   *
   * "Önceki dönemi de çek ve karşılaştır" bir iş kuralıdır, sorgu değil —
   * bu yüzden repository'de değil burada. Arayüz iki ayrı çağrı yapıp
   * farkı kendi hesaplamaz; hesap tek yerde durur.
   */
  async getOverview(scope: SiteScope, period: Period): Promise<Overview> {
    const totals = await metricsReadRepo.totalsFor(scope, period)
    const previous = await metricsReadRepo.totalsFor(scope, previousPeriod(period))
    const series = await metricsReadRepo.dailySeries(scope, period)

    return {
      totals,
      previous,
      series,
      trends: {
        clicks: compareMetric(totals.clicks, previous.clicks, {}),
        impressions: compareMetric(totals.impressions, previous.impressions, {}),
        clickRate: compareMetric(totals.clickRate, previous.clickRate, {}),
        // Tek istisna: sıra küçüldükçe iyileşir.
        rank: compareMetric(totals.rank, previous.rank, { lowerIsBetter: true }),
      },
    }
  },
}
