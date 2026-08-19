import { sitesRepo } from '@/server/repositories/sites.repo'

export type SiteOption = { id: string; displayName: string }

export const sitesService = {
  /** Site seçicinin ihtiyaç duyduğu asgari liste. */
  async listOptions(userId: string): Promise<SiteOption[]> {
    const sites = await sitesRepo.listForUser(userId)
    return sites.map((site) => ({ id: site.id, displayName: site.displayName }))
  },
}
