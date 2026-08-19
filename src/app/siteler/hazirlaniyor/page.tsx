import { redirect } from 'next/navigation'
import { fetchPreparationProgress } from '@/features/onboarding/actions'
import { PreparationWatcher } from '@/features/onboarding/preparation-watcher'
import { copy } from '@/lib/copy'
import { requireSession } from '@/server/auth'
import { onboardingService } from '@/server/services/onboarding.service'

/**
 * Site eklendikten sonraki bekleme ekranı.
 *
 * Kullanıcı burada ne olduğunu insan diliyle görüyor. Hangi isteğin
 * atıldığı, kaç işin kuyrukta olduğu onun sorunu değil.
 */
export default async function PreparingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const params = await searchParams

  const raw = params.site
  const siteIds = Array.isArray(raw) ? raw : raw ? [raw] : []
  if (siteIds.length === 0) redirect('/genel-bakis')

  const initial = await onboardingService.preparationProgress(session.userId, siteIds)
  if (initial.length === 0) redirect('/genel-bakis')

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight">
        {copy.onboarding.preparingAll}
      </h1>

      <PreparationWatcher
        initial={initial}
        poll={async () => {
          'use server'
          return fetchPreparationProgress(siteIds)
        }}
      />
    </main>
  )
}
