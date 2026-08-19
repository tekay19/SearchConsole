import Link from 'next/link'
import { SiteSelectionForm } from '@/features/onboarding/site-selection-form'
import { copy } from '@/lib/copy'
import { formatCount } from '@/lib/format/number'
import { requireSession } from '@/server/auth'
import { onboardingService } from '@/server/services/onboarding.service'

/**
 * Girişten sonraki ilk ekran: hangi siteleri takip edeceğiz?
 *
 * Kullanıcı burada Search Console'un "property" kavramını bilmek zorunda
 * değil; yalnızca tanıdığı alan adlarını görüyor.
 */
export default async function SelectSitesPage() {
  const session = await requireSession()
  const sites = await onboardingService.discoverSites(session.userId, session.connectionId)

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="font-display text-sm font-semibold tracking-widest text-rise uppercase">
        {copy.onboarding.connectedTitle}
      </p>

      <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight text-balance">
        {copy.onboarding.selectTitle}
      </h1>

      {sites.length === 0 ? (
        <div className="mt-8 rounded-(--radius) bg-paper-raised p-6 ring-1 ring-rule">
          <p className="text-sm font-medium">{copy.onboarding.nothingFound}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{copy.onboarding.nothingFoundHelp}</p>
        </div>
      ) : (
        <>
          <p className="mt-3 mb-7 text-sm text-ink-muted">
            {copy.onboarding.foundCount(formatCount(sites.length))}
          </p>

          <SiteSelectionForm sites={sites} />
        </>
      )}

      <Link href="/genel-bakis" className="mt-8 self-start text-sm text-ink-faint underline-offset-4 hover:underline">
        {copy.onboarding.skipAction}
      </Link>
    </main>
  )
}
