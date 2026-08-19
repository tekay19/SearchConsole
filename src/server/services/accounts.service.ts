import { connectionsRepo } from '@/server/repositories/connections.repo'

export type AccountOption = {
  id: string
  googleEmail: string
  siteCount: number
  isActive: boolean
  connectedAt: Date
}

export const accountsService = {
  /**
   * Kullanıcının bağladığı Google hesapları.
   *
   * Bir kişi birden çok Google hesabı bağlayabiliyor; her sitenin hangi
   * hesaptan geldiği kayıtlı. Hesap seçici ve Ayarlar bu listeyi kullanır.
   */
  async listForUser(userId: string): Promise<AccountOption[]> {
    const connections = await connectionsRepo.listForUser(userId)

    return connections.map((connection) => ({
      id: connection.id,
      googleEmail: connection.googleEmail,
      siteCount: connection.siteCount,
      isActive: connection.revokedAt === null,
      connectedAt: connection.createdAt,
    }))
  },

  /**
   * Site eklerken kullanılacak hesap.
   *
   * Adres çubuğundan gelen kimlik doğrulanır: kullanıcının olmayan bir
   * hesapla site listelemeye çalışan istek, en güncel kendi hesabına düşer.
   */
  async resolveForUser(userId: string, requestedId: string | undefined): Promise<AccountOption | null> {
    const accounts = await this.listForUser(userId)

    const requested = requestedId ? accounts.find((account) => account.id === requestedId) : undefined
    if (requested) return requested

    return accounts.findLast((account) => account.isActive) ?? null
  },
}
