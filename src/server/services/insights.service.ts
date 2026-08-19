import type { Period } from '@/lib/date/period'
import { buildInsights } from '@/lib/insights/rules'
import type { Insight, SiteInsightInput } from '@/lib/insights/types'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { dimensionsService } from './dimensions.service'
import { performanceService } from './performance.service'
import { deriveSiteStatus } from './site-status'

/** Aynı anda kaç site için veri toplanır. Veritabanını tek istekle boğmamak için. */
const BATCH_SIZE = 5

const DAY_MS = 86_400_000

async function inBatches<T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []

  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const batch = items.slice(index, index + BATCH_SIZE)
    results.push(...(await Promise.all(batch.map(run))))
  }

  return results
}

export const insightsService = {
  /**
   * Kullanıcının tüm siteleri için durum özeti üretir.
   *
   * Kural motoru saf bir fonksiyon (src/lib/insights); buradaki iş yalnızca
   * ona doğru girdiyi hazırlamak. Eşikler ve sıralama veritabanından
   * bağımsız test edilebilir olsun diye ayrıldı.
   */
  async forUser(userId: string, period: Period, now = new Date()): Promise<Insight[]> {
    const sites = await sitesRepo.listForUser(userId)

    const inputs = await inBatches(sites, async (site): Promise<SiteInsightInput> => {
      const scope = { kind: 'site', siteId: site.id } as const

      const [overview, topQueries] = await Promise.all([
        performanceService.getOverview(scope, period),
        dimensionsService.getTop('query', scope, period, 5),
      ])

      // En çok tıklama kazanan kelime; kazanmadıysa haber değeri yok.
      const mover = topQueries
        .filter((entry) => (entry.trend.absoluteChange ?? 0) > 0)
        .sort((a, b) => (b.trend.absoluteChange ?? 0) - (a.trend.absoluteChange ?? 0))[0]

      return {
        siteId: site.id,
        displayName: site.displayName,
        status: deriveSiteStatus(site, now).status,
        daysSinceLastData: site.lastSuccessAt
          ? Math.floor((now.getTime() - site.lastSuccessAt.getTime()) / DAY_MS)
          : Number.POSITIVE_INFINITY,
        clicksTrend: overview.trends.clicks,
        rankTrend: overview.trends.rank,
        topQueryMover: mover
          ? {
              query: mover.key,
              clicksGained: mover.trend.absoluteChange ?? 0,
              rankNow: mover.rank ?? Number.POSITIVE_INFINITY,
            }
          : null,
      }
    })

    return buildInsights({ sites: inputs })
  },
}
