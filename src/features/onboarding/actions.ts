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

  await onboardingService.addSites(session.userId, session.connectionId, properties)

  redirect('/genel-bakis')
}
