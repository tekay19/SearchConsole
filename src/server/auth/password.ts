import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const SALT_BYTES = 16
const KEY_BYTES = 64

export const MIN_PASSWORD_LENGTH = 8

/**
 * scrypt seçildi: Node'un içinde geliyor, bellek-zor bir fonksiyon ve
 * parola kırma donanımına karşı SHA ailesinden kat kat dirençli.
 * Ek bağımlılık gerektirmemesi de bir artı — parola saklama, sürüm
 * yükseltmesi unutulunca sessizce zayıflayacak son yer olmalı.
 *
 * Biçim: "scrypt$<tuz>$<özet>" (ikisi de base64). Öne konan etiket,
 * ileride algoritma değişirse eski kayıtları tanıyabilmek için.
 */
export async function hashPassword(plain: string): Promise<string> {
  // Tuz olmadan aynı parolayı kullanan iki kişi aynı özeti taşır ve
  // biri çözülünce diğeri de çözülür.
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(plain.normalize('NFKC'), salt, KEY_BYTES)

  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, hashPart] = stored.split('$')
  if (scheme !== 'scrypt' || !saltPart || !hashPart) return false

  try {
    const expected = Buffer.from(hashPart, 'base64')
    const actual = await scrypt(plain.normalize('NFKC'), Buffer.from(saltPart, 'base64'), expected.length)

    // Sabit süreli karşılaştırma: baytları tek tek kıyaslayan bir kontrol,
    // yanıt süresinden parolanın ne kadarının doğru olduğunu sızdırır.
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

/** Kabul edilebilir parola mı? Sorun varsa kullanıcıya gösterilecek cümleyi döner. */
export function passwordProblem(plain: string): string | null {
  if (plain.trim().length === 0) return 'Lütfen bir parola belirleyin.'
  if (plain.length < MIN_PASSWORD_LENGTH) return `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`
  return null
}
