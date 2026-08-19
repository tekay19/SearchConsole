import { Suspense } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/app-shell/page-header'
import { retrySiteSync } from '@/features/sites/actions'
import { SiteCard } from '@/features/sites/site-card'
import { SiteTable } from '@/features/sites/site-table'
import { ViewToggle } from '@/features/sites/view-toggle'
import { copy } from '@/lib/copy'
import { resolvePeriod } from '@/lib/date/period'
import { parseDashboardParams } from '@/lib/url/search-params'
import { requireSession } from '@/server/auth'
import { sitesService } from '@/server/services/sites.service'

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const params = await searchParams
  const { range } = parseDashboardParams(params)

  const asTable = params.gorunum === 'tablo'
  const sites = await sitesService.listSummaries(session.userId, resolvePeriod(range, new Date()))

  return (
    <>
      <PageHeader title={copy.nav.sites} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Suspense>
          <ViewToggle />
        </Suspense>

        <Link
          href="/siteler/sec"
          className="rounded-lg bg-cobalt px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px"
        >
          {copy.sites.addAction}
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-(--radius) border border-dashed border-rule px-5 py-12 text-center">
          <p className="text-sm text-ink-muted">{copy.sites.empty}</p>
          <Link
            href="/siteler/sec"
            className="mt-3 inline-block text-sm font-medium text-cobalt underline-offset-4 hover:underline"
          >
            {copy.sites.emptyAction}
          </Link>
        </div>
      ) : asTable ? (
        <SiteTable sites={sites} onRetry={retrySiteSync} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} onRetry={retrySiteSync} />
          ))}
        </div>
      )}
    </>
  )
}
