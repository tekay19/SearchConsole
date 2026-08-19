import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { googleConnections, sites } from '@/server/db/schema'

export type ConnectionRow = typeof googleConnections.$inferSelect

/**
 * Bu katman yalnızca SQL yazar. Şifreleme çağıran tarafın işidir; buraya
 * gelen `*Encrypted` alanları zaten şifrelenmiş olarak gelir.
 */
export const connectionsRepo = {
  /**
   * Kullanıcı aynı Google hesabını yeniden bağladığında yeni kayıt açmaz,
   * mevcut kaydı tazeler ve iptal işaretini kaldırır.
   */
  async upsertFromGoogle(input: {
    userId: string
    googleSub: string
    googleEmail: string
    accessTokenEncrypted: string
    /** Yalnızca izin ekranından geçen akışta gelir; normal girişte null. */
    refreshTokenEncrypted: string | null
    accessTokenExpiresAt: Date
  }): Promise<{ id: string }> {
    const existing = await db
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(
        and(
          eq(googleConnections.userId, input.userId),
          eq(googleConnections.googleSub, input.googleSub),
        ),
      )
      .limit(1)

    if (!input.refreshTokenEncrypted && existing.length === 0) {
      // Yepyeni bir bağlantı yenileme jetonu olmadan işe yaramaz: arka
      // planda hiçbir zaman veri toplayamaz. Yarım kayıt açmak yerine duruyoruz.
      throw new Error('Google yenileme jetonu göndermedi; bağlantı kaydedilmedi.')
    }

    const [row] = await db
      .insert(googleConnections)
      .values({ ...input, refreshTokenEncrypted: input.refreshTokenEncrypted ?? '' })
      .onConflictDoUpdate({
        target: [googleConnections.userId, googleConnections.googleSub],
        set: {
          googleEmail: input.googleEmail,
          accessTokenEncrypted: input.accessTokenEncrypted,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          // Yeni jeton gelmediyse kayıtlıyı koru; ezmek bağlantıyı bozardı.
          ...(input.refreshTokenEncrypted
            ? { refreshTokenEncrypted: input.refreshTokenEncrypted }
            : {}),
          revokedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: googleConnections.id })

    if (!row) throw new Error('Google bağlantısı kaydedilemedi.')
    return row
  },

  async findById(id: string): Promise<ConnectionRow | null> {
    const [row] = await db.select().from(googleConnections).where(eq(googleConnections.id, id)).limit(1)
    return row ?? null
  },

  /**
   * Kullanıcının bağladığı tüm Google hesapları, her birinin site sayısıyla.
   * İptal edilmişler de listede kalır — kullanıcı bağlantıyı yenileyebilsin.
   */
  async listForUser(userId: string): Promise<Array<ConnectionRow & { siteCount: number }>> {
    const rows = await db
      .select({
        connection: googleConnections,
        siteCount: sql<number>`count(${sites.id})::int`,
      })
      .from(googleConnections)
      .leftJoin(sites, eq(sites.connectionId, googleConnections.id))
      .where(eq(googleConnections.userId, userId))
      .groupBy(googleConnections.id)
      .orderBy(googleConnections.createdAt)

    return rows.map((row) => ({ ...row.connection, siteCount: row.siteCount }))
  },

  /** İptal edilmemiş en güncel bağlantı. Site keşfi bunu kullanır. */
  async findActiveForUser(userId: string): Promise<ConnectionRow | null> {
    const [row] = await db
      .select()
      .from(googleConnections)
      .where(and(eq(googleConnections.userId, userId), isNull(googleConnections.revokedAt)))
      .orderBy(desc(googleConnections.updatedAt))
      .limit(1)
    return row ?? null
  },

  async saveRefreshedAccessToken(id: string, accessTokenEncrypted: string, expiresAt: Date): Promise<void> {
    await db
      .update(googleConnections)
      .set({ accessTokenEncrypted, accessTokenExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(googleConnections.id, id))
  },

  /** Kullanıcı Google tarafında izni geri aldığında çağrılır. */
  async markRevoked(id: string): Promise<void> {
    await db
      .update(googleConnections)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(googleConnections.id, id))
  },
}
