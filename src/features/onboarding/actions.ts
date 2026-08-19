'use server'

import { redirect } from 'next/navigation'
import { requireSession } from '@/server/auth'
import { onboardingService } from '@/server/services/onboarding.service'

/**
 * Seçilen siteleri ekler.
 *
 * Kullanıcı kimliği formdan değil oturumdan gelir; formdan gelen tek şey
 * hangi sitelerin seçildiği ve o da servis tarafında Google'a doğrulatılıyor.
 */
export async function addSelectedSites(formData: FormData): Promise<void> {
  const session = await requireSession()
  const properties = formData.getAll('site').map(String)

  const added = await onboardingService.addSites(session.userId, session.connectionId, properties)

  // Hiçbir şey eklenmediyse hazırlık ekranını göstermenin anlamı yok.
  if (added.length === 0) redirect('/genel-bakis')

  const query = new URLSearchParams(added.map((siteId) => ['site', siteId]))
  redirect(`/siteler/hazirlaniyor?${query.toString()}`)
}

/** Hazırlık ekranının iki saniyede bir çağırdığı yoklama. */
export async function fetchPreparationProgress(siteIds: string[]) {
  const session = await requireSession()
  return onboardingService.preparationProgress(session.userId, siteIds)
}
