import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '@/server/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

/**
 * Anahtar ilk kullanımda çözülür. Modül seviyesinde okumak, ortam
 * değişkeni gerektirmeyen testlerin bu dosyayı dolaylı import ettiği anda
 * patlamasına yol açardı.
 */
let key: Buffer | undefined
const encryptionKey = () => (key ??= Buffer.from(env.APP_ENCRYPTION_KEY, 'base64'))

/**
 * Google jetonlarını veritabanına yazmadan önce şifreler.
 *
 * GCM seçildi çünkü sadece gizlilik değil bütünlük de gerekiyor: kurcalanmış
 * bir jeton sessizce çözülüp Google'a gönderilmemeli, hata vermeli.
 * Her çağrıda yeni IV üretilir; aynı jeton iki kez şifrelenirse çıktılar
 * farklı olur ve veritabanına bakan biri iki kaydın aynı olduğunu anlayamaz.
 *
 * Biçim: base64( iv[12] | tag[16] | ciphertext )
 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, 'base64')
  if (raw.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error('Şifreli değer geçersiz: beklenenden kısa.')
  }

  const iv = raw.subarray(0, IV_LENGTH)
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
