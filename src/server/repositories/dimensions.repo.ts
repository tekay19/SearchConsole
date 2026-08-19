import { and, between, desc, eq, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { Period } from '@/lib/date/period'
import { db } from '@/server/db'
import { countryDaily, deviceDaily, pageDaily, queryDaily, sites } from '@/server/db/schema'
import type { SiteScope } from './metrics-read.repo'

export type DimensionKind = 'query' | 'page' | 'country' | 'device'

export type DimensionRow = {
  key: string
  clicks: number
  impressions: number
  clickRate: number | null
  rank: number | null
}

/** Her boyut için hangi tablo ve hangi sütun. Tek yer, dört giriş. */
const SOURCES = {
  query: { key: queryDaily.query, siteId: queryDaily.siteId, date: queryDaily.date },
  page: { key: pageDaily.page, siteId: pageDaily.siteId, date: pageDaily.date },
  country: { key: countryDaily.country, siteId: countryDaily.siteId, date: countryDaily.date },
  device: { key: deviceDaily.device, siteId: deviceDaily.siteId, date: deviceDaily.date },
} satisfies Record<DimensionKind, { key: PgColumn; siteId: PgColumn; date: PgColumn }>

export const dimensionsRepo = {
  /**
   * En çok tıklama alan N satır.
   *
   * Toplama kuralı metrics-read.repo ile aynı: oran toplamlardan, sıra
   * gösterim ağırlıklı. Sıralama tıklamaya göre — kullanıcı "beni en çok
   * kim buluyor" sorusunun cevabını arıyor, gösterimi değil.
   */
  async topBy(kind: DimensionKind, scope: SiteScope, period: Period, limit: number): Promise<DimensionRow[]> {
    const source = SOURCES[kind]

    const scopeCondition =
      scope.kind === 'site'
        ? eq(source.siteId, scope.siteId)
        : sql`${source.siteId} IN (SELECT ${sites.id} FROM ${sites} WHERE ${sites.userId} = ${scope.userId})`

    const rows = await db
      .select({
        key: source.key,
        clicks: sql<number>`sum(clicks)::int`,
        impressions: sql<number>`sum(impressions)::int`,
        weightedPosition: sql<number>`sum(position * impressions)::float8`,
      })
      .from(source.key.table)
      .where(and(scopeCondition, between(source.date, period.from, period.to)))
      .groupBy(source.key)
      .orderBy(desc(sql`sum(clicks)`))
      .limit(limit)

    return rows.map((row) => ({
      key: String(row.key),
      clicks: row.clicks,
      impressions: row.impressions,
      clickRate: row.impressions === 0 ? null : row.clicks / row.impressions,
      rank: row.impressions === 0 ? null : row.weightedPosition / row.impressions,
    }))
  },

  /**
   * Yüzde paylı liste — ülke ve cihaz ekranları için.
   * Pay, gösterilen satırlar üzerinden değil hepsi üzerinden hesaplanmalı,
   * yoksa yüzdeler toplamı yanıltıcı olur.
   */
  async shareOf(
    kind: DimensionKind,
    scope: SiteScope,
    period: Period,
  ): Promise<Array<DimensionRow & { share: number }>> {
    const rows = await this.topBy(kind, scope, period, 100)
    const total = rows.reduce((sum, row) => sum + row.clicks, 0)

    return rows.map((row) => ({ ...row, share: total === 0 ? 0 : row.clicks / total }))
  },
}
