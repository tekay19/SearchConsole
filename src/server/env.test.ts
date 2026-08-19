import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgres://sp:sp@localhost:5432/search_performance',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'a'.repeat(32),
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  APP_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
}

describe('parseEnv', () => {
  it('eksik DATABASE_URL için anlamlı hata verir', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/)
  })

  it('şifreleme anahtarının 32 bayt olmasını zorunlu kılar', () => {
    expect(() => parseEnv({ ...valid, APP_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') })).toThrow(/32/)
  })

  it('geçerli ortamı olduğu gibi döndürür', () => {
    expect(parseEnv(valid).DATABASE_URL).toBe(valid.DATABASE_URL)
  })

  it('modülü import etmek tek başına hata fırlatmaz', async () => {
    await expect(import('./env')).resolves.toBeDefined()
  })
})
