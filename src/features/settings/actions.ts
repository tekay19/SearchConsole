'use server'

import { revalidatePath } from 'next/cache'
import { requireSession, signOut } from '@/server/auth'
import { startAccountLink } from '@/server/auth/flows'
import { settingsService } from '@/server/services/settings.service'

export async function removeTrackedSite(formData: FormData): Promise<void> {
  const session = await requireSession()
  const siteId = String(formData.get('siteId') ?? '')

  await settingsService.removeSite(session.userId, siteId)

  revalidatePath('/ayarlar')
  revalidatePath('/sitelerim')
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/baglan' })
}

/** Yeni bir Google hesabını mevcut kullanıcıya bağlar. */
export async function addGoogleAccount(): Promise<void> {
  const session = await requireSession()
  await startAccountLink(session.userId)
}
