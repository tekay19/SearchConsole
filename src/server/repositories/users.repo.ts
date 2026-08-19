import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'

export type UserRow = typeof users.$inferSelect

export const usersRepo = {
  /**
   * Yeni kullanıcı açar. E-posta zaten kayıtlıysa null döner —
   * çağıran taraf bunu "bu adres kullanımda" mesajına çevirir.
   */
  async create(input: { email: string; name: string | null; passwordHash: string }): Promise<{ id: string } | null> {
    const [row] = await db
      .insert(users)
      .values({ ...input, email: input.email.trim().toLowerCase() })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id })

    return row ?? null
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1)

    return row ?? null
  },

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ?? null
  },
}
