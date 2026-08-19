import { resolvePeriod, type Period, type RangeKey } from '@/lib/date/period'
import { ALL_SITES, parseDashboardParams } from '@/lib/url/search-params'
import type { SiteScope } from '@/server/services/performance.service'

export type PageParams = Record<string, string | string[] | undefined>

/**
 * Adres çubuğundaki seçimi kapsam ve döneme çevirir.
 *
 * Dört boyut ekranı da aynı şeyi yapıyordu; tek yerde durması hem
 * tekrarı hem de birinde unutulan bir kuralın diğerlerinden sapmasını
 * önlüyor.
 */
export function scopeFromParams(
  params: PageParams,
  userId: string,
  now = new Date(),
): { scope: SiteScope; period: Period; range: RangeKey } {
  const { siteId, range } = parseDashboardParams(params)

  const scope: SiteScope =
    siteId === ALL_SITES ? { kind: 'all', userId } : { kind: 'site', siteId }

  return { scope, period: resolvePeriod(range, now), range }
}
