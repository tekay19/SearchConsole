import { connectionsRepo } from '@/server/repositories/connections.repo'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { usersRepo } from '@/server/repositories/users.repo'
import { deriveSiteStatus, type SiteStatusView } from './site-status'

export type ConnectionView = {
  googleEmail: string
  connectedAt: Date
  isActive: boolean
}

export type TrackedSite = {
  id: string
  displayName: string
  status: SiteStatusView
}

export type SettingsView = {
  email: string
  connection: ConnectionView | null
  sites: TrackedSite[]
}

export const settingsService = {
  async load(userId: string, now = new Date()): Promise<SettingsView> {
    const [user, connection, sites] = await Promise.all([
      usersRepo.findById(userId),
      connectionsRepo.findActiveForUser(userId),
      sitesRepo.listForUser(userId),
    ])

    return {
      email: user?.email ?? '',
      connection: connection
        ? {
            googleEmail: connection.googleEmail,
            connectedAt: connection.createdAt,
            isActive: connection.revokedAt === null,
          }
        : null,
      sites: sites.map((site) => ({
        id: site.id,
        displayName: site.displayName,
        status: deriveSiteStatus(site, now),
      })),
    }
  },

  /**
   * Siteyi takipten çıkarır. Sahiplik repository katmanında sorgunun
   * parçası; başkasının sitesini silme denemesi sessizce false döner.
   */
  async removeSite(userId: string, siteId: string): Promise<boolean> {
    return sitesRepo.remove(userId, siteId)
  },
}
