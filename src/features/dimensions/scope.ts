import { resolvePeriod, type Period, type RangeKey } from '@/lib/date/period'
import { ALL_ACCOUNTS, ALL_SITES, parseDashboardParams } from '@/lib/url/search-params'
import type { SiteScope } from '@/server/services/performance.service'

export type PageParams = Record<string, string | string[] | undefined>

export type ResolvedScope = {
  scope: SiteScope
  period: Period
  range: RangeKey
  siteId: string
  accountId: string
}

/**
 * Adres çubuğundaki seçimi kapsam ve döneme çevirir.
 *
 * Her ekran aynı şeyi yapıyordu; tek yerde durması hem tekrarı hem de
 * birinde unutulan bir kuralın diğerlerinden sapmasını önlüyor. Özellikle
 * hesap filtresi: bir yerde atlanırsa kullanıcı başka hesabının verisini
 * görürdü.
 *
 * Site seçimi hesap seçimini ezmez; bir site zaten tek bir hesaba ait.
 */
export function scopeFromParams(params: PageParams, userId: string, now = new Date()): ResolvedScope {
  const { siteId, accountId, range } = parseDashboardParams(params)

  const scope: SiteScope =
    siteId === ALL_SITES
      ? { kind: 'all', userId, connectionId: accountId === ALL_ACCOUNTS ? undefined : accountId }
      : { kind: 'site', siteId }

  return { scope, period: resolvePeriod(range, now), range, siteId, accountId }
}
