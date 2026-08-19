import { PageHeader } from '@/components/app-shell/page-header'
import { DimensionTable } from '@/features/dimensions/dimension-table'
import { scopeFromParams, type PageParams } from '@/features/dimensions/scope'
import { copy } from '@/lib/copy'
import { requireSession } from '@/server/auth'
import { dimensionsService } from '@/server/services/dimensions.service'

export default async function SearchTermsPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>
}) {
  const session = await requireSession()
  const { scope, period } = scopeFromParams(await searchParams, session.userId)

  const rows = await dimensionsService.getTop('query', scope, period)

  return (
    <>
      <PageHeader title={copy.nav.searchTerms} />
      <DimensionTable
        heading={copy.dimensions.queriesHeading}
        keyColumnLabel={copy.dimensions.columns.term}
        rows={rows}
      />
    </>
  )
}
