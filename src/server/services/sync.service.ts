import { sitesRepo } from '@/server/repositories/sites.repo'
import { enqueueSiteJob } from '@/server/sync/queue'

export const syncService = {
  /**
   * Kullanıcının istediği elle güncelleme.
   *
   * Sahiplik burada doğrulanır: site kimliği arayüzden gelir ve güvenilmez.
   * Kuyruk aynı kimlikli işi ikinci kez almadığı için düğmeye üst üste
   * basmak fazladan iş açmaz.
   */
  async requestRefresh(userId: string, siteId: string): Promise<boolean> {
    const owned = await sitesRepo.listForUser(userId)
    if (!owned.some((site) => site.id === siteId)) return false

    await enqueueSiteJob({ kind: 'daily', siteId })
    return true
  },
}
