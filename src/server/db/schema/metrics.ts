import { sql } from 'drizzle-orm'
import { bigint, date, index, numeric, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { sites } from './core'

/**
 * Google'ın döndürdüğü `ctr` alanı bilerek saklanmaz. Oran her zaman
 * clicks / impressions ile yeniden hesaplanır (src/lib/metrics/aggregate.ts),
 * böylece iki farklı kaynaktan iki farklı oran çıkması mümkün olmaz.
 *
 * `position` o günün gösterim ağırlıklı ortalamasıdır. Birden çok günü
 * toplarken düz ortalama almak yanlıştır; ağırlıklı toplama kuralı yine
 * aggregate.ts içindedir.
 */
const metricColumns = {
  clicks: bigint('clicks', { mode: 'number' }).notNull(),
  impressions: bigint('impressions', { mode: 'number' }).notNull(),
  position: numeric('position', { precision: 6, scale: 2, mode: 'number' }).notNull(),
}

export const dailyTotals = pgTable(
  'daily_totals',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    ...metricColumns,
  },
  (table) => [primaryKey({ columns: [table.siteId, table.date] })],
)

/**
 * Bölümlenmiş tablo (aylık, `date` üzerinden). Bölümleme DDL'i drizzle-kit
 * tarafından üretilmez; ilgili göç dosyasında elle eklenmiştir.
 *
 * Birincil anahtar bölümleme sütununu (`date`) içermek zorundadır — Postgres
 * bölümlenmiş tabloda ON CONFLICT'i ancak bu durumda destekler ve toplama
 * işinin idempotentliği buna dayanır.
 *
 * `queryKey`, uzun arama metinleri yerine sabit boyutlu bir anahtar tutar;
 * indeksi küçük ve karşılaştırması ucuz kalır.
 *
 * Bu tabloda yabancı anahtar yoktur: bölümlenmiş tabloda FK doğrulaması her
 * satır yazımını yavaşlatır. Silinen sitelerin satırlarını bakım işi temizler.
 */
export const queryDaily = pgTable(
  'query_daily',
  {
    siteId: uuid('site_id').notNull(),
    date: date('date').notNull(),
    query: text('query').notNull(),
    queryKey: uuid('query_key').generatedAlwaysAs(sql`md5(query)::uuid`),
    ...metricColumns,
  },
  (table) => [
    primaryKey({ columns: [table.siteId, table.date, table.queryKey] }),
    index('query_daily_site_date_clicks_idx').on(table.siteId, table.date, table.clicks),
  ],
)

export const pageDaily = pgTable(
  'page_daily',
  {
    siteId: uuid('site_id').notNull(),
    date: date('date').notNull(),
    page: text('page').notNull(),
    pageKey: uuid('page_key').generatedAlwaysAs(sql`md5(page)::uuid`),
    pageTitle: text('page_title'),
    ...metricColumns,
  },
  (table) => [
    primaryKey({ columns: [table.siteId, table.date, table.pageKey] }),
    index('page_daily_site_date_clicks_idx').on(table.siteId, table.date, table.clicks),
  ],
)

/** Ülke ve cihaz kırılımları küçük kalır (site başına günde ~200 satır); bölümlenmez. */
export const countryDaily = pgTable(
  'country_daily',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    country: text('country').notNull(),
    ...metricColumns,
  },
  (table) => [primaryKey({ columns: [table.siteId, table.date, table.country] })],
)

export const deviceDaily = pgTable(
  'device_daily',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    device: text('device').notNull(),
    ...metricColumns,
  },
  (table) => [primaryKey({ columns: [table.siteId, table.date, table.device] })],
)
