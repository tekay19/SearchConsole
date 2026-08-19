import { PageHeader } from '@/components/app-shell/page-header'
import { countryLabel } from '@/features/dimensions/labels'
import { scopeFromParams, type PageParams } from '@/features/dimensions/scope'
import { ShareList } from '@/features/dimensions/share-list'
import { copy } from '@/lib/copy'
import { requireSession } from '@/server/auth'
import { dimensionsService } from '@/server/services/dimensions.service'

export default async function CountriesPage({ searchParams }: { searchParams: Promise<PageParams> }) {
  const session = await requireSession()
  const { scope, period } = scopeFromParams(await searchParams, session.userId)

  const rows = await dimensionsService.getShare('country', scope, period)

  return (
    <>
      <PageHeader title={copy.nav.countries} />
      <ShareList heading={copy.dimensions.countriesHeading} rows={rows} renderKey={countryLabel} />
    </>
  )
}
