import { PageHeader } from '@/components/app-shell/page-header'
import { copy } from '@/lib/copy'
import { resolvePeriod } from '@/lib/date/period'
import { formatPeriodRange } from '@/lib/format/time'
import { ALL_SITES, parseDashboardParams } from '@/lib/url/search-params'
import { requireSession } from '@/server/auth'
import { sitesService } from '@/server/services/sites.service'

const REPORTS = [
  { kind: 'daily', label: copy.reports.downloadDaily },
  { kind: 'query', label: copy.reports.downloadQueries },
  { kind: 'page', label: copy.reports.downloadPages },
  { kind: 'country', label: copy.reports.downloadCountries },
  { kind: 'device', label: copy.reports.downloadDevices },
] as const

/**
 * Veri indirme.
 *
 * Spec §9 gereği v1'de e-posta gönderimi yok; kullanıcının verisine
 * sahip çıkabilmesi için tablo indirmek yeterli. Bağlantılar ekrandaki
 * site ve tarih seçimini olduğu gibi taşıyor.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const params = await searchParams
  const { siteId, range } = parseDashboardParams(params)
  const period = resolvePeriod(range, new Date())

  const sites = await sitesService.listOptions(session.userId)
  const scopeName =
    siteId === ALL_SITES
      ? copy.reports.scopeAllSites
      : (sites.find((site) => site.id === siteId)?.displayName ?? copy.reports.scopeAllSites)

  const query = (kind: string) => {
    const search = new URLSearchParams({ tur: kind, aralik: range })
    if (siteId !== ALL_SITES) search.set('site', siteId)
    return `/api/rapor?${search.toString()}`
  }

  return (
    <>
      <PageHeader title={copy.nav.reports} />

      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-semibold tracking-tight">{copy.reports.heading}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{copy.reports.intro}</p>

        <p className="mt-5 text-sm text-ink-faint">
          {copy.reports.currentScope}
          <span className="ml-1 font-medium text-ink">{scopeName}</span>
          <span className="mx-1.5">·</span>
          <span className="font-medium text-ink">{formatPeriodRange(period.from, period.to)}</span>
        </p>

        <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-(--radius) bg-paper-raised ring-1 ring-rule">
          {REPORTS.map((report) => (
            <li key={report.kind}>
              <a
                href={query(report.kind)}
                download
                className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-cobalt-soft/40"
              >
                <span>{report.label}</span>
                <span aria-hidden="true" className="text-cobalt">
                  ↓
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
