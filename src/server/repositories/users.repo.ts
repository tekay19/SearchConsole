import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'

export type UserRow = typeof users.$inferSelect

export const usersRepo = {
  /** Google ile ilk girişte kullanıcıyı açar, sonraki girişlerde adını tazeler. */
  async upsertByEmail(input: { email: string; name: string | null }): Promise<{ id: string }> {
    const [row] = await db
      .insert(users)
      .values(input)
      .onConflictDoUpdate({ target: users.email, set: { name: input.name } })
      .returning({ id: users.id })

    if (!row) throw new Error('Kullanıcı kaydedilemedi.')
    return row
  },

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ?? null
  },
}
