import { copy } from '@/lib/copy'
import { formatCount, formatDelta, formatRank } from '@/lib/format/number'
import type { Insight } from '@/lib/insights/types'

/**
 * İçgörüyü kullanıcının okuyacağı cümleye çevirir.
 *
 * Kural motoru ham sayı üretir, biçimlendirme burada olur. Böylece eşikler
 * ve öncelik sırası dil değişikliğinden etkilenmez.
 */
export function insightText(insight: Insight): string {
  const site = String(insight.values.site ?? '')
  const num = (key: string) => Number(insight.values[key] ?? 0)

  switch (insight.kind) {
    case 'needs_reconnect':
      return copy.insights.needsReconnect(site)

    case 'stale_data':
      return copy.insights.staleData(site, formatCount(num('days')))

    case 'clicks_change':
      return insight.direction === 'up'
        ? copy.insights.clicksUp(site, formatDelta(num('change')))
        : copy.insights.clicksDown(site, formatDelta(num('change')))

    case 'position_change':
      return insight.direction === 'up'
        ? copy.insights.rankUp(site, formatRank(num('from')), formatRank(num('to')))
        : copy.insights.rankDown(site, formatRank(num('from')), formatRank(num('to')))

    case 'query_breakout':
      return copy.insights.queryBreakout(String(insight.values.query ?? ''))
  }
}
