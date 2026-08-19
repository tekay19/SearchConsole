import { defineConfig } from 'drizzle-kit'

// Next.js .env.local'i kendisi yükler; drizzle-kit yüklemez.
// CI'da değişkenler ortamdan gelir, dosya yoksa sessizce devam ederiz.
try {
  process.loadEnvFile('.env.local')
} catch {
  // .env.local yok — ortam değişkenlerinin dışarıdan geldiğini varsayıyoruz.
}

export default defineConfig({
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
