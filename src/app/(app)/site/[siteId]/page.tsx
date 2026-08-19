import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/app-shell/page-header'
import { KpiRow } from '@/components/metrics/kpi-row'
import { PerformanceChart } from '@/components/metrics/performance-chart'
import { DimensionTable } from '@/features/dimensions/dimension-table'
import { countryLabel, deviceLabel, pagePath } from '@/features/dimensions/labels'
import { ShareList } from '@/features/dimensions/share-list'
import { copy } from '@/lib/copy'
import { resolvePeriod, type RangeKey } from '@/lib/date/period'
import { formatLastUpdate } from '@/lib/format/time'
import { parseDashboardParams } from '@/lib/url/search-params'
import { requireSession } from '@/server/auth'
import { dimensionsService } from '@/server/services/dimensions.service'
import { performanceService } from '@/server/services/performance.service'
import { sitesService } from '@/server/services/sites.service'

const TOP_PREVIEW = 5

/**
 * Tek bir sitenin tam görünümü: sayılar, grafik ve dört kırılımın ilk
 * beş satırı. Detaya inmek isteyen ilgili bölüme geçer.
 */
export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const { siteId } = await params
  const { range } = parseDashboardParams(await searchParams)
  const period = resolvePeriod(range, new Date())

  const summaries = await sitesService.listSummaries(session.userId, period)
  const site = summaries.find((candidate) => candidate.id === siteId)

  // Başkasının sitesini adres çubuğuna yazan kullanıcı veri görmemeli.
  if (!site) notFound()

  const scope = { kind: 'site', siteId } as const

  const [overview, queries, pages, countries, devices] = await Promise.all([
    performanceService.getOverview(scope, period),
    dimensionsService.getTop('query', scope, period, TOP_PREVIEW),
    dimensionsService.getTop('page', scope, period, TOP_PREVIEW),
    dimensionsService.getShare('country', scope, period),
    dimensionsService.getShare('device', scope, period),
  ])

  const seeAll = (path: string) => `${path}?site=${siteId}&aralik=${range satisfies RangeKey}`

  return (
    <>
      <PageHeader title={site.displayName} />

      <p className="-mt-4 mb-6 text-sm text-ink-faint">
        {site.lastDataAt
          ? `${copy.sites.lastData} ${formatLastUpdate(site.lastDataAt, new Date())}`
          : copy.sites.neverSynced}
      </p>

      <KpiRow overview={overview} />
      <PerformanceChart points={overview.series} />

      <div className="mt-10 space-y-10">
        <div>
          <DimensionTable
            heading={copy.dimensions.queriesHeading}
            keyColumnLabel={copy.dimensions.columns.term}
            rows={queries}
          />
          <Link
            href={seeAll('/arama-kelimeleri')}
            className="mt-3 inline-block text-sm font-medium text-cobalt underline-offset-4 hover:underline"
          >
            {copy.dimensions.seeAll}
          </Link>
        </div>

        <div>
          <DimensionTable
            heading={copy.dimensions.pagesHeading}
            keyColumnLabel={copy.dimensions.columns.page}
            rows={pages}
            renderKey={(key) => <span className="font-mono text-xs">{pagePath(key)}</span>}
          />
          <Link
            href={seeAll('/sayfalar')}
            className="mt-3 inline-block text-sm font-medium text-cobalt underline-offset-4 hover:underline"
          >
            {copy.dimensions.seeAll}
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <ShareList heading={copy.dimensions.countriesHeading} rows={countries} renderKey={countryLabel} />
          <ShareList heading={copy.dimensions.devicesHeading} rows={devices} renderKey={deviceLabel} />
        </div>
      </div>
    </>
  )
}
