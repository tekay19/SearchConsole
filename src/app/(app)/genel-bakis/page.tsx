import { PageHeader } from '@/components/app-shell/page-header'
import { KpiRow } from '@/components/metrics/kpi-row'
import { PerformanceChart } from '@/components/metrics/performance-chart'
import { copy } from '@/lib/copy'
import { resolvePeriod } from '@/lib/date/period'
import { ALL_SITES, parseDashboardParams } from '@/lib/url/search-params'
import { requireSession } from '@/server/auth'
import { performanceService } from '@/server/services/performance.service'

/**
 * Panelin ana ekranı.
 *
 * Sunucu bileşeni: veriyi toplar ve bileşenleri dizer. Hesap yapmaz —
 * karşılaştırma da biçimlendirme de kendi katmanlarında.
 */
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const { siteId, range } = parseDashboardParams(await searchParams)

  const scope =
    siteId === ALL_SITES
      ? ({ kind: 'all', userId: session.userId } as const)
      : ({ kind: 'site', siteId } as const)

  const overview = await performanceService.getOverview(scope, resolvePeriod(range, new Date()))

  return (
    <>
      <PageHeader title={copy.nav.overview} />
      <KpiRow overview={overview} />
      <PerformanceChart points={overview.series} />
    </>
  )
}
