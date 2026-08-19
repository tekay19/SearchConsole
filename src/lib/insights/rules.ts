import type { Insight, InsightInput, InsightKind, SiteInsightInput } from './types'

/** Ekranda en fazla bu kadar satır. Uzun liste okunmaz, okunmayan liste yoktur. */
export const MAX_INSIGHTS = 5

/** Bu oranın altındaki tıklama değişimi gürültüdür. */
export const CLICKS_CHANGE_THRESHOLD = 0.15

/** Bu kadar basamak oynamayan sıralama kayda değer değil. */
export const POSITION_CHANGE_THRESHOLD = 1.5

/** Günlük toplama çalışıyorsa veri bundan eski olamaz. */
export const STALE_AFTER_DAYS = 2

/** Bu sıraya yükselen kelime haber değeri taşır. */
export const BREAKOUT_TOP_RANK = 3

/**
 * Sıralama önceliği: önce kullanıcının çözebileceği sorunlar, sonra kötü
 * haber, en son iyi haber.
 *
 * Gerekçe: bu liste bir "ne yapmalıyım" listesi. Bağlantı kopmuşken
 * "tıklamalar %30 arttı" satırını üste koymak, kullanıcının aksiyon
 * gerektiren tek satırı kaçırmasına yol açar.
 */
const PRIORITY: Record<InsightKind, number> = {
  needs_reconnect: 0,
  stale_data: 1,
  position_change: 2,
  clicks_change: 3,
  query_breakout: 4,
}

function insightsForSite(site: SiteInsightInput): Insight[] {
  const siteHref = `/site/${site.siteId}`

  /**
   * Bağlantı kopmuşsa başka hiçbir şey söylenmez: veri gelmiyorsa
   * sayılar zaten eski, onlar hakkında yorum yapmak yanıltıcı olur.
   */
  if (site.status === 'needs_reconnect') {
    return [
      {
        kind: 'needs_reconnect',
        direction: 'warning',
        siteId: site.siteId,
        values: { site: site.displayName },
        href: siteHref,
      },
    ]
  }

  const found: Insight[] = []

  if (site.daysSinceLastData > STALE_AFTER_DAYS) {
    found.push({
      kind: 'stale_data',
      direction: 'warning',
      siteId: site.siteId,
      values: { site: site.displayName, days: site.daysSinceLastData },
      href: siteHref,
    })
  }

  const rankChange = site.rankTrend.absoluteChange
  if (rankChange !== null && Math.abs(rankChange) >= POSITION_CHANGE_THRESHOLD) {
    found.push({
      kind: 'position_change',
      direction: site.rankTrend.sentiment === 'good' ? 'up' : 'down',
      siteId: site.siteId,
      values: {
        site: site.displayName,
        from: site.rankTrend.previous ?? 0,
        to: site.rankTrend.current ?? 0,
      },
      href: siteHref,
    })
  }

  const clicksChange = site.clicksTrend.relativeChange
  if (clicksChange !== null && Math.abs(clicksChange) >= CLICKS_CHANGE_THRESHOLD) {
    found.push({
      kind: 'clicks_change',
      direction: clicksChange > 0 ? 'up' : 'down',
      siteId: site.siteId,
      values: { site: site.displayName, change: Math.abs(clicksChange) },
      href: siteHref,
    })
  }

  if (site.topQueryMover && site.topQueryMover.rankNow <= BREAKOUT_TOP_RANK) {
    found.push({
      kind: 'query_breakout',
      direction: 'up',
      siteId: site.siteId,
      values: {
        site: site.displayName,
        query: site.topQueryMover.query,
        clicks: site.topQueryMover.clicksGained,
      },
      href: `${siteHref}/arama-kelimeleri`,
    })
  }

  return found
}

/**
 * Sakin bir dönemde boş liste döner ve bu doğrudur — hiçbir şey olmadığında
 * bir şey olmuş gibi göstermek listeyi değersizleştirir.
 */
export function buildInsights({ sites }: InsightInput): Insight[] {
  return sites
    .flatMap(insightsForSite)
    .sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind])
    .slice(0, MAX_INSIGHTS)
}
