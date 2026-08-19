import { ComingSoon } from '@/components/app-shell/coming-soon'
import { PageHeader } from '@/components/app-shell/page-header'
import { copy } from '@/lib/copy'

export default function Page() {
  return (
    <>
      <PageHeader title={copy.nav.devices} />
      <ComingSoon />
    </>
  )
}
