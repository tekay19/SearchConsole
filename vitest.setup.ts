import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * Testing Library kendi temizliğini yalnızca Vitest globalleri açıkken
 * kurar; bizde kapalı olduğu için elle bağlıyoruz. Olmazsa render'lar
 * birikir ve "birden fazla öğe bulundu" hataları çıkar.
 */
afterEach(cleanup)

/**
 * Testler eksiksiz ama açıkça sahte bir ortamla çalışır.
 *
 * src/server/env.ts bilerek tüm değişkenleri birlikte doğrular — uygulama
 * açılırken eksiklerin tamamını tek seferde görmek istiyoruz. Bunun bedeli,
 * tek bir değişkene ihtiyaç duyan bir modülü test ederken de hepsinin
 * tanımlı olması gerekmesidir. Burada onu karşılıyoruz.
 *
 * Gerçek bir servise bağlanan test yoktur; bu değerler yalnızca şema
 * doğrulamasını geçmek içindir.
 */
const testEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/test',
  REDIS_URL: 'redis://127.0.0.1:6379',
  AUTH_SECRET: 'test-auth-secret-en-az-otuz-iki-karakter',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
}

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value
}
