import type { Trend } from '@/lib/metrics/trend'

export type InsightKind =
  | 'needs_reconnect'
  | 'stale_data'
  | 'position_change'
  | 'clicks_change'
  | 'query_breakout'

export type Insight = {
  kind: InsightKind
  /** Okun yönü. `warning` kullanıcının bir şey yapması gerektiğini söyler. */
  direction: 'up' | 'down' | 'warning'
  siteId: string
  /** Cümleyi kuran ham değerler. Biçimlendirme arayüzün işi. */
  values: Record<string, string | number>
  href: string
}

/**
 * Kural motorunun bir site hakkında bilmesi gereken her şey.
 *
 * `status` burada dar bir birleşim olarak duruyor: bu modül src/lib içinde
 * ve katman kuralı gereği sunucuya bakamaz. Servis, veritabanı tipini
 * buraya geçirirken TypeScript uyumu zaten zorluyor.
 */
export type SiteInsightInput = {
  siteId: string
  displayName: string
  status: 'fresh' | 'syncing' | 'needs_reconnect' | 'failed'
  daysSinceLastData: number
  clicksTrend: Trend
  rankTrend: Trend
  topQueryMover: { query: string; clicksGained: number; rankNow: number } | null
}

export type InsightInput = { sites: SiteInsightInput[] }
