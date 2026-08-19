import { and, between, eq, sql } from 'drizzle-orm'
import type { Period } from '@/lib/date/period'
import type { Totals } from '@/lib/metrics/aggregate'
import { db } from '@/server/db'
import { dailyTotals, sites } from '@/server/db/schema'

/** Tek site mi, kullanıcının tüm siteleri mi. */
export type SiteScope = { kind: 'all'; userId: string } | { kind: 'site'; siteId: string }

export type DailyPoint = { date: string; clicks: number; impressions: number }

/**
 * `Period` ve `Totals` tipleri src/lib'den gelir; burada yeniden
 * tanımlanmaz. Katman kuralı tek yönlüdür: sunucu lib'i import edebilir,
 * lib sunucuyu edemez.
 */
const scopeCondition = (scope: SiteScope) =>
  scope.kind === 'site'
    ? eq(dailyTotals.siteId, scope.siteId)
    : sql`${dailyTotals.siteId} IN (SELECT ${sites.id} FROM ${sites} WHERE ${sites.userId} = ${scope.userId})`

export const metricsReadRepo = {
  /**
   * Dönemin toplamı.
   *
   * Ağırlıklı sıra toplaması SQL'de yapılır: 90 günlük çok siteli
   * görünümde satırları uygulamaya çekmek gereksiz veri taşır.
   * Kural src/lib/metrics/aggregate.ts ile birebir aynı —
   * sum(position * impressions) / sum(impressions).
   */
  async totalsFor(scope: SiteScope, period: Period): Promise<Totals> {
    const [row] = await db
      .select({
        clicks: sql<number>`coalesce(sum(${dailyTotals.clicks}), 0)::int`,
        impressions: sql<number>`coalesce(sum(${dailyTotals.impressions}), 0)::int`,
        weightedPosition: sql<number>`coalesce(sum(${dailyTotals.position} * ${dailyTotals.impressions}), 0)::float8`,
      })
      .from(dailyTotals)
      .where(and(scopeCondition(scope), between(dailyTotals.date, period.from, period.to)))

    const clicks = row?.clicks ?? 0
    const impressions = row?.impressions ?? 0

    return {
      clicks,
      impressions,
      clickRate: impressions === 0 ? null : clicks / impressions,
      rank: impressions === 0 ? null : (row?.weightedPosition ?? 0) / impressions,
    }
  },

  /** Grafiğin çizdiği günlük seri. Sıra burada gerekmiyor, taşınmıyor. */
  async dailySeries(scope: SiteScope, period: Period): Promise<DailyPoint[]> {
    return db
      .select({
        date: dailyTotals.date,
        clicks: sql<number>`sum(${dailyTotals.clicks})::int`,
        impressions: sql<number>`sum(${dailyTotals.impressions})::int`,
      })
      .from(dailyTotals)
      .where(and(scopeCondition(scope), between(dailyTotals.date, period.from, period.to)))
      .groupBy(dailyTotals.date)
      .orderBy(dailyTotals.date)
  },

  /**
   * Kullanıcının tüm siteleri için toplam — site başına ayrı sorgu değil,
   * tek sorgu. 50 siteli bir kullanıcıda 100 sorgu yerine 2 sorgu çalışır.
   */
  async totalsForMany(userId: string, period: Period): Promise<Map<string, Totals>> {
    const rows = await db
      .select({
        siteId: dailyTotals.siteId,
        clicks: sql<number>`sum(${dailyTotals.clicks})::int`,
        impressions: sql<number>`sum(${dailyTotals.impressions})::int`,
        weightedPosition: sql<number>`sum(${dailyTotals.position} * ${dailyTotals.impressions})::float8`,
      })
      .from(dailyTotals)
      .innerJoin(sites, eq(sites.id, dailyTotals.siteId))
      .where(and(eq(sites.userId, userId), between(dailyTotals.date, period.from, period.to)))
      .groupBy(dailyTotals.siteId)

    return new Map(
      rows.map((row) => [
        row.siteId,
        {
          clicks: row.clicks,
          impressions: row.impressions,
          clickRate: row.impressions === 0 ? null : row.clicks / row.impressions,
          rank: row.impressions === 0 ? null : row.weightedPosition / row.impressions,
        },
      ]),
    )
  },
}
