import type { PreparationStage } from '@/server/db/schema'
import { createGscClient } from '@/server/gsc/access-token'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { startHistorySync } from '@/server/sync/history-sync'

export type DiscoveredSite = {
  property: string
  displayName: string
  alreadyAdded: boolean
}

export type PreparationProgress = {
  siteId: string
  displayName: string
  stage: PreparationStage
}

/**
 * Google'ın site adresini kullanıcının tanıyacağı hâle çevirir.
 *
 * Google iki biçim döndürür: "sc-domain:example.com" ve
 * "https://example.com/". İkisi de Spec §4.1'in yasakladığı ham teknik
 * değer; ekranda yalnızca alan adı görünür.
 */
export function toDisplayName(property: string): string {
  const withoutPrefix = property.startsWith('sc-domain:')
    ? property.slice('sc-domain:'.length)
    : property

  try {
    return new URL(withoutPrefix).host.replace(/^www\./, '')
  } catch {
    return withoutPrefix.replace(/^www\./, '')
  }
}

export const onboardingService = {
  /** Google'daki siteler, hangileri zaten ekli bilgisiyle birlikte. */
  async discoverSites(userId: string, connectionId: string): Promise<DiscoveredSite[]> {
    const client = await createGscClient(connectionId)

    const [found, existing] = await Promise.all([client.listSites(), sitesRepo.listForUser(userId)])
    const existingProperties = new Set(existing.map((site) => site.gscProperty))

    return found
      .map((site) => ({
        property: site.property,
        displayName: toDisplayName(site.property),
        alreadyAdded: existingProperties.has(site.property),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'))
  },

  /**
   * Seçilen siteleri ekler ve her biri için geçmiş veri toplamayı başlatır.
   *
   * Seçim formdan gelir, yani güvenilmez. Eklemeden önce Google'ın gerçekten
   * bu kullanıcıya bu siteyi verdiğini doğruluyoruz; aksi halde biri başkasının
   * sitesini kendi paneline ekleyebilirdi.
   */
  async addSites(userId: string, connectionId: string, properties: string[]): Promise<string[]> {
    if (properties.length === 0) return []

    const client = await createGscClient(connectionId)
    const allowed = new Map((await client.listSites()).map((site) => [site.property, site]))

    const values = properties
      .filter((property) => allowed.has(property))
      .map((property) => {
        const site = allowed.get(property)!
        return {
          userId,
          connectionId,
          gscProperty: property,
          displayName: toDisplayName(property),
          permissionLevel: site.permissionLevel,
        }
      })

    const inserted = await sitesRepo.insertMany(values)

    for (const site of inserted) {
      await startHistorySync(site.id)
    }

    return inserted.map((site) => site.id)
  },

  /**
   * "Hazırlanıyor" ekranının yokladığı ilerleme.
   *
   * Kullanıcının kendi siteleriyle sınırlı: kimlikler adres çubuğundan
   * geliyor ve başkasının sitesinin durumunu göstermemeli.
   */
  async preparationProgress(userId: string, siteIds: string[]): Promise<PreparationProgress[]> {
    const owned = await sitesRepo.listForUser(userId)
    const wanted = new Set(siteIds)

    return owned
      .filter((site) => wanted.has(site.id))
      .map((site) => ({ siteId: site.id, displayName: site.displayName, stage: site.stage }))
  },
}
