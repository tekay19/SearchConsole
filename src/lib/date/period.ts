export type Period = { from: string; to: string }
export type RangeKey = '7d' | '28d' | '3m'

/**
 * Google performans verisi ~3 gün gecikmeyle kesinleşir. Son günleri
 * göstermek, kullanıcıya "tıklamalarım düştü" dedirtir; oysa veri henüz
 * tamamlanmamıştır. Bu yüzden dönem sonu bugünden bu kadar gün geridedir.
 */
export const DATA_LAG_DAYS = 3

const DAY = 86_400_000

const iso = (milliseconds: number) => new Date(milliseconds).toISOString().slice(0, 10)
const startOfUtcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

const LENGTHS: Record<RangeKey, number> = { '7d': 7, '28d': 28, '3m': 90 }

/** Seçilen aralığın gerçek tarih sınırları. Her iki uç da dahildir. */
export function resolvePeriod(key: RangeKey, today: Date): Period {
  const end = startOfUtcDay(today) - DATA_LAG_DAYS * DAY
  return { from: iso(end - (LENGTHS[key] - 1) * DAY), to: iso(end) }
}

export function periodLengthInDays({ from, to }: Period): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1
}

/**
 * Karşılaştırma dönemi: aynı uzunlukta, hemen önce, çakışmadan.
 * "Geçen aya göre" demek yerine "aynı uzunlukta önceki döneme göre" demek,
 * 7 günlük ve 90 günlük görünümlerde de doğru kalmasını sağlar.
 */
export function previousPeriod(period: Period): Period {
  const length = periodLengthInDays(period)
  const end = Date.parse(period.from) - DAY
  return { from: iso(end - (length - 1) * DAY), to: iso(end) }
}
