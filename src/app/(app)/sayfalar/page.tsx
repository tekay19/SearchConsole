import { PageHeader } from '@/components/app-shell/page-header'
import { DimensionTable } from '@/features/dimensions/dimension-table'
import { pagePath } from '@/features/dimensions/labels'
import { scopeFromParams, type PageParams } from '@/features/dimensions/scope'
import { copy } from '@/lib/copy'
import { requireSession } from '@/server/auth'
import { dimensionsService } from '@/server/services/dimensions.service'

export default async function PagesPage({ searchParams }: { searchParams: Promise<PageParams> }) {
  const session = await requireSession()
  const { scope, period } = scopeFromParams(await searchParams, session.userId)

  const rows = await dimensionsService.getTop('page', scope, period)

  return (
    <>
      <PageHeader title={copy.nav.pages} />
      <DimensionTable
        heading={copy.dimensions.pagesHeading}
        keyColumnLabel={copy.dimensions.columns.page}
        rows={rows}
        // Tam adres yerine yalnızca sayfa yolu; alan adı zaten seçili sitenin.
        renderKey={(key) => <span className="font-mono text-xs">{pagePath(key)}</span>}
      />
    </>
  )
}
