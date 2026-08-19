import { copy } from '@/lib/copy'
import { resolvePeriod, type RangeKey } from '@/lib/date/period'
import { toCsv, type CsvValue } from '@/lib/export/csv'
import { countryLabel, deviceLabel, pagePath } from '@/features/dimensions/labels'
import { ALL_SITES, parseDashboardParams } from '@/lib/url/search-params'
import { auth } from '@/server/auth'
import { dimensionsService } from '@/server/services/dimensions.service'
import { performanceService } from '@/server/services/performance.service'

const KINDS = ['query', 'page', 'country', 'device', 'daily'] as const
type Kind = (typeof KINDS)[number]

const isKind = (value: string): value is Kind => (KINDS as readonly string[]).includes(value)

const { columns } = copy.dimensions

/** Bir raporun başlıkları ve satırları. Etiketler ekrandakiyle aynı. */
async function build(
  kind: Kind,
  scope: Parameters<typeof performanceService.getOverview>[0],
  period: { from: string; to: string },
): Promise<{ headers: string[]; rows: CsvValue[][] }> {
  if (kind === 'daily') {
    const overview = await performanceService.getOverview(scope, period)
    return {
      headers: ['Tarih', columns.clicks, columns.views],
      rows: overview.series.map((point) => [point.date, point.clicks, point.impressions]),
    }
  }

  if (kind === 'country' || kind === 'device') {
    const rows = await dimensionsService.getShare(kind, scope, period)
    const label = kind === 'country' ? countryLabel : deviceLabel

    return {
      headers: [kind === 'country' ? 'Ülke' : 'Cihaz', columns.clicks, columns.views, columns.share],
      rows: rows.map((row) => [label(row.key), row.clicks, row.impressions, row.share]),
    }
  }

  const rows = await dimensionsService.getTop(kind, scope, period, 1_000)
  const label = kind === 'page' ? pagePath : (value: string) => value

  return {
    headers: [kind === 'page' ? columns.page : columns.term, columns.clicks, columns.views, columns.rank],
    rows: rows.map((row) => [label(row.key), row.clicks, row.impressions, row.rank]),
  }
}

/**
 * CSV indirme.
 *
 * Sunucu eylemi değil rota: tarayıcı bir dosya indirmesi başlatacak, bunun
 * için gerçek bir yanıt gövdesi ve Content-Disposition başlığı gerekiyor.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth()
  if (!session?.userId) return new Response(null, { status: 401 })

  const url = new URL(request.url)
  const kind = url.searchParams.get('tur') ?? ''
  if (!isKind(kind)) return new Response(null, { status: 400 })

  const { siteId, range } = parseDashboardParams(Object.fromEntries(url.searchParams))
  const period = resolvePeriod(range as RangeKey, new Date())

  const scope =
    siteId === ALL_SITES
      ? ({ kind: 'all', userId: session.userId } as const)
      : ({ kind: 'site', siteId } as const)

  const { headers, rows } = await build(kind, scope, period)

  /**
   * BOM olmadan Excel dosyayı Windows-1254 sanıp Türkçe harfleri bozuyor.
   * Üç baytlık UTF-8 imzası bunu tek başına çözüyor.
   */
  const body = `﻿${toCsv(headers, rows)}`
  const filename = `${kind}-${period.from}-${period.to}.csv`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
