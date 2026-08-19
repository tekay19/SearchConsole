import { describe, expect, it } from 'vitest'
import { hashPassword, passwordProblem, verifyPassword } from './password'

describe('hashPassword', () => {
  it('doğru parolayı kabul eder', async () => {
    const hash = await hashPassword('cok-gizli-parola')
    await expect(verifyPassword('cok-gizli-parola', hash)).resolves.toBe(true)
  })

  it('yanlış parolayı reddeder', async () => {
    const hash = await hashPassword('cok-gizli-parola')
    await expect(verifyPassword('yanlis-parola', hash)).resolves.toBe(false)
  })

  it('parolayı düz metin olarak saklamaz', async () => {
    const hash = await hashPassword('cok-gizli-parola')
    expect(hash).not.toContain('cok-gizli-parola')
  })

  it('aynı parola için her seferinde farklı özet üretir', async () => {
    // Tuz olmasaydi ayni parolayi kullanan iki kullanici veritabaninda
    // ayni satiri tasir ve biri cozulunce digeri de cozulurdu.
    const [first, second] = await Promise.all([hashPassword('ayni'), hashPassword('ayni')])
    expect(first).not.toBe(second)
  })

  it('Türkçe karakterli parolayı doğru çözer', async () => {
    const hash = await hashPassword('şifrem-ğüöçİ')
    await expect(verifyPassword('şifrem-ğüöçİ', hash)).resolves.toBe(true)
  })

  it('bozuk özet için çökmez, reddeder', async () => {
    await expect(verifyPassword('parola', 'bozuk-deger')).resolves.toBe(false)
    await expect(verifyPassword('parola', '')).resolves.toBe(false)
  })
})

describe('passwordProblem', () => {
  it('yeterince uzun parolayı kabul eder', () => {
    expect(passwordProblem('en-az-sekiz-karakter')).toBeNull()
  })

  it('kısa parolayı reddeder', () => {
    expect(passwordProblem('kisa')).toMatch(/8/)
  })

  it('boş parolayı reddeder', () => {
    expect(passwordProblem('')).not.toBeNull()
  })

  it('yalnızca boşluktan oluşan parolayı reddeder', () => {
    expect(passwordProblem('         ')).not.toBeNull()
  })
})
