import type { RangeKey } from '@/lib/date/period'

const RANGES: readonly RangeKey[] = ['7d', '28d', '3m']

export const DEFAULT_RANGE: RangeKey = '28d'
export const ALL_SITES = 'all'

type ParamValue = string | string[] | undefined

const first = (value: ParamValue): string | undefined => (Array.isArray(value) ? value[0] : value)

/**
 * Site ve tarih seçimi adres çubuğunda yaşar.
 *
 * Böylece sayfa sunucuda render edilir, geri tuşu çalışır, kullanıcı
 * bağlantıyı paylaşabilir ve istemcide durum yönetimi gerekmez.
 * Geçersiz değer hata değil varsayılan üretir — adres çubuğuna elle bir
 * şey yazan kullanıcı hata ekranı görmemeli.
 */
export function parseDashboardParams(input: Record<string, ParamValue>): {
  siteId: string
  range: RangeKey
} {
  const range = first(input.aralik)

  return {
    siteId: first(input.site) ?? ALL_SITES,
    range: RANGES.includes(range as RangeKey) ? (range as RangeKey) : DEFAULT_RANGE,
  }
}

export function buildDashboardHref(
  base: string,
  params: { siteId?: string; range?: RangeKey },
): string {
  const search = new URLSearchParams()

  // Varsayılan değeri adreste taşımak bağlantıyı gereksiz uzatır.
  if (params.siteId && params.siteId !== ALL_SITES) search.set('site', params.siteId)
  if (params.range) search.set('aralik', params.range)

  const query = search.toString()
  return query ? `${base}?${query}` : base
}
