import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/server/db'
import { googleConnections } from '@/server/db/schema'

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
    refreshTokenEncrypted: string
    accessTokenExpiresAt: Date
  }): Promise<{ id: string }> {
    const [row] = await db
      .insert(googleConnections)
      .values(input)
      .onConflictDoUpdate({
        target: [googleConnections.userId, googleConnections.googleSub],
        set: {
          googleEmail: input.googleEmail,
          accessTokenEncrypted: input.accessTokenEncrypted,
          refreshTokenEncrypted: input.refreshTokenEncrypted,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
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
