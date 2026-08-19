import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { connection } from '@/server/sync/queue'

export const LINK_COOKIE = 'sp_link_intent'

/** Kullanıcı Google ekranında oyalanabilir; on dakika fazlasıyla yeterli. */
const TTL_SECONDS = 600

const keyFor = (nonce: string) => `link-intent:${nonce}`

/**
 * "Hesap ekle" niyetini taşır.
 *
 * Neden gerekli: Google'a gidip dönerken hangi kullanıcının hesap eklediğini
 * hatırlamamız lazım. Auth.js yeni girişte eski oturum jetonunu vermiyor,
 * dolayısıyla dönüşte "bu kim" sorusunun cevabı kaybolur ve ikinci hesap
 * yeni bir kullanıcı olarak açılır.
 *
 * Kullanıcı kimliği çereze yazılmıyor, yalnızca rastgele bir anahtar.
 * Eşleşme sunucu tarafında (Redis) duruyor ve tek kullanımlık: çözülür
 * çözülmez siliniyor.
 */
export async function beginAccountLink(userId: string): Promise<void> {
  const nonce = randomBytes(32).toString('base64url')

  await connection.set(keyFor(nonce), userId, 'EX', TTL_SECONDS)

  const store = await cookies()
  store.set(LINK_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_SECONDS,
    path: '/',
  })
}

/** Niyeti çözer ve tüketir. Niyet yoksa null döner (normal giriş). */
export async function consumeAccountLink(): Promise<string | null> {
  const store = await cookies()
  const nonce = store.get(LINK_COOKIE)?.value
  if (!nonce) return null

  const userId = await connection.getdel(keyFor(nonce))
  store.delete(LINK_COOKIE)

  return userId
}
