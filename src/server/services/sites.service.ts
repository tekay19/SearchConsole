import { previousPeriod, type Period } from '@/lib/date/period'
import type { Totals } from '@/lib/metrics/aggregate'
import { compareMetric, type Trend } from '@/lib/metrics/trend'
import { metricsReadRepo } from '@/server/repositories/metrics-read.repo'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { deriveSiteStatus, type SiteStatusView } from './site-status'

export type SiteOption = { id: string; displayName: string }

export type SiteSummary = {
  id: string
  displayName: string
  clicks: number
  impressions: number
  clickRate: number | null
  rank: number | null
  clicksTrend: Trend
  status: SiteStatusView
  lastDataAt: Date | null
}

const EMPTY_TOTALS: Totals = { clicks: 0, impressions: 0, clickRate: null, rank: null }

export const sitesService = {
  /** Site seçicinin ihtiyaç duyduğu asgari liste. */
  async listOptions(userId: string): Promise<SiteOption[]> {
    const sites = await sitesRepo.listForUser(userId)
    return sites.map((site) => ({ id: site.id, displayName: site.displayName }))
  },

  /**
   * "Web Sitelerim" ekranının tamamı.
   *
   * Toplamlar site başına değil tek sorguda çekilir: 50 siteli bir
   * kullanıcıda 100 sorgu yerine 2 sorgu çalışır.
   *
   * Verisi olmayan site listeden düşmez — yeni eklenmiş bir site
   * görünmezse kullanıcı "eklendi mi eklenmedi mi" diye düşünür.
   */
  async listSummaries(userId: string, period: Period, now = new Date()): Promise<SiteSummary[]> {
    const [sites, current, previous] = await Promise.all([
      sitesRepo.listForUser(userId),
      metricsReadRepo.totalsForMany(userId, period),
      metricsReadRepo.totalsForMany(userId, previousPeriod(period)),
    ])

    return sites.map((site) => {
      const totals = current.get(site.id) ?? EMPTY_TOTALS
      const before = previous.get(site.id) ?? EMPTY_TOTALS

      return {
        id: site.id,
        displayName: site.displayName,
        clicks: totals.clicks,
        impressions: totals.impressions,
        clickRate: totals.clickRate,
        rank: totals.rank,
        clicksTrend: compareMetric(totals.clicks, before.clicks, {}),
        status: deriveSiteStatus(site, now),
        lastDataAt: site.lastSuccessAt,
      }
    })
  },
}
