import { DATA_LAG_DAYS } from '@/lib/date/period'
import { createGscClient } from '@/server/gsc/access-token'
import { GscError } from '@/server/gsc/errors'
import type { GscDimension } from '@/server/gsc/types'
import { metricsWriteRepo } from '@/server/repositories/metrics-write.repo'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { toDailyTotalRows, toDimensionRows } from './write-metrics'

/**
 * Google son günlerin verisini geriye dönük düzeltir. Bu pencereyi her
 * turda yeniden yazıyoruz; yazım idempotent olduğu için maliyeti yalnızca
 * birkaç isteğe mal oluyor, karşılığında sayılar hep doğru kalıyor.
 */
export const SYNC_LOOKBACK_DAYS = 5

const DAY = 86_400_000
const iso = (milliseconds: number) => new Date(milliseconds).toISOString().slice(0, 10)

export async function runDailySync(job: { siteId: string }, now = new Date()): Promise<void> {
  const site = await sitesRepo.findForSync(job.siteId)
  if (!site) return

  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DATA_LAG_DAYS * DAY
  const to = iso(endMs)

  // Hiç senkron olmamışsa yalnızca pencereyi çekeriz; geçmişi ayrı iş alır.
  const anchorMs = site.lastSyncedDate ? Date.parse(site.lastSyncedDate) : endMs
  const fromMs = Math.min(anchorMs - (SYNC_LOOKBACK_DAYS - 1) * DAY, endMs)
  if (fromMs > endMs) return

  try {
    const client = await createGscClient(site.connectionId)
    const fetchFor = (dimensions: GscDimension[]) =>
      client.queryPerformance({ property: site.gscProperty, from: iso(fromMs), to, dimensions })

    const [totals, queries, pages, countries, devices] = await Promise.all([
      fetchFor(['date']),
      fetchFor(['date', 'query']),
      fetchFor(['date', 'page']),
      fetchFor(['date', 'country']),
      fetchFor(['date', 'device']),
    ])

    await metricsWriteRepo.upsertDailyTotals(toDailyTotalRows(site.id, totals))
    await metricsWriteRepo.upsertQueryDaily(toDimensionRows(site.id, 'query', queries))
    await metricsWriteRepo.upsertPageDaily(toDimensionRows(site.id, 'page', pages))
    await metricsWriteRepo.upsertCountryDaily(toDimensionRows(site.id, 'country', countries))
    await metricsWriteRepo.upsertDeviceDaily(toDimensionRows(site.id, 'device', devices))

    // Başarı yalnızca veri gerçekten yazıldıktan sonra kaydedilir; yoksa
    // bir sonraki tur bu aralığı atlar ve boşluk kalıcı olur.
    await sitesRepo.recordSyncSuccess(site.id, to)
  } catch (error) {
    await sitesRepo.recordSyncFailure(site.id, error instanceof GscError ? error.code : 'unavailable')

    // Yeniden deneme kararı kuyruğundur; servis yalnızca durumu kaydeder.
    throw error
  }
}
