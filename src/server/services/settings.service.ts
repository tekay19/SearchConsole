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
  accounts: Array<ConnectionView & { id: string; siteCount: number }>
  sites: Array<TrackedSite & { accountEmail: string }>
}

export const settingsService = {
  async load(userId: string, now = new Date()): Promise<SettingsView> {
    const [user, connections, sites] = await Promise.all([
      usersRepo.findById(userId),
      connectionsRepo.listForUser(userId),
      sitesRepo.listForUser(userId),
    ])

    const emailByConnection = new Map(connections.map((row) => [row.id, row.googleEmail]))

    return {
      email: user?.email ?? '',
      accounts: connections.map((connection) => ({
        id: connection.id,
        googleEmail: connection.googleEmail,
        connectedAt: connection.createdAt,
        isActive: connection.revokedAt === null,
        siteCount: connection.siteCount,
      })),
      sites: sites.map((site) => ({
        id: site.id,
        displayName: site.displayName,
        status: deriveSiteStatus(site, now),
        // Hangi sitenin hangi hesaptan geldiği görünmezse, çok hesaplı
        // kullanıcı yanlış siteyi takipten çıkarabilir.
        accountEmail: emailByConnection.get(site.connectionId) ?? '',
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
