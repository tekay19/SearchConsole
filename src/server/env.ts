import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET en az 32 karakter olmalı'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'APP_ENCRYPTION_KEY tam 32 bayt olmalı (base64 kodlu)',
    ),
})

export type Env = z.infer<typeof schema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
    throw new Error(`Ortam değişkenleri eksik veya hatalı:\n${details}`)
  }
  return result.data
}

/**
 * Doğrulama ilk erişimde yapılır, import anında değil.
 *
 * Eager doğrulama, ortam değişkeni gerektirmeyen saf birim testlerinin bu
 * modülü dolaylı olarak import ettiği anda patlamasına yol açardı. Proxy,
 * `env.DATABASE_URL` yazım kolaylığını korurken hatayı gerçekten ihtiyaç
 * duyulan ana erteler.
 */
let cached: Env | undefined

export const env: Env = new Proxy({} as Env, {
  get(_target, property: string) {
    cached ??= parseEnv(process.env)
    return cached[property as keyof Env]
  },
})
