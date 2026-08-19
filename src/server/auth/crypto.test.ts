import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from './crypto'

// Şifreleme anahtarı vitest.setup.ts içindeki sahte ortamdan gelir.

describe('gizli değer şifreleme', () => {
  it('şifreleyip geri çözer', () => {
    const secret = 'refresh-token-degeri-1234567890'
    expect(decryptSecret(encryptSecret(secret))).toBe(secret)
  })

  it('Türkçe karakterleri bozmadan taşır', () => {
    expect(decryptSecret(encryptSecret('şğüöçİ-değer'))).toBe('şğüöçİ-değer')
  })

  it('aynı girdi için her seferinde farklı çıktı üretir', () => {
    expect(encryptSecret('ayni')).not.toBe(encryptSecret('ayni'))
  })

  it('şifreli metin ham değeri içermez', () => {
    const payload = encryptSecret('cok-gizli-deger')
    expect(payload).not.toContain('cok-gizli-deger')
    expect(Buffer.from(payload, 'base64').toString('utf8')).not.toContain('cok-gizli-deger')
  })

  it('kurcalanmış veriyi reddeder', () => {
    const raw = Buffer.from(encryptSecret('gizli'), 'base64')
    const lastIndex = raw.length - 1
    raw.writeUInt8(raw.readUInt8(lastIndex) ^ 0xff, lastIndex)
    expect(() => decryptSecret(raw.toString('base64'))).toThrow()
  })

  it('kısaltılmış veriyi reddeder', () => {
    const payload = encryptSecret('gizli')
    expect(() => decryptSecret(payload.slice(0, 8))).toThrow()
  })
})
