import { createGscClient } from '@/server/gsc/access-token'
import type { GscDimension } from '@/server/gsc/types'
import { metricsWriteRepo } from '@/server/repositories/metrics-write.repo'
import type { SiteForSync } from '@/server/repositories/sites.repo'
import { toDailyTotalRows, toDimensionRows } from './write-metrics'

/**
 * Bir tarih aralığının tamamını Google'dan çeker ve veritabanına yazar.
 *
 * Günlük tur ile geçmiş dilimleri arasındaki tek fark hangi aralığın
 * istendiğidir; çekme ve yazma işi aynı. Tek yerde tutuluyor ki yeni bir
 * boyut eklendiğinde iki yerde birden unutulmasın.
 */
export async function fetchAndStoreRange(site: SiteForSync, from: string, to: string): Promise<void> {
  const client = await createGscClient(site.connectionId)
  const fetchFor = (dimensions: GscDimension[]) =>
    client.queryPerformance({ property: site.gscProperty, from, to, dimensions })

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
}
