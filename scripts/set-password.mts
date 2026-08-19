import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { hashPassword, passwordProblem } from '@/server/auth/password'

/**
 * Var olan bir hesaba parola belirler.
 *
 * Kullanim:
 *   pnpm set-password <e-posta> <parola>
 *
 * Google ile acilmis eski hesaplarin parolasi yoktur ve giris yapamazlar.
 * Bu betik onlari yeni kimlik modeline tasir. Parola yalnizca ozetlenmis
 * haliyle yazilir; duz hali hicbir yere kaydedilmez.
 */
const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Kullanim: pnpm set-password <e-posta> <parola>')
  process.exit(1)
}

const problem = passwordProblem(password)
if (problem) {
  console.error(problem)
  process.exit(1)
}

const [updated] = await db
  .update(users)
  .set({ passwordHash: await hashPassword(password) })
  .where(eq(users.email, email.trim().toLowerCase()))
  .returning({ id: users.id, email: users.email })

if (!updated) {
  console.error(`Kullanici bulunamadi: ${email}`)
  process.exit(1)
}

console.log(`Parola belirlendi: ${updated.email}`)
console.log('Artik /giris adresinden bu e-posta ve parolayla girebilirsiniz.')
process.exit(0)
