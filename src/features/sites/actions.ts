'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/server/auth'
import { syncService } from '@/server/services/sync.service'

/**
 * "Tekrar Dene" düğmesi.
 *
 * Site kimliği formdan gelir ama servis bunun gerçekten bu kullanıcıya ait
 * olduğunu doğrular; aksi halde biri başkasının sitesini tetikleyebilirdi.
 */
export async function retrySiteSync(formData: FormData): Promise<void> {
  const session = await requireSession()
  const siteId = String(formData.get('siteId') ?? '')

  await syncService.requestRefresh(session.userId, siteId)

  revalidatePath('/sitelerim')
}
