# Search Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Search Console verisini çoklu site için otomatik toplayan ve teknik olmayan kullanıcıya "ne oldu / neden önemli / ne yapmalıyım" dilinde sunan bir dashboard inşa etmek.

**Architecture:** Tek bir Next.js (App Router) uygulaması + ayrı bir işçi süreci. Katmanlar tek yönlü bağımlıdır: `app → features → services → repositories → db`. Dış dünya (Google) tek bir adaptör klasörünün arkasındadır. Tüm kullanıcı metinleri tek bir sözlük dosyasında toplanır; arayüz bileşenlerinde düz metin yazmak lint hatası verir. Veri, tarihe göre aylık bölümlenmiş Postgres tablolarında tutulur; toplama işleri hız sınırlı bir kuyrukta çalışır.

**Tech Stack:** TypeScript (strict), Next.js 15 (App Router, RSC), Tailwind CSS v4, shadcn/ui, Recharts, PostgreSQL 16, Drizzle ORM, Auth.js v5 (Google), BullMQ + Redis, Vitest + Testing Library, Playwright, pnpm, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-19-search-performance-spec.md`

## Global Constraints

- **Node.js ≥ 22.11**, **pnpm ≥ 9**, **PostgreSQL 16**, **Redis 7**. Alt sürüm hedeflenmez.
- **TypeScript `strict: true` + `noUncheckedIndexedAccess: true`.** `any` yasak; `unknown` + daraltma kullanılır.
- **Katman bağımlılık yönü:** `app → features → server/services → server/repositories → server/db`. Ters yönde import ESLint hatasıdır. `src/lib/**` hiçbir zaman `src/server/**` import etmez.
- **Kullanıcıya görünen her metin `src/lib/copy/tr.ts` içinden gelir.** `.tsx` dosyalarında düz metin (`react/jsx-no-literals`) yasaktır.
- **Yasaklı arayüz terimleri** `docs/banned-ui-terms.md` dosyasındadır; sözlük bu listeye karşı testle denetlenir.
- **Biçimlendirme her zaman `tr-TR`**: `128.420`, `%3,0`, `8,4`.
- **Google kapsamı yalnızca** `https://www.googleapis.com/auth/webmasters.readonly`. Yazma kapsamı istenmez.
- **Sırlar veritabanına şifreli yazılır** (AES-256-GCM, `APP_ENCRYPTION_KEY`). Ham jeton loglanmaz.
- **Tüm zaman damgaları UTC `timestamptz`**; tarih boyutu `date` (Google'ın döndürdüğü gün, dönüştürülmez).
- **Her senkron yazımı idempotenttir**: aynı iş iki kez çalışırsa sonuç değişmez.
- **Test komutu** `pnpm test`, **lint** `pnpm lint`, **tip** `pnpm typecheck`. Üçü de yeşil olmadan commit atılmaz.

---

## Dosya Yapısı

```
.
├─ docker-compose.yml                 # postgres + redis (yalnız yerel geliştirme)
├─ docs/banned-ui-terms.md            # yasaklı terim listesi (tek kaynak)
├─ drizzle/                           # SQL göç dosyaları
├─ src/
│  ├─ app/                            # SADECE route, layout, sayfa iskeleti
│  │  ├─ (auth)/baglan/
│  │  ├─ (app)/genel-bakis/
│  │  ├─ (app)/sitelerim/
│  │  ├─ (app)/site/[siteId]/
│  │  └─ api/auth/[...nextauth]/
│  ├─ components/ui/                  # tasarım sistemi primitifleri (shadcn)
│  ├─ components/                     # paylaşılan bileşenler (KpiCard, TrendChart…)
│  ├─ features/                       # ekran bazlı bileşen + server erişimi
│  │  ├─ onboarding/
│  │  ├─ overview/
│  │  ├─ sites/
│  │  ├─ dimensions/
│  │  └─ insights/
│  ├─ server/
│  │  ├─ db/index.ts                  # drizzle bağlantısı
│  │  ├─ db/schema/*.ts               # tablo tanımları (tipleme için)
│  │  ├─ repositories/*.ts            # SADECE SQL, iş kuralı yok
│  │  ├─ services/*.ts                # iş kuralları, HTTP/React bilmez
│  │  ├─ gsc/*.ts                     # Google adaptörü (tek dış dünya kapısı)
│  │  ├─ sync/*.ts                    # kuyruk tanımı + iş işleyicileri
│  │  └─ auth/*.ts                    # Auth.js yapılandırması, şifreleme
│  ├─ lib/
│  │  ├─ copy/tr.ts                   # TÜM kullanıcı metinleri
│  │  ├─ format/*.ts                  # tr-TR biçimleyiciler
│  │  ├─ metrics/*.ts                 # saf metrik matematiği
│  │  └─ date/*.ts                    # dönem hesapları
│  └─ worker/index.ts                 # ayrı süreç girişi
└─ tests/e2e/                         # Playwright
```

**Sorumluluk kuralı:** bir dosya ya SQL yazar, ya iş kuralı uygular, ya ekran çizer — ikisini birden yapmaz. Bir dosya 250 satırı geçtiyse yanlış yerdedir.

---

## Faz 0 — Temel

### Task 1: Proje iskeleti ve katman sınırları

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `tests/architecture/layers.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `pnpm dev | build | lint | typecheck | test` komutları; `@/*` → `src/*` yol takma adı.

- [ ] **Step 1: Projeyi oluştur**

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Sıkı TypeScript ayarlarını aç**

`tsconfig.json` içindeki `compilerOptions` şunları içermeli:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "verbatimModuleSyntax": true
}
```

- [ ] **Step 3: Test altyapısını kur**

```bash
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/user-event jsdom
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
  },
})
```

`package.json` betikleri: `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`.

- [ ] **Step 4: Katman kuralı testini yaz (başarısız olacak)**

`tests/architecture/layers.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = readFileSync('eslint.config.mjs', 'utf8')

describe('katman sınırları', () => {
  it('repositories katmanı services import edemez', () => {
    expect(config).toContain('src/server/repositories/**')
    expect(config).toContain('@/server/services/*')
  })

  it('lib katmanı server import edemez', () => {
    expect(config).toContain('src/lib/**')
    expect(config).toContain('@/server/*')
  })

  it('arayüzde düz metin yasaktır', () => {
    expect(config).toContain('react/jsx-no-literals')
  })
})
```

- [ ] **Step 5: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test tests/architecture/layers.test.ts`
Expected: FAIL — `eslint.config.mjs` bu kuralları içermiyor.

- [ ] **Step 6: ESLint sınır kurallarını yaz**

`eslint.config.mjs` sonuna ekle:

```js
const deny = (patterns, message) => ({
  rules: {
    'no-restricted-imports': ['error', { patterns: patterns.map((group) => ({ group: [group], message })) }],
  },
})

export default [
  // ...mevcut next/typescript yapılandırması
  {
    files: ['src/server/repositories/**/*.ts'],
    ...deny(
      ['@/server/services/*', '@/features/*', '@/app/*', 'react', 'react-dom'],
      'Repository katmanı yalnızca @/server/db kullanabilir.',
    ),
  },
  {
    files: ['src/server/services/**/*.ts'],
    ...deny(['@/app/*', '@/features/*', 'react', 'react-dom'], 'Servis katmanı arayüz bilmez.'),
  },
  {
    files: ['src/lib/**/*.ts'],
    ...deny(['@/server/*', '@/features/*', '@/app/*'], 'lib katmanı saf yardımcılardan oluşur.'),
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
    ...deny(['@/server/repositories/*'], 'Arayüz repository çağırmaz, servis çağırır.'),
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: true, allowedStrings: ['·', '→', '↑', '↓', '●', '%'], ignoreProps: true }],
    },
  },
]
```

- [ ] **Step 7: Testleri ve lint'i çalıştır**

Run: `pnpm test tests/architecture/layers.test.ts; if ($?) { pnpm lint }`
Expected: test PASS, lint hatasız.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "chore: proje iskeleti ve katman sınırları"
```

---

### Task 2: Veritabanı ve kuyruk altyapısı

**Files:**
- Create: `docker-compose.yml`, `drizzle.config.ts`, `src/server/db/index.ts`, `src/server/env.ts`
- Test: `src/server/env.test.ts`

**Interfaces:**
- Consumes: Task 1'in `@/*` takma adı.
- Produces: `db` (Drizzle örneği), `env` (doğrulanmış ortam değişkenleri), `pnpm db:generate` ve `pnpm db:migrate` betikleri.

- [ ] **Step 1: Bağımlılıkları kur**

```bash
pnpm add drizzle-orm postgres zod; pnpm add -D drizzle-kit
```

- [ ] **Step 2: Yerel servisleri tanımla**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sp
      POSTGRES_PASSWORD: sp
      POSTGRES_DB: search_performance
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
volumes:
  pgdata:
```

- [ ] **Step 3: Ortam değişkeni testini yaz (başarısız olacak)**

`src/server/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('eksik DATABASE_URL için anlamlı hata verir', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/)
  })

  it('şifreleme anahtarının 32 bayt olmasını zorunlu kılar', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://x',
        REDIS_URL: 'redis://x',
        APP_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64'),
        AUTH_SECRET: 'a'.repeat(32),
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
      }),
    ).toThrow(/32/)
  })
})
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/env.test.ts`
Expected: FAIL — `./env` modülü yok.

- [ ] **Step 5: `src/server/env.ts` yaz**

```ts
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'APP_ENCRYPTION_KEY 32 bayt olmalı (base64)'),
})

export type Env = z.infer<typeof schema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source)
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'))
  }
  return result.data
}

export const env = parseEnv(process.env)
```

- [ ] **Step 6: Drizzle bağlantısını yaz**

`src/server/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/server/env'
import * as schema from './schema'

const client = postgres(env.DATABASE_URL, { max: 10 })
export const db = drizzle(client, { schema })
export type Db = typeof db
```

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

`package.json`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.

- [ ] **Step 7: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/env.test.ts`
Expected: PASS

- [ ] **Step 8: Servisleri ayağa kaldır ve bağlantıyı doğrula**

```bash
docker compose up -d
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: veritabanı bağlantısı ve ortam doğrulaması"
```

---

### Task 3: Metin sözlüğü ve yasaklı terim denetimi

**Files:**
- Create: `docs/banned-ui-terms.md`, `src/lib/copy/tr.ts`, `src/lib/copy/index.ts`
- Test: `src/lib/copy/copy.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `copy` — iç içe, `as const` ile tiplenmiş metin nesnesi. Tüm arayüz metinleri buradan okunur.

- [ ] **Step 1: Yasaklı terim listesini yaz**

`docs/banned-ui-terms.md` — her satır bir terim, `#` ile başlayan satırlar yorum:

```
# Bu terimler kullanıcıya gösterilen hiçbir metinde geçemez.
property
oauth
token
cron
dimension
metrik
impression
ctr
backfill
quota
endpoint
payload
webhook
sync
worker
query
api
```

- [ ] **Step 2: Denetim testini yaz (başarısız olacak)**

`src/lib/copy/copy.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { copy } from './index'

const banned = readFileSync('docs/banned-ui-terms.md', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith('#'))

function flatten(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]]
  if (typeof value === 'function') return []
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k))
  }
  return []
}

describe('metin sözlüğü', () => {
  it('yasaklı teknik terim içermez', () => {
    const offenders = flatten(copy).filter(([, text]) =>
      banned.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(text)),
    )
    expect(offenders).toEqual([])
  })

  it('her metin dolu bir dizedir', () => {
    for (const [path, text] of flatten(copy)) {
      expect(text.trim(), path).not.toBe('')
    }
  })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/copy`
Expected: FAIL — `./index` modülü yok.

- [ ] **Step 4: Sözlüğü yaz**

`src/lib/copy/tr.ts` (başlangıç iskeleti — sonraki task'ler kendi bölümlerini ekler):

```ts
export const tr = {
  app: {
    name: 'Search Performance',
    tagline: 'Web sitelerinizin Google performansını tek ekrandan takip edin.',
  },
  nav: {
    overview: 'Genel Bakış',
    sites: 'Web Sitelerim',
    searchTerms: 'Arama Kelimeleri',
    pages: 'En İyi Sayfalar',
    countries: 'Ülkeler',
    devices: 'Cihazlar',
    reports: 'Raporlar',
    settings: 'Ayarlar',
  },
  metrics: {
    clicks: {
      label: 'Tıklamalar',
      help: 'Google arama sonuçlarından sitenize gelen ziyaret sayısı.',
    },
    views: {
      label: "Google'da Görüntülenme",
      help: "Google'daki arama sonuçlarında sitenizin kaç kez gösterildiği.",
    },
    clickRate: {
      label: 'Tıklama Oranı',
      help: "Google'da sitenizi gören her 100 kişiden kaçının sitenize girdiği.",
    },
    rank: {
      label: 'Ortalama Google Sırası',
      help: "Sitenizin Google sonuçlarında ortalama kaçıncı sırada göründüğü. Küçük sayı daha iyidir.",
    },
  },
  status: {
    fresh: 'Güncel',
    syncing: 'Veri alınıyor',
    needsReconnect: 'Bağlantı gerekli',
    failed: 'Veri alınamadı',
  },
} as const
```

`src/lib/copy/index.ts`:

```ts
import { tr } from './tr'

export const copy = tr
export type Copy = typeof tr
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/lib/copy`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: kullanıcı metin sözlüğü ve yasaklı terim denetimi"
```

---

### Task 4: tr-TR biçimleyiciler

**Files:**
- Create: `src/lib/format/number.ts`, `src/lib/format/time.ts`
- Test: `src/lib/format/number.test.ts`, `src/lib/format/time.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `formatCount(value: number): string` → `128420` ⇒ `"128.420"`
  - `formatCompactCount(value: number): string` → `820000` ⇒ `"820 B"`
  - `formatRate(ratio: number): string` → `0.0295` ⇒ `"%2,95"`
  - `formatRank(value: number): string` → `8.42` ⇒ `"8,4"`
  - `formatDelta(percent: number): string` → `0.124` ⇒ `"%12,4"`
  - `formatLastUpdate(at: Date, now: Date): string` → `"Bugün 13:42"` | `"Dün 09:15"` | `"14 Ağustos 13:42"`

- [ ] **Step 1: Sayı testlerini yaz (başarısız olacak)**

`src/lib/format/number.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatCompactCount, formatCount, formatDelta, formatRank, formatRate } from './number'

describe('formatCount', () => {
  it('binlik ayıracı olarak nokta kullanır', () => {
    expect(formatCount(128420)).toBe('128.420')
  })
  it('sıfırı gösterir', () => {
    expect(formatCount(0)).toBe('0')
  })
})

describe('formatCompactCount', () => {
  it('büyük sayıları kısaltır', () => {
    expect(formatCompactCount(820000)).toBe('820 B')
    expect(formatCompactCount(4280320)).toBe('4,3 Mn')
  })
  it('binin altını kısaltmaz', () => {
    expect(formatCompactCount(940)).toBe('940')
  })
})

describe('formatRate', () => {
  it('yüzde işaretini başa koyar ve virgül kullanır', () => {
    expect(formatRate(0.0295)).toBe('%2,95')
  })
})

describe('formatRank', () => {
  it('tek ondalık gösterir', () => {
    expect(formatRank(8.42)).toBe('8,4')
  })
})

describe('formatDelta', () => {
  it('işaretsiz mutlak yüzde döndürür', () => {
    expect(formatDelta(0.124)).toBe('%12,4')
    expect(formatDelta(-0.03)).toBe('%3')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/format/number.test.ts`
Expected: FAIL — `./number` modülü yok.

- [ ] **Step 3: `src/lib/format/number.ts` yaz**

```ts
const LOCALE = 'tr-TR'

const count = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const rate = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 2 })
const delta = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 })
const rank = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

export function formatCount(value: number): string {
  return count.format(value)
}

export function formatCompactCount(value: number): string {
  if (Math.abs(value) < 1000) return count.format(value)
  return compact.format(value)
}

export function formatRate(ratio: number): string {
  return rate.format(ratio)
}

export function formatRank(value: number): string {
  return rank.format(value)
}

export function formatDelta(ratio: number): string {
  return delta.format(Math.abs(ratio))
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/lib/format/number.test.ts`
Expected: PASS. `formatCompactCount(4280320)` beklentisi `Intl`'in `tr-TR` çıktısıyla uyuşmuyorsa testi gerçek çıktıya göre düzelt — biçim `Intl`'in kararıdır, elle string kurma.

- [ ] **Step 5: Zaman testlerini yaz**

`src/lib/format/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatLastUpdate } from './time'

const now = new Date('2026-08-19T15:00:00+03:00')

describe('formatLastUpdate', () => {
  it('bugünü "Bugün" olarak gösterir', () => {
    expect(formatLastUpdate(new Date('2026-08-19T13:42:00+03:00'), now)).toBe('Bugün 13:42')
  })
  it('dünü "Dün" olarak gösterir', () => {
    expect(formatLastUpdate(new Date('2026-08-18T09:05:00+03:00'), now)).toBe('Dün 09:05')
  })
  it('daha eskisi için tam tarih gösterir', () => {
    expect(formatLastUpdate(new Date('2026-08-14T13:42:00+03:00'), now)).toBe('14 Ağustos 13:42')
  })
})
```

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/format/time.test.ts`
Expected: FAIL — `./time` modülü yok.

- [ ] **Step 7: `src/lib/format/time.ts` yaz**

```ts
const TIME_ZONE = 'Europe/Istanbul'
const clock = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE })
const dayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: TIME_ZONE })
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })

function daysBetween(a: Date, b: Date): number {
  const toUtcDay = (d: Date) => Date.parse(`${dayKey.format(d)}T00:00:00Z`)
  return Math.round((toUtcDay(b) - toUtcDay(a)) / 86_400_000)
}

export function formatLastUpdate(at: Date, now: Date): string {
  const diff = daysBetween(at, now)
  if (diff === 0) return `Bugün ${clock.format(at)}`
  if (diff === 1) return `Dün ${clock.format(at)}`
  return `${dayMonth.format(at)} ${clock.format(at)}`
}
```

- [ ] **Step 8: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/lib/format`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: tr-TR sayı ve zaman biçimleyicileri"
```

---

## Faz 1 — Veri modeli

### Task 5: Çekirdek şema (kullanıcı, bağlantı, site, durum)

**Files:**
- Create: `src/server/db/schema/index.ts`, `src/server/db/schema/core.ts`
- Create: `drizzle/0000_core.sql` (drizzle-kit üretir)
- Test: `src/server/db/schema/core.test.ts`

**Interfaces:**
- Consumes: Task 2'nin `db` örneği.
- Produces:
  - `users`, `googleConnections`, `sites`, `siteSyncState` tabloları
  - `SiteStatus = 'fresh' | 'syncing' | 'needs_reconnect' | 'failed'`
  - `PreparationStage = 'connecting' | 'discovering' | 'fetching_history' | 'ready'`

- [ ] **Step 1: Şema testini yaz (başarısız olacak)**

`src/server/db/schema/core.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { googleConnections, siteSyncState, sites, users } from './core'

describe('çekirdek şema', () => {
  it('aynı kullanıcı aynı web sitesini iki kez ekleyemez', () => {
    const { uniqueConstraints } = getTableConfig(sites)
    const columns = uniqueConstraints.flatMap((c) => c.columns.map((col) => col.name))
    expect(columns).toEqual(expect.arrayContaining(['user_id', 'gsc_property']))
  })

  it('jetonlar şifreli sütunlarda saklanır', () => {
    const names = getTableConfig(googleConnections).columns.map((c) => c.name)
    expect(names).toContain('refresh_token_encrypted')
    expect(names).not.toContain('refresh_token')
  })

  it('senkron durumu her site için tekildir', () => {
    const names = getTableConfig(siteSyncState).columns.map((c) => c.name)
    expect(names).toContain('last_synced_date')
    expect(names).toContain('stage')
  })

  it('kullanıcı e-postası tekildir', () => {
    const email = getTableConfig(users).columns.find((c) => c.name === 'email')
    expect(email?.isUnique).toBe(true)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/db/schema/core.test.ts`
Expected: FAIL — `./core` modülü yok.

- [ ] **Step 3: `src/server/db/schema/core.ts` yaz**

```ts
import { relations } from 'drizzle-orm'
import { date, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

export const siteStatus = pgEnum('site_status', ['fresh', 'syncing', 'needs_reconnect', 'failed'])
export const preparationStage = pgEnum('preparation_stage', [
  'connecting',
  'discovering',
  'fetching_history',
  'ready',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const googleConnections = pgTable(
  'google_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    googleSub: text('google_sub').notNull(),
    googleEmail: text('google_email').notNull(),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('google_connections_user_sub_key').on(t.userId, t.googleSub)],
)

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => googleConnections.id, { onDelete: 'cascade' }),
    gscProperty: text('gsc_property').notNull(),
    displayName: text('display_name').notNull(),
    permissionLevel: text('permission_level').notNull(),
    status: siteStatus('status').notNull().default('syncing'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('sites_user_property_key').on(t.userId, t.gscProperty), index('sites_user_idx').on(t.userId)],
)

export const siteSyncState = pgTable('site_sync_state', {
  siteId: uuid('site_id')
    .primaryKey()
    .references(() => sites.id, { onDelete: 'cascade' }),
  stage: preparationStage('stage').notNull().default('connecting'),
  lastSyncedDate: date('last_synced_date'),
  historyStartDate: date('history_start_date'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  lastErrorCode: text('last_error_code'),
})

export const sitesRelations = relations(sites, ({ one }) => ({
  connection: one(googleConnections, { fields: [sites.connectionId], references: [googleConnections.id] }),
  syncState: one(siteSyncState, { fields: [sites.id], references: [siteSyncState.siteId] }),
}))
```

`src/server/db/schema/index.ts`:

```ts
export * from './core'
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/db/schema/core.test.ts`
Expected: PASS

- [ ] **Step 5: Göç üret ve uygula**

```bash
pnpm db:generate
```

Ardından:

```bash
pnpm db:migrate
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: kullanıcı, bağlantı ve site şeması"
```

---

### Task 6: Ölçüm tabloları ve aylık bölümleme

**Files:**
- Create: `src/server/db/schema/metrics.ts`, `src/server/db/partitions.ts`, `scripts/ensure-partitions.ts`
- Modify: `src/server/db/schema/index.ts`
- Modify: `drizzle/0001_*.sql` (üretildikten sonra elle bölümleme eklenir)
- Test: `src/server/db/partitions.test.ts`

**Interfaces:**
- Consumes: Task 5'in `sites` tablosu.
- Produces:
  - `dailyTotals`, `queryDaily`, `pageDaily`, `countryDaily`, `deviceDaily` tabloları
  - `partitionRangeFor(day: Date): { suffix: string; from: string; to: string }`
  - `partitionsToCreate(from: Date, months: number): PartitionRange[]`
  - `ensurePartitions(db: Db, from: Date, months: number): Promise<string[]>`

**Neden bölümleme:** Spec §10 — 1.000 site × 1.000 kelime × 480 gün ≈ 480M satır. Aylık bölüm hem sorguyu tek aya daraltır hem de 16 aydan eski veriyi `DROP TABLE` ile saniyeler içinde siler. Bunu sonradan eklemek verinin tamamını taşımayı gerektirir; bu yüzden ilk günden yapılır.

- [ ] **Step 1: Bölümleme testini yaz (başarısız olacak)**

`src/server/db/partitions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { partitionRangeFor, partitionsToCreate } from './partitions'

describe('partitionRangeFor', () => {
  it('ayın ilkinden sonraki ayın ilkine kadar aralık üretir', () => {
    expect(partitionRangeFor(new Date('2026-08-19T00:00:00Z'))).toEqual({
      suffix: '2026_08',
      from: '2026-08-01',
      to: '2026-09-01',
    })
  })

  it('yıl sınırını doğru geçer', () => {
    expect(partitionRangeFor(new Date('2026-12-05T00:00:00Z'))).toEqual({
      suffix: '2026_12',
      from: '2026-12-01',
      to: '2027-01-01',
    })
  })
})

describe('partitionsToCreate', () => {
  it('içinde bulunulan ay dahil ileriye dönük N ay üretir', () => {
    const result = partitionsToCreate(new Date('2026-11-19T00:00:00Z'), 3)
    expect(result.map((r) => r.suffix)).toEqual(['2026_11', '2026_12', '2027_01'])
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/db/partitions.test.ts`
Expected: FAIL — `./partitions` modülü yok.

- [ ] **Step 3: `src/server/db/partitions.ts` yaz**

```ts
import { sql } from 'drizzle-orm'
import type { Db } from './index'

export const PARTITIONED_TABLES = ['query_daily', 'page_daily'] as const

export type PartitionRange = { suffix: string; from: string; to: string }

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function partitionRangeFor(day: Date): PartitionRange {
  const year = day.getUTCFullYear()
  const month = day.getUTCMonth()
  return {
    suffix: `${year}_${String(month + 1).padStart(2, '0')}`,
    from: iso(new Date(Date.UTC(year, month, 1))),
    to: iso(new Date(Date.UTC(year, month + 1, 1))),
  }
}

export function partitionsToCreate(from: Date, months: number): PartitionRange[] {
  return Array.from({ length: months }, (_, i) =>
    partitionRangeFor(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1))),
  )
}

export async function ensurePartitions(db: Db, from: Date, months: number): Promise<string[]> {
  const created: string[] = []
  for (const range of partitionsToCreate(from, months)) {
    for (const table of PARTITIONED_TABLES) {
      const name = `${table}_${range.suffix}`
      await db.execute(
        sql.raw(
          `CREATE TABLE IF NOT EXISTS ${name} PARTITION OF ${table} ` +
            `FOR VALUES FROM ('${range.from}') TO ('${range.to}')`,
        ),
      )
      created.push(name)
    }
  }
  return created
}
```

`sql.raw` yalnızca burada kullanılır; içine giren her değer tarih hesabından üretilir, dışarıdan gelen hiçbir girdi bu dizeye yaklaşmaz.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/db/partitions.test.ts`
Expected: PASS

- [ ] **Step 5: `src/server/db/schema/metrics.ts` yaz**

```ts
import { sql } from 'drizzle-orm'
import { bigint, date, index, numeric, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { sites } from './core'

const metricColumns = {
  clicks: bigint('clicks', { mode: 'number' }).notNull(),
  impressions: bigint('impressions', { mode: 'number' }).notNull(),
  position: numeric('position', { precision: 6, scale: 2, mode: 'number' }).notNull(),
}

export const dailyTotals = pgTable(
  'daily_totals',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    ...metricColumns,
  },
  (t) => [primaryKey({ columns: [t.siteId, t.date] })],
)

export const queryDaily = pgTable(
  'query_daily',
  {
    siteId: uuid('site_id').notNull(),
    date: date('date').notNull(),
    query: text('query').notNull(),
    queryKey: uuid('query_key').generatedAlwaysAs(sql`md5(query)::uuid`),
    ...metricColumns,
  },
  (t) => [
    primaryKey({ columns: [t.siteId, t.date, t.queryKey] }),
    index('query_daily_site_date_clicks_idx').on(t.siteId, t.date, t.clicks),
  ],
)

export const pageDaily = pgTable(
  'page_daily',
  {
    siteId: uuid('site_id').notNull(),
    date: date('date').notNull(),
    page: text('page').notNull(),
    pageKey: uuid('page_key').generatedAlwaysAs(sql`md5(page)::uuid`),
    pageTitle: text('page_title'),
    ...metricColumns,
  },
  (t) => [
    primaryKey({ columns: [t.siteId, t.date, t.pageKey] }),
    index('page_daily_site_date_clicks_idx').on(t.siteId, t.date, t.clicks),
  ],
)

export const countryDaily = pgTable(
  'country_daily',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    country: text('country').notNull(),
    ...metricColumns,
  },
  (t) => [primaryKey({ columns: [t.siteId, t.date, t.country] })],
)

export const deviceDaily = pgTable(
  'device_daily',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    device: text('device').notNull(),
    ...metricColumns,
  },
  (t) => [primaryKey({ columns: [t.siteId, t.date, t.device] })],
)
```

`query_daily` ve `page_daily` üzerinde yabancı anahtar yoktur: bölümlenmiş tabloda FK doğrulaması her satır yazımını yavaşlatır. Site silindiğinde bu satırları Task 14'teki bakım işi temizler.

`src/server/db/schema/index.ts` içine `export * from './metrics'` satırını ekle.

- [ ] **Step 6: Göç üret ve bölümlemeyi elle ekle**

```bash
pnpm db:generate
```

Üretilen `drizzle/0001_*.sql` dosyasında `query_daily` ve `page_daily` için `CREATE TABLE` ifadesinin kapanışına `PARTITION BY RANGE ("date")` ekle:

```sql
-- ELLE DÜZENLENDİ: drizzle-kit bölümleme üretmez, aşağıdaki iki tablonun
-- PARTITION BY satırı elle eklenmiştir. Bu dosya yeniden üretilirse tekrar ekle.
CREATE TABLE "query_daily" (
  "site_id" uuid NOT NULL,
  "date" date NOT NULL,
  "query" text NOT NULL,
  "query_key" uuid GENERATED ALWAYS AS (md5(query)::uuid) STORED,
  "clicks" bigint NOT NULL,
  "impressions" bigint NOT NULL,
  "position" numeric(6,2) NOT NULL,
  CONSTRAINT "query_daily_site_id_date_query_key_pk" PRIMARY KEY("site_id","date","query_key")
) PARTITION BY RANGE ("date");
```

Birincil anahtarın bölümleme sütunu olan `date` sütununu içermesi zorunludur; Postgres bölümlenmiş tabloda ancak bu durumda `ON CONFLICT` destekler. Task 12'nin idempotent yazımı buna dayanır.

- [ ] **Step 7: Bölüm oluşturma betiğini yaz ve çalıştır**

`scripts/ensure-partitions.ts`:

```ts
import { db } from '@/server/db'
import { ensurePartitions } from '@/server/db/partitions'

const start = new Date()
start.setUTCMonth(start.getUTCMonth() - 18)

const created = await ensurePartitions(db, start, 24)
console.log(`${created.length} bölüm hazır`)
process.exit(0)
```

```bash
pnpm db:migrate
```

```bash
pnpm exec tsx scripts/ensure-partitions.ts
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: bölümlenmiş ölçüm tabloları"
```

---

### Task 7: Metrik matematiği ve dönem hesabı

**Files:**
- Create: `src/lib/metrics/aggregate.ts`, `src/lib/metrics/trend.ts`, `src/lib/date/period.ts`
- Test: `src/lib/metrics/aggregate.test.ts`, `src/lib/metrics/trend.test.ts`, `src/lib/date/period.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type MetricRow = { clicks: number; impressions: number; position: number }`
  - `type Totals = { clicks: number; impressions: number; clickRate: number | null; rank: number | null }`
  - `aggregate(rows: readonly MetricRow[]): Totals`
  - `type Trend = { current: number | null; previous: number | null; absoluteChange: number | null; relativeChange: number | null; sentiment: 'good' | 'bad' | 'neutral' }`
  - `compareMetric(current: number | null, previous: number | null, opts: { lowerIsBetter?: boolean }): Trend`
  - `type Period = { from: string; to: string }`, `type RangeKey = '7d' | '28d' | '3m'`
  - `DATA_LAG_DAYS: number`, `resolvePeriod(key: RangeKey, today: Date): Period`, `periodLengthInDays(p: Period): number`, `previousPeriod(p: Period): Period`

**Neden ayrı modül:** ortalama sıra ve tıklama oranı yanlış toplanmaya en müsait iki değerdir. Kural tek bir yerde yaşar: **sıra gösterim sayısıyla ağırlıklandırılır, oran her zaman toplamlardan yeniden hesaplanır.**

- [ ] **Step 1: Toplama testini yaz (başarısız olacak)**

`src/lib/metrics/aggregate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aggregate } from './aggregate'

describe('aggregate', () => {
  it('tıklama ve gösterimleri toplar', () => {
    const result = aggregate([
      { clicks: 10, impressions: 100, position: 5 },
      { clicks: 30, impressions: 300, position: 9 },
    ])
    expect(result.clicks).toBe(40)
    expect(result.impressions).toBe(400)
  })

  it('oranı ortalamaların ortalaması olarak değil toplamlardan hesaplar', () => {
    const result = aggregate([
      { clicks: 1, impressions: 1, position: 1 },
      { clicks: 0, impressions: 99, position: 1 },
    ])
    expect(result.clickRate).toBeCloseTo(0.01, 6)
  })

  it('sırayı gösterim sayısıyla ağırlıklandırır', () => {
    const result = aggregate([
      { clicks: 0, impressions: 100, position: 2 },
      { clicks: 0, impressions: 900, position: 12 },
    ])
    expect(result.rank).toBeCloseTo(11, 6)
  })

  it('gösterim yoksa oran ve sıra null olur', () => {
    expect(aggregate([])).toEqual({ clicks: 0, impressions: 0, clickRate: null, rank: null })
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/metrics/aggregate.test.ts`
Expected: FAIL — `./aggregate` modülü yok.

- [ ] **Step 3: `src/lib/metrics/aggregate.ts` yaz**

```ts
export type MetricRow = { clicks: number; impressions: number; position: number }

export type Totals = {
  clicks: number
  impressions: number
  clickRate: number | null
  rank: number | null
}

export function aggregate(rows: readonly MetricRow[]): Totals {
  let clicks = 0
  let impressions = 0
  let weightedPosition = 0

  for (const row of rows) {
    clicks += row.clicks
    impressions += row.impressions
    weightedPosition += row.position * row.impressions
  }

  return {
    clicks,
    impressions,
    clickRate: impressions === 0 ? null : clicks / impressions,
    rank: impressions === 0 ? null : weightedPosition / impressions,
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/lib/metrics/aggregate.test.ts`
Expected: PASS

- [ ] **Step 5: Karşılaştırma testini yaz**

`src/lib/metrics/trend.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { compareMetric } from './trend'

describe('compareMetric', () => {
  it('artışı olumlu sayar', () => {
    const t = compareMetric(112, 100, {})
    expect(t.absoluteChange).toBe(12)
    expect(t.relativeChange).toBeCloseTo(0.12, 6)
    expect(t.sentiment).toBe('good')
  })

  it('sıra metriğinde küçülmeyi olumlu sayar', () => {
    const t = compareMetric(7.2, 8.4, { lowerIsBetter: true })
    expect(t.absoluteChange).toBeCloseTo(-1.2, 6)
    expect(t.sentiment).toBe('good')
  })

  it('sıra metriğinde büyümeyi olumsuz sayar', () => {
    expect(compareMetric(11.8, 6.2, { lowerIsBetter: true }).sentiment).toBe('bad')
  })

  it('önceki dönem yoksa oransal değişim üretmez', () => {
    const t = compareMetric(50, null, {})
    expect(t.relativeChange).toBeNull()
    expect(t.sentiment).toBe('neutral')
  })

  it('önceki dönem sıfırsa oransal değişim üretmez', () => {
    expect(compareMetric(50, 0, {}).relativeChange).toBeNull()
  })

  it('değişim yoksa nötr olur', () => {
    expect(compareMetric(100, 100, {}).sentiment).toBe('neutral')
  })
})
```

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/metrics/trend.test.ts`
Expected: FAIL — `./trend` modülü yok.

- [ ] **Step 7: `src/lib/metrics/trend.ts` yaz**

```ts
export type Sentiment = 'good' | 'bad' | 'neutral'

export type Trend = {
  current: number | null
  previous: number | null
  absoluteChange: number | null
  relativeChange: number | null
  sentiment: Sentiment
}

export function compareMetric(
  current: number | null,
  previous: number | null,
  { lowerIsBetter = false }: { lowerIsBetter?: boolean },
): Trend {
  if (current === null || previous === null) {
    return { current, previous, absoluteChange: null, relativeChange: null, sentiment: 'neutral' }
  }

  const absoluteChange = current - previous
  const relativeChange = previous === 0 ? null : absoluteChange / previous
  const improved = lowerIsBetter ? absoluteChange < 0 : absoluteChange > 0

  return {
    current,
    previous,
    absoluteChange,
    relativeChange,
    sentiment: absoluteChange === 0 ? 'neutral' : improved ? 'good' : 'bad',
  }
}
```

- [ ] **Step 8: Dönem testini yaz**

`src/lib/date/period.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { previousPeriod, resolvePeriod } from './period'

const today = new Date('2026-08-19T10:00:00Z')

describe('resolvePeriod', () => {
  it('son 28 günü veri gecikmesini düşerek hesaplar', () => {
    expect(resolvePeriod('28d', today)).toEqual({ from: '2026-07-20', to: '2026-08-16' })
  })

  it('son 7 günü hesaplar', () => {
    expect(resolvePeriod('7d', today)).toEqual({ from: '2026-08-10', to: '2026-08-16' })
  })
})

describe('previousPeriod', () => {
  it('aynı uzunlukta hemen önceki dönemi verir', () => {
    expect(previousPeriod({ from: '2026-07-20', to: '2026-08-16' })).toEqual({
      from: '2026-06-22',
      to: '2026-07-19',
    })
  })
})
```

- [ ] **Step 9: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/date/period.test.ts`
Expected: FAIL — `./period` modülü yok.

- [ ] **Step 10: `src/lib/date/period.ts` yaz**

```ts
export type Period = { from: string; to: string }
export type RangeKey = '7d' | '28d' | '3m'

/** Google performans verisi ~3 gün gecikmeyle kesinleşir; son 3 günü hiç göstermeyiz. */
export const DATA_LAG_DAYS = 3

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const startOfUtcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

const LENGTHS: Record<RangeKey, number> = { '7d': 7, '28d': 28, '3m': 90 }

export function resolvePeriod(key: RangeKey, today: Date): Period {
  const end = startOfUtcDay(today) - DATA_LAG_DAYS * DAY
  return { from: iso(end - (LENGTHS[key] - 1) * DAY), to: iso(end) }
}

export function periodLengthInDays({ from, to }: Period): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1
}

export function previousPeriod(period: Period): Period {
  const length = periodLengthInDays(period)
  const end = Date.parse(period.from) - DAY
  return { from: iso(end - (length - 1) * DAY), to: iso(end) }
}
```

- [ ] **Step 11: Tüm birim testlerini çalıştır**

Run: `pnpm test src/lib`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: metrik toplama, karsilastirma ve donem hesabi"
```

---

## Faz 2 — Google bağlantısı

### Task 8: Kimlik doğrulama ve şifreli jeton saklama

**Files:**
- Create: `src/server/auth/crypto.ts`, `src/server/auth/config.ts`, `src/server/auth/index.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/server/repositories/connections.repo.ts`
- Test: `src/server/auth/crypto.test.ts`

**Interfaces:**
- Consumes: Task 2'nin `env`, Task 5'in `users` + `googleConnections`.
- Produces:
  - `encryptSecret(plain: string): string` / `decryptSecret(payload: string): string`
  - `auth(): Promise<Session | null>` — Auth.js v5 yardımcısı
  - `requireSession(): Promise<{ userId: string; connectionId: string }>` — oturum yoksa `/baglan`'a yönlendirir. Tüm korumalı sayfalar bunu çağırır.
  - `connectionsRepo.upsertFromGoogle(input): Promise<{ id: string }>`
  - `connectionsRepo.findById(id): Promise<ConnectionRow | null>`
  - `connectionsRepo.findActiveForUser(userId): Promise<ConnectionRow | null>` — `revokedAt IS NULL` olan en güncel bağlantı
  - `connectionsRepo.saveRefreshedAccessToken(id, token, expiresAt): Promise<void>`
  - `connectionsRepo.markRevoked(id): Promise<void>`

- [ ] **Step 1: Şifreleme testini yaz (başarısız olacak)**

`src/server/auth/crypto.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from './crypto'

describe('gizli değer şifreleme', () => {
  it('şifreleyip geri çözer', () => {
    const secret = 'refresh-token-degeri'
    expect(decryptSecret(encryptSecret(secret))).toBe(secret)
  })

  it('aynı girdi için her seferinde farklı çıktı üretir', () => {
    expect(encryptSecret('ayni')).not.toBe(encryptSecret('ayni'))
  })

  it('şifreli metin ham değeri içermez', () => {
    expect(encryptSecret('gizli')).not.toContain('gizli')
  })

  it('kurcalanmış veriyi reddeder', () => {
    const payload = encryptSecret('gizli')
    const tampered = `${payload.slice(0, -2)}00`
    expect(() => decryptSecret(tampered)).toThrow()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/auth/crypto.test.ts`
Expected: FAIL — `./crypto` modülü yok.

- [ ] **Step 3: `src/server/auth/crypto.ts` yaz**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '@/server/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const key = Buffer.from(env.APP_ENCRYPTION_KEY, 'base64')

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, IV_LENGTH)
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(raw.subarray(IV_LENGTH + 16)), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/auth/crypto.test.ts`
Expected: PASS. Test ortamı için `.env.test` içine geçerli bir `APP_ENCRYPTION_KEY` koy: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

- [ ] **Step 5: Bağlantı repository'sini yaz**

`src/server/repositories/connections.repo.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { googleConnections } from '@/server/db/schema'

export type ConnectionRow = typeof googleConnections.$inferSelect

export const connectionsRepo = {
  async upsertFromGoogle(input: {
    userId: string
    googleSub: string
    googleEmail: string
    accessTokenEncrypted: string
    refreshTokenEncrypted: string
    accessTokenExpiresAt: Date
  }): Promise<{ id: string }> {
    const [row] = await db
      .insert(googleConnections)
      .values(input)
      .onConflictDoUpdate({
        target: [googleConnections.userId, googleConnections.googleSub],
        set: {
          googleEmail: input.googleEmail,
          accessTokenEncrypted: input.accessTokenEncrypted,
          refreshTokenEncrypted: input.refreshTokenEncrypted,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          revokedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: googleConnections.id })
    return row!
  },

  async findById(id: string): Promise<ConnectionRow | null> {
    const [row] = await db.select().from(googleConnections).where(eq(googleConnections.id, id)).limit(1)
    return row ?? null
  },

  async saveRefreshedAccessToken(id: string, accessTokenEncrypted: string, expiresAt: Date): Promise<void> {
    await db
      .update(googleConnections)
      .set({ accessTokenEncrypted, accessTokenExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(googleConnections.id, id))
  },

  async markRevoked(id: string): Promise<void> {
    await db
      .update(googleConnections)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(googleConnections.id, id))
  },
}
```

- [ ] **Step 6: Auth.js yapılandırmasını yaz**

```bash
pnpm add next-auth@beta
```

`src/server/auth/config.ts`:

```ts
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'
import { env } from '@/server/env'

export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export const authConfig = {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: `openid email profile ${SEARCH_CONSOLE_SCOPE}`,
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/baglan' },
} satisfies NextAuthConfig
```

`access_type: 'offline'` ve `prompt: 'consent'` birlikte olmadan Google yenileme jetonunu yalnızca ilk onayda gönderir; kullanıcı ikinci kez bağlandığında jeton gelmez ve arka plan toplama sessizce durur.

`src/server/auth/index.ts`: `signIn` geri çağrısında kullanıcıyı `users` tablosuna yaz, jetonları `encryptSecret` ile şifreleyip `connectionsRepo.upsertFromGoogle` ile kaydet, dönen `connectionId`'yi JWT'ye koy.

- [ ] **Step 7: Route handler'ı bağla**

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
export { GET, POST } from '@/server/auth'
```

- [ ] **Step 8: Lint, tip ve testleri çalıştır**

Run: `pnpm typecheck; if ($?) { pnpm lint; if ($?) { pnpm test } }`
Expected: hepsi yeşil.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: google baglantisi ve sifreli jeton saklama"
```

---

### Task 9: Google Search Console adaptörü

**Files:**
- Create: `src/server/gsc/client.ts`, `src/server/gsc/types.ts`, `src/server/gsc/errors.ts`, `src/server/gsc/access-token.ts`
- Test: `src/server/gsc/client.test.ts`, `src/server/gsc/errors.test.ts`

**Interfaces:**
- Consumes: Task 8'in `connectionsRepo`, `decryptSecret`, `encryptSecret`.
- Produces:
  - `type GscSite = { property: string; permissionLevel: string }`
  - `type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }`
  - `type GscDimension = 'date' | 'query' | 'page' | 'country' | 'device'`
  - `createGscClient(connectionId: string): Promise<GscClient>`
  - `GscClient.listSites(): Promise<GscSite[]>`
  - `GscClient.queryPerformance(input: { property: string; from: string; to: string; dimensions: GscDimension[]; rowLimit?: number }): Promise<GscRow[]>` — sayfalama içeride yapılır, tüm satırlar döner
  - `class GscError extends Error { code: GscErrorCode }`
  - `type GscErrorCode = 'needs_reconnect' | 'rate_limited' | 'not_found' | 'unavailable'`
  - `classifyGoogleError(status: number, body: unknown): GscErrorCode`

**Neden adaptör:** Google API'si sistemdeki tek dış bağımlılıktır. Tüm HTTP detayı, sayfalama ve hata sınıflandırması bu klasörde kalır; dışarıya yalnızca sade tipler ve dört hata kodu sızar. Böylece hem test edilebilir hem de üst katmanlar HTTP bilmez.

- [ ] **Step 1: Hata sınıflandırma testini yaz (başarısız olacak)**

`src/server/gsc/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { classifyGoogleError } from './errors'

describe('classifyGoogleError', () => {
  it('401 için yeniden bağlanma ister', () => {
    expect(classifyGoogleError(401, {})).toBe('needs_reconnect')
  })

  it('iptal edilmiş izin için yeniden bağlanma ister', () => {
    expect(classifyGoogleError(403, { error: { status: 'PERMISSION_DENIED' } })).toBe('needs_reconnect')
  })

  it('kullanım sınırı aşımını hız sınırı sayar', () => {
    expect(classifyGoogleError(403, { error: { errors: [{ reason: 'rateLimitExceeded' }] } })).toBe('rate_limited')
    expect(classifyGoogleError(429, {})).toBe('rate_limited')
  })

  it('404 için bulunamadı döner', () => {
    expect(classifyGoogleError(404, {})).toBe('not_found')
  })

  it('sunucu hatalarını geçici sayar', () => {
    expect(classifyGoogleError(503, {})).toBe('unavailable')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/gsc/errors.test.ts`
Expected: FAIL — `./errors` modülü yok.

- [ ] **Step 3: `src/server/gsc/errors.ts` yaz**

```ts
export type GscErrorCode = 'needs_reconnect' | 'rate_limited' | 'not_found' | 'unavailable'

export class GscError extends Error {
  constructor(
    readonly code: GscErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'GscError'
  }
}

/** Yeniden denemenin anlamlı olduğu durumlar. */
export const RETRYABLE: readonly GscErrorCode[] = ['rate_limited', 'unavailable']

function reasonsOf(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) return []
  const error = (body as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return []
  const { status, errors } = error as { status?: unknown; errors?: unknown }
  const list = Array.isArray(errors)
    ? errors.map((e) => (typeof e === 'object' && e !== null ? String((e as { reason?: unknown }).reason) : ''))
    : []
  return [typeof status === 'string' ? status : '', ...list].filter(Boolean)
}

export function classifyGoogleError(status: number, body: unknown): GscErrorCode {
  const reasons = reasonsOf(body)
  if (reasons.some((r) => r === 'rateLimitExceeded' || r === 'userRateLimitExceeded' || r === 'quotaExceeded')) {
    return 'rate_limited'
  }
  if (status === 429) return 'rate_limited'
  if (status === 401) return 'needs_reconnect'
  if (status === 403) return 'needs_reconnect'
  if (status === 404) return 'not_found'
  return 'unavailable'
}
```

`403` iki farklı anlam taşır: kullanım sınırı aşımı (geçici) ve izin iptali (kalıcı). Sıra önemlidir — önce gerekçe listesine bakılır, yoksa izin sorunu varsayılır.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/gsc/errors.test.ts`
Expected: PASS

- [ ] **Step 5: İstemci testini yaz**

`src/server/gsc/client.test.ts` — `fetch`'i `vi.fn()` ile değiştirerek:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GscError } from './errors'
import { createGscClientWithToken } from './client'

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const fail = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.restoreAllMocks())

describe('listSites', () => {
  it('yalnızca veri okunabilen siteleri döndürür', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        ok({
          siteEntry: [
            { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
            { siteUrl: 'https://gizli.com/', permissionLevel: 'siteUnverifiedUser' },
          ],
        }),
      ),
    )
    const client = createGscClientWithToken('token')
    await expect(client.listSites()).resolves.toEqual([
      { property: 'https://example.com/', permissionLevel: 'siteOwner' },
    ])
  })
})

describe('queryPerformance', () => {
  it('tüm sayfaları çeker ve birleştirir', async () => {
    const page = (n: number) =>
      ok({ rows: Array.from({ length: n }, (_, i) => ({ keys: [`k${i}`], clicks: 1, impressions: 2, ctr: 0.5, position: 3 })) })
    const fetchMock = vi.fn().mockResolvedValueOnce(page(25000)).mockResolvedValueOnce(page(10))
    vi.stubGlobal('fetch', fetchMock)

    const rows = await createGscClientWithToken('token').queryPerformance({
      property: 'https://example.com/',
      from: '2026-08-01',
      to: '2026-08-02',
      dimensions: ['date', 'query'],
    })

    expect(rows).toHaveLength(25010)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('satır dönmezse boş dizi verir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({})))
    const rows = await createGscClientWithToken('token').queryPerformance({
      property: 'https://example.com/',
      from: '2026-08-01',
      to: '2026-08-02',
      dimensions: ['date'],
    })
    expect(rows).toEqual([])
  })

  it('yetki hatasını GscError olarak yükseltir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(401)))
    await expect(
      createGscClientWithToken('token').queryPerformance({
        property: 'https://example.com/',
        from: '2026-08-01',
        to: '2026-08-02',
        dimensions: ['date'],
      }),
    ).rejects.toThrow(GscError)
  })
})
```

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/gsc/client.test.ts`
Expected: FAIL — `./client` modülü yok.

- [ ] **Step 7: `src/server/gsc/types.ts` ve `src/server/gsc/client.ts` yaz**

`types.ts`:

```ts
export type GscSite = { property: string; permissionLevel: string }
export type GscDimension = 'date' | 'query' | 'page' | 'country' | 'device'
export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
```

`client.ts`:

```ts
import { GscError, classifyGoogleError } from './errors'
import type { GscDimension, GscRow, GscSite } from './types'

const BASE = 'https://www.googleapis.com/webmasters/v3'
const PAGE_SIZE = 25_000
const READABLE_PERMISSIONS = new Set(['siteOwner', 'siteFullUser', 'siteRestrictedUser'])

export type GscClient = {
  listSites(): Promise<GscSite[]>
  queryPerformance(input: {
    property: string
    from: string
    to: string
    dimensions: GscDimension[]
    rowLimit?: number
  }): Promise<GscRow[]>
}

async function call(accessToken: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new GscError(classifyGoogleError(response.status, payload), `Google isteği başarısız (${response.status})`)
  }
  return payload
}

export function createGscClientWithToken(accessToken: string): GscClient {
  return {
    async listSites() {
      const payload = (await call(accessToken, '/sites')) as { siteEntry?: unknown }
      const entries = Array.isArray(payload.siteEntry) ? payload.siteEntry : []
      return entries
        .map((entry) => entry as { siteUrl?: string; permissionLevel?: string })
        .filter((e) => e.siteUrl && e.permissionLevel && READABLE_PERMISSIONS.has(e.permissionLevel))
        .map((e) => ({ property: e.siteUrl!, permissionLevel: e.permissionLevel! }))
    },

    async queryPerformance({ property, from, to, dimensions, rowLimit = PAGE_SIZE }) {
      const collected: GscRow[] = []
      let startRow = 0

      for (;;) {
        const payload = (await call(
          accessToken,
          `/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
          { startDate: from, endDate: to, dimensions, rowLimit, startRow, dataState: 'final', type: 'web' },
        )) as { rows?: GscRow[] }

        const rows = payload.rows ?? []
        collected.push(...rows)
        if (rows.length < rowLimit) return collected
        startRow += rows.length
      }
    },
  }
}
```

- [ ] **Step 8: Erişim jetonu tazeleyiciyi yaz**

`src/server/gsc/access-token.ts` — `connectionId` alır, kayıtlı jetonun süresi 60 saniyeden az kaldıysa Google'ın `oauth2/v4/token` uç noktasından yeniler, şifreleyip kaydeder ve düz jetonu döndürür. `invalid_grant` yanıtında `connectionsRepo.markRevoked` çağırır ve `new GscError('needs_reconnect', …)` fırlatır.

`createGscClient(connectionId)` bu fonksiyonu çağırıp `createGscClientWithToken` ile istemciyi kurar.

- [ ] **Step 9: Testleri çalıştır**

Run: `pnpm test src/server/gsc`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: google search console adaptoru"
```

---

### Task 10: Durum eşlemesi ve kullanıcı mesajları

**Files:**
- Create: `src/server/services/site-status.ts`
- Modify: `src/lib/copy/tr.ts`
- Test: `src/server/services/site-status.test.ts`

**Interfaces:**
- Consumes: Task 9'un `GscErrorCode`, Task 5'in `siteSyncState`.
- Produces:
  - `type SiteStatusView = { status: SiteStatus; action: 'reconnect' | 'retry' | null }`
  - `deriveSiteStatus(state: { stage: PreparationStage; lastErrorCode: string | null; consecutiveFailures: number; lastSuccessAt: Date | null }, now: Date): SiteStatusView`
  - `MAX_FAILURES_BEFORE_FAILED = 3`

**Neden servis katmanında:** Spec §7 — kullanıcı yalnızca dört durum görür. Hata kodundan kullanıcı durumuna geçiş tek bir saf fonksiyonda olur; arayüz `lastErrorCode`'u hiç görmez.

- [ ] **Step 1: Durum testini yaz (başarısız olacak)**

`src/server/services/site-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveSiteStatus } from './site-status'

const now = new Date('2026-08-19T12:00:00Z')
const base = { stage: 'ready' as const, lastErrorCode: null, consecutiveFailures: 0, lastSuccessAt: now }

describe('deriveSiteStatus', () => {
  it('hazırlık sürüyorsa veri alınıyor gösterir', () => {
    expect(deriveSiteStatus({ ...base, stage: 'fetching_history' }, now).status).toBe('syncing')
  })

  it('yetki sorununda bağlantı yenilemeye yönlendirir', () => {
    const view = deriveSiteStatus({ ...base, lastErrorCode: 'needs_reconnect', consecutiveFailures: 1 }, now)
    expect(view).toEqual({ status: 'needs_reconnect', action: 'reconnect' })
  })

  it('geçici hatada ilk denemelerde güncel kalır', () => {
    expect(deriveSiteStatus({ ...base, lastErrorCode: 'unavailable', consecutiveFailures: 2 }, now).status).toBe('fresh')
  })

  it('üst üste üç başarısızlıkta veri alınamadı gösterir', () => {
    const view = deriveSiteStatus({ ...base, lastErrorCode: 'unavailable', consecutiveFailures: 3 }, now)
    expect(view).toEqual({ status: 'failed', action: 'retry' })
  })

  it('hiç başarı yoksa ve hazırlık bittiyse veri alınamadı gösterir', () => {
    const view = deriveSiteStatus({ ...base, lastSuccessAt: null, consecutiveFailures: 3 }, now)
    expect(view.status).toBe('failed')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/services/site-status.test.ts`
Expected: FAIL — `./site-status` modülü yok.

- [ ] **Step 3: `src/server/services/site-status.ts` yaz**

```ts
export type SiteStatus = 'fresh' | 'syncing' | 'needs_reconnect' | 'failed'
export type PreparationStage = 'connecting' | 'discovering' | 'fetching_history' | 'ready'

export type SiteStatusView = { status: SiteStatus; action: 'reconnect' | 'retry' | null }

export const MAX_FAILURES_BEFORE_FAILED = 3

export function deriveSiteStatus(
  state: {
    stage: PreparationStage
    lastErrorCode: string | null
    consecutiveFailures: number
    lastSuccessAt: Date | null
  },
  _now: Date,
): SiteStatusView {
  if (state.lastErrorCode === 'needs_reconnect') {
    return { status: 'needs_reconnect', action: 'reconnect' }
  }
  if (state.stage !== 'ready') {
    return { status: 'syncing', action: null }
  }
  if (state.consecutiveFailures >= MAX_FAILURES_BEFORE_FAILED || state.lastSuccessAt === null) {
    return { status: 'failed', action: 'retry' }
  }
  return { status: 'fresh', action: null }
}
```

Geçici hata ilk iki denemede kullanıcıya hiç yansımaz; kuyruk zaten yeniden dener. Kullanıcıyı yalnızca kendisinin çözebileceği bir şey varsa rahatsız ederiz.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/services/site-status.test.ts`
Expected: PASS

- [ ] **Step 5: Durum metinlerini sözlüğe ekle**

`src/lib/copy/tr.ts` içindeki `status` bloğunu genişlet:

```ts
  status: {
    fresh: 'Güncel',
    syncing: 'Veri alınıyor',
    needsReconnect: 'Bağlantı gerekli',
    failed: 'Veri alınamadı',
    reconnectMessage: 'Google bağlantınızı yenilemeniz gerekiyor.',
    reconnectAction: 'Bağlantıyı Yenile',
    failedMessage: 'Bu web sitesinin verilerini şu an alamıyoruz. Birazdan tekrar deneyebilirsiniz.',
    retryAction: 'Tekrar Dene',
  },
```

- [ ] **Step 6: Sözlük denetimini ve testleri çalıştır**

Run: `pnpm test src/lib/copy src/server/services`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: site durumu esleme ve kullanici mesajlari"
```

---

## Faz 3 — Toplama motoru

### Task 11: Kuyruk altyapısı ve işçi süreci

**Files:**
- Create: `src/server/sync/queue.ts`, `src/server/sync/jobs.ts`, `src/worker/index.ts`
- Modify: `package.json`, `docker-compose.yml`
- Test: `src/server/sync/jobs.test.ts`

**Interfaces:**
- Consumes: Task 2'nin `env.REDIS_URL`.
- Produces:
  - `type SiteJob = { kind: 'daily'; siteId: string } | { kind: 'history'; siteId: string; from: string; to: string }`
  - `jobIdFor(job: SiteJob): string` — idempotent iş kimliği
  - `siteQueue: Queue<SiteJob>`
  - `enqueueSiteJob(job: SiteJob): Promise<void>`
  - `pnpm worker` betiği

**Neden kuyruk:** Spec §10 — 1.000 site günde bir toplanır ve her yeni site 16 aylık geçmiş çeker. Bunlar dakikalar süren, hız sınırlı, yeniden denenmesi gereken işlerdir. Web isteği içinde çalıştırılamaz. Kuyruk aynı zamanda Google'ın dakikalık istek sınırına uyulacak tek yerdir.

- [ ] **Step 1: İş kimliği testini yaz (başarısız olacak)**

`src/server/sync/jobs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { jobIdFor } from './jobs'

describe('jobIdFor', () => {
  it('aynı günlük iş için aynı kimliği üretir', () => {
    const a = jobIdFor({ kind: 'daily', siteId: 'site-1' })
    const b = jobIdFor({ kind: 'daily', siteId: 'site-1' })
    expect(a).toBe(b)
  })

  it('farklı siteler için farklı kimlik üretir', () => {
    expect(jobIdFor({ kind: 'daily', siteId: 'a' })).not.toBe(jobIdFor({ kind: 'daily', siteId: 'b' }))
  })

  it('geçmiş veri işini tarih aralığına göre ayırır', () => {
    const first = jobIdFor({ kind: 'history', siteId: 's', from: '2026-01-01', to: '2026-01-31' })
    const second = jobIdFor({ kind: 'history', siteId: 's', from: '2026-02-01', to: '2026-02-28' })
    expect(first).not.toBe(second)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/sync/jobs.test.ts`
Expected: FAIL — `./jobs` modülü yok.

- [ ] **Step 3: `src/server/sync/jobs.ts` yaz**

```ts
export type SiteJob =
  | { kind: 'daily'; siteId: string }
  | { kind: 'history'; siteId: string; from: string; to: string }

export function jobIdFor(job: SiteJob): string {
  return job.kind === 'daily' ? `daily:${job.siteId}` : `history:${job.siteId}:${job.from}:${job.to}`
}
```

Aynı kimlikli iş kuyrukta zaten varsa BullMQ yenisini eklemez. Kullanıcı "Verileri güncelle" düğmesine on kez bassa da tek iş çalışır.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/sync/jobs.test.ts`
Expected: PASS

- [ ] **Step 5: Kuyruğu tanımla**

```bash
pnpm add bullmq ioredis
```

`src/server/sync/queue.ts`:

```ts
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/server/env'
import { jobIdFor, type SiteJob } from './jobs'

export const SITE_QUEUE = 'site-jobs'

/** Google dakikada 1.200 istek kabul eder; 10/sn tavanı bunun güvenli altında kalır. */
export const GOOGLE_REQUESTS_PER_SECOND = 10

export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

export const siteQueue = new Queue<SiteJob>(SITE_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { age: 86_400, count: 5_000 },
    removeOnFail: { age: 604_800 },
  },
})

export async function enqueueSiteJob(job: SiteJob): Promise<void> {
  await siteQueue.add(job.kind, job, { jobId: jobIdFor(job) })
}
```

- [ ] **Step 6: İşçi sürecini yaz**

`src/worker/index.ts`:

```ts
import { Worker } from 'bullmq'
import { GOOGLE_REQUESTS_PER_SECOND, SITE_QUEUE, connection } from '@/server/sync/queue'
import type { SiteJob } from '@/server/sync/jobs'
import { runDailySync } from '@/server/sync/daily-sync'
import { runHistorySync } from '@/server/sync/history-sync'

const worker = new Worker<SiteJob>(
  SITE_QUEUE,
  async (job) => (job.data.kind === 'daily' ? runDailySync(job.data) : runHistorySync(job.data)),
  {
    connection,
    concurrency: 5,
    limiter: { max: GOOGLE_REQUESTS_PER_SECOND, duration: 1_000 },
  },
)

worker.on('failed', (job, error) => {
  console.error(`[worker] ${job?.id ?? 'bilinmeyen'} başarısız: ${error.message}`)
})

const shutdown = async () => {
  await worker.close()
  await connection.quit()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

`runDailySync` ve `runHistorySync` Task 12–13'te yazılır; bu adımda henüz derlenmez. İşçiyi Task 12 tamamlanınca çalıştır.

`package.json`: `"worker": "tsx src/worker/index.ts"`. `pnpm add -D tsx`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: is kuyrugu ve isci sureci iskeleti"
```

---

### Task 12: Günlük toplama işi

**Files:**
- Create: `src/server/sync/daily-sync.ts`, `src/server/sync/write-metrics.ts`, `src/server/repositories/metrics-write.repo.ts`, `src/server/repositories/sites.repo.ts`
- Test: `src/server/sync/write-metrics.test.ts`, `src/server/sync/daily-sync.test.ts`

**Interfaces:**
- Consumes: Task 6'nın ölçüm tabloları, Task 9'un `createGscClient`, Task 10'un `deriveSiteStatus`.
- Produces:
  - `toDailyTotalRows(siteId: string, rows: GscRow[]): DailyTotalInsert[]`
  - `toDimensionRows(siteId: string, dimension: 'query' | 'page' | 'country' | 'device', rows: GscRow[]): DimensionInsert[]`
  - `metricsWriteRepo.upsertDailyTotals(rows): Promise<void>`
  - `metricsWriteRepo.upsertQueryDaily(rows) / upsertPageDaily / upsertCountryDaily / upsertDeviceDaily`
  - `sitesRepo.findForSync(siteId): Promise<SiteForSync | null>`
  - `sitesRepo.recordSyncSuccess(siteId, lastSyncedDate): Promise<void>`
  - `sitesRepo.recordSyncFailure(siteId, code: string): Promise<void>`
  - `runDailySync(job: { siteId: string }): Promise<void>`
  - `SYNC_LOOKBACK_DAYS = 5`

- [ ] **Step 1: Dönüştürme testini yaz (başarısız olacak)**

`src/server/sync/write-metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toDailyTotalRows, toDimensionRows } from './write-metrics'

describe('toDailyTotalRows', () => {
  it('tarih anahtarını satıra çevirir', () => {
    expect(
      toDailyTotalRows('site-1', [{ keys: ['2026-08-01'], clicks: 5, impressions: 100, ctr: 0.05, position: 7.4 }]),
    ).toEqual([{ siteId: 'site-1', date: '2026-08-01', clicks: 5, impressions: 100, position: 7.4 }])
  })

  it('ctr alanını yok sayar; oran her zaman yeniden hesaplanır', () => {
    const [row] = toDailyTotalRows('s', [{ keys: ['2026-08-01'], clicks: 1, impressions: 2, ctr: 0.9, position: 1 }])
    expect(row).not.toHaveProperty('ctr')
  })
})

describe('toDimensionRows', () => {
  it('tarih ve boyut anahtarlarını ayırır', () => {
    expect(
      toDimensionRows('s', 'query', [
        { keys: ['2026-08-01', 'iphone kaufen'], clicks: 3, impressions: 40, ctr: 0.075, position: 3.2 },
      ]),
    ).toEqual([{ siteId: 's', date: '2026-08-01', query: 'iphone kaufen', clicks: 3, impressions: 40, position: 3.2 }])
  })

  it('eksik anahtarlı satırları atar', () => {
    expect(toDimensionRows('s', 'page', [{ keys: ['2026-08-01'], clicks: 1, impressions: 1, ctr: 1, position: 1 }])).toEqual([])
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/sync/write-metrics.test.ts`
Expected: FAIL — `./write-metrics` modülü yok.

- [ ] **Step 3: `src/server/sync/write-metrics.ts` yaz**

```ts
import type { GscRow } from '@/server/gsc/types'

export type DailyTotalInsert = { siteId: string; date: string; clicks: number; impressions: number; position: number }

const COLUMN: Record<'query' | 'page' | 'country' | 'device', string> = {
  query: 'query',
  page: 'page',
  country: 'country',
  device: 'device',
}

export function toDailyTotalRows(siteId: string, rows: readonly GscRow[]): DailyTotalInsert[] {
  return rows.flatMap((row) => {
    const date = row.keys[0]
    if (!date) return []
    return [{ siteId, date, clicks: row.clicks, impressions: row.impressions, position: row.position }]
  })
}

export function toDimensionRows(
  siteId: string,
  dimension: keyof typeof COLUMN,
  rows: readonly GscRow[],
): Array<DailyTotalInsert & Record<string, string | number>> {
  return rows.flatMap((row) => {
    const date = row.keys[0]
    const value = row.keys[1]
    if (!date || value === undefined) return []
    return [
      {
        siteId,
        date,
        [COLUMN[dimension]]: value,
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
      },
    ]
  })
}
```

Google'ın döndürdüğü `ctr` alanı **hiç saklanmaz.** Oran her zaman `clicks / impressions` ile yeniden hesaplanır (Task 7); iki kaynaktan gelen iki farklı oran olması mümkün değildir.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/sync/write-metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Yazma repository'sini yaz**

`src/server/repositories/metrics-write.repo.ts`:

```ts
import { sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { countryDaily, dailyTotals, deviceDaily, pageDaily, queryDaily } from '@/server/db/schema'

const CHUNK = 2_000

async function inChunks<T>(rows: readonly T[], write: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await write(rows.slice(i, i + CHUNK))
  }
}

const overwriteMetrics = {
  clicks: sql`excluded.clicks`,
  impressions: sql`excluded.impressions`,
  position: sql`excluded.position`,
}

export const metricsWriteRepo = {
  upsertDailyTotals: (rows: Array<typeof dailyTotals.$inferInsert>) =>
    inChunks(rows, (chunk) =>
      db
        .insert(dailyTotals)
        .values(chunk)
        .onConflictDoUpdate({ target: [dailyTotals.siteId, dailyTotals.date], set: overwriteMetrics }),
    ),

  upsertQueryDaily: (rows: Array<typeof queryDaily.$inferInsert>) =>
    inChunks(rows, (chunk) =>
      db
        .insert(queryDaily)
        .values(chunk)
        .onConflictDoUpdate({ target: [queryDaily.siteId, queryDaily.date, queryDaily.queryKey], set: overwriteMetrics }),
    ),

  upsertPageDaily: (rows: Array<typeof pageDaily.$inferInsert>) =>
    inChunks(rows, (chunk) =>
      db
        .insert(pageDaily)
        .values(chunk)
        .onConflictDoUpdate({ target: [pageDaily.siteId, pageDaily.date, pageDaily.pageKey], set: overwriteMetrics }),
    ),

  upsertCountryDaily: (rows: Array<typeof countryDaily.$inferInsert>) =>
    inChunks(rows, (chunk) =>
      db
        .insert(countryDaily)
        .values(chunk)
        .onConflictDoUpdate({ target: [countryDaily.siteId, countryDaily.date, countryDaily.country], set: overwriteMetrics }),
    ),

  upsertDeviceDaily: (rows: Array<typeof deviceDaily.$inferInsert>) =>
    inChunks(rows, (chunk) =>
      db
        .insert(deviceDaily)
        .values(chunk)
        .onConflictDoUpdate({ target: [deviceDaily.siteId, deviceDaily.date, deviceDaily.device], set: overwriteMetrics }),
    ),
}
```

`onConflictDoUpdate` + parça parça yazım idempotentliği garanti eder: iş yarıda kesilip yeniden çalışırsa aynı satırlar aynı değerlerle üzerine yazılır, kopya oluşmaz.

- [ ] **Step 6: Günlük toplama testini yaz**

`src/server/sync/daily-sync.test.ts` — `createGscClient`, `metricsWriteRepo` ve `sitesRepo` `vi.mock` ile taklit edilir:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryPerformance = vi.fn()
const recordSyncSuccess = vi.fn()
const recordSyncFailure = vi.fn()
const upsertDailyTotals = vi.fn()

vi.mock('@/server/gsc/client', () => ({ createGscClient: vi.fn(async () => ({ queryPerformance })) }))
vi.mock('@/server/repositories/sites.repo', () => ({
  sitesRepo: {
    findForSync: vi.fn(async () => ({
      id: 'site-1',
      connectionId: 'conn-1',
      gscProperty: 'https://example.com/',
      lastSyncedDate: '2026-08-10',
    })),
    recordSyncSuccess,
    recordSyncFailure,
    setStage: vi.fn(),
  },
}))
vi.mock('@/server/repositories/metrics-write.repo', () => ({
  metricsWriteRepo: {
    upsertDailyTotals,
    upsertQueryDaily: vi.fn(),
    upsertPageDaily: vi.fn(),
    upsertCountryDaily: vi.fn(),
    upsertDeviceDaily: vi.fn(),
  },
}))

const { runDailySync, SYNC_LOOKBACK_DAYS } = await import('./daily-sync')

beforeEach(() => {
  vi.clearAllMocks()
  queryPerformance.mockResolvedValue([])
})

describe('runDailySync', () => {
  it('son senkron tarihinden geriye doğru güvenlik penceresi bırakır', async () => {
    await runDailySync({ siteId: 'site-1' }, new Date('2026-08-19T04:00:00Z'))
    const [call] = queryPerformance.mock.calls
    expect(call?.[0].from).toBe('2026-08-05')
    expect(SYNC_LOOKBACK_DAYS).toBe(5)
  })

  it('başarıda son tarihi kaydeder', async () => {
    await runDailySync({ siteId: 'site-1' }, new Date('2026-08-19T04:00:00Z'))
    expect(recordSyncSuccess).toHaveBeenCalledWith('site-1', '2026-08-16')
  })

  it('Google hatasında hata kodunu kaydeder ve hatayı yeniden fırlatır', async () => {
    const { GscError } = await import('@/server/gsc/errors')
    queryPerformance.mockRejectedValueOnce(new GscError('needs_reconnect', 'yetki yok'))
    await expect(runDailySync({ siteId: 'site-1' }, new Date('2026-08-19T04:00:00Z'))).rejects.toThrow()
    expect(recordSyncFailure).toHaveBeenCalledWith('site-1', 'needs_reconnect')
  })
})
```

- [ ] **Step 7: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/sync/daily-sync.test.ts`
Expected: FAIL — `./daily-sync` modülü yok.

- [ ] **Step 8: `src/server/sync/daily-sync.ts` yaz**

```ts
import { DATA_LAG_DAYS } from '@/lib/date/period'
import { GscError } from '@/server/gsc/errors'
import { createGscClient } from '@/server/gsc/client'
import { metricsWriteRepo } from '@/server/repositories/metrics-write.repo'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { toDailyTotalRows, toDimensionRows } from './write-metrics'

/** Google son günlerin verisini geriye dönük düzeltir; bu pencereyi her seferinde yeniden yazarız. */
export const SYNC_LOOKBACK_DAYS = 5

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export async function runDailySync(job: { siteId: string }, now = new Date()): Promise<void> {
  const site = await sitesRepo.findForSync(job.siteId)
  if (!site) return

  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DATA_LAG_DAYS * DAY
  const to = iso(endMs)
  const lastSynced = site.lastSyncedDate ? Date.parse(site.lastSyncedDate) : endMs
  const from = iso(Math.min(lastSynced - (SYNC_LOOKBACK_DAYS - 1) * DAY, endMs))
  if (Date.parse(from) > endMs) return

  try {
    const client = await createGscClient(site.connectionId)
    const fetchFor = (dimensions: Parameters<typeof client.queryPerformance>[0]['dimensions']) =>
      client.queryPerformance({ property: site.gscProperty, from, to, dimensions })

    const [totals, queries, pages, countries, devices] = await Promise.all([
      fetchFor(['date']),
      fetchFor(['date', 'query']),
      fetchFor(['date', 'page']),
      fetchFor(['date', 'country']),
      fetchFor(['date', 'device']),
    ])

    await metricsWriteRepo.upsertDailyTotals(toDailyTotalRows(site.id, totals))
    await metricsWriteRepo.upsertQueryDaily(toDimensionRows(site.id, 'query', queries))
    await metricsWriteRepo.upsertPageDaily(toDimensionRows(site.id, 'page', pages))
    await metricsWriteRepo.upsertCountryDaily(toDimensionRows(site.id, 'country', countries))
    await metricsWriteRepo.upsertDeviceDaily(toDimensionRows(site.id, 'device', devices))

    await sitesRepo.recordSyncSuccess(site.id, to)
  } catch (error) {
    await sitesRepo.recordSyncFailure(site.id, error instanceof GscError ? error.code : 'unavailable')
    throw error
  }
}
```

Hata yeniden fırlatılır çünkü yeniden deneme kararı kuyruğa aittir; servis yalnızca durumu kaydeder.

- [ ] **Step 9: `src/server/repositories/sites.repo.ts` yaz**

`findForSync` (site + bağlantı + son senkron tarihi), `recordSyncSuccess` (`lastSyncedDate`, `lastSuccessAt`, `consecutiveFailures = 0`, `lastErrorCode = null`, `status = 'fresh'`), `recordSyncFailure` (`consecutiveFailures` bir artırılır, `lastErrorCode` yazılır), `setStage`, `listForUser`, `insertMany`.

- [ ] **Step 10: Testleri çalıştır**

Run: `pnpm test src/server/sync`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: gunluk veri toplama isi"
```

---

### Task 13: Geçmiş veri alma

**Files:**
- Create: `src/server/sync/history-sync.ts`, `src/server/sync/history-plan.ts`
- Test: `src/server/sync/history-plan.test.ts`

**Interfaces:**
- Consumes: Task 12'nin yazma yolu.
- Produces:
  - `HISTORY_MONTHS = 16`
  - `planHistoryChunks(today: Date): Array<{ from: string; to: string }>` — en yeniden en eskiye sıralı aylık dilimler
  - `runHistorySync(job: { siteId: string; from: string; to: string }): Promise<void>`
  - `startHistorySync(siteId: string, today: Date): Promise<void>` — tüm dilimleri kuyruğa ekler

**Neden dilimli:** 16 aylık veri tek istekte alınamaz (satır sınırı) ve tek işte alınırsa bir hata tüm ilerlemeyi çöpe atar. Aylık dilim hem yeniden denemeyi ucuzlatır hem de kullanıcının "hazırlanıyor" ekranında ilerleme görmesini sağlar.

- [ ] **Step 1: Dilimleme testini yaz (başarısız olacak)**

`src/server/sync/history-plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HISTORY_MONTHS, planHistoryChunks } from './history-plan'

describe('planHistoryChunks', () => {
  it('16 aylık dilim üretir', () => {
    expect(planHistoryChunks(new Date('2026-08-19T00:00:00Z'))).toHaveLength(HISTORY_MONTHS)
  })

  it('en yeni dilimden başlar', () => {
    const [first] = planHistoryChunks(new Date('2026-08-19T00:00:00Z'))
    expect(first).toEqual({ from: '2026-08-01', to: '2026-08-16' })
  })

  it('dilimler arasında boşluk veya çakışma bırakmaz', () => {
    const chunks = planHistoryChunks(new Date('2026-08-19T00:00:00Z'))
    for (let i = 1; i < chunks.length; i += 1) {
      const previousStart = Date.parse(chunks[i - 1]!.from)
      const currentEnd = Date.parse(chunks[i]!.to)
      expect(currentEnd).toBe(previousStart - 86_400_000)
    }
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/sync/history-plan.test.ts`
Expected: FAIL — `./history-plan` modülü yok.

- [ ] **Step 3: `src/server/sync/history-plan.ts` yaz**

```ts
import { DATA_LAG_DAYS } from '@/lib/date/period'

/** Google en fazla 16 ay geriye veri verir. */
export const HISTORY_MONTHS = 16

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function planHistoryChunks(today: Date): Array<{ from: string; to: string }> {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - DATA_LAG_DAYS * DAY
  const chunks: Array<{ from: string; to: string }> = []
  let cursor = end

  for (let i = 0; i < HISTORY_MONTHS; i += 1) {
    const cursorDate = new Date(cursor)
    const monthStart = Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth(), 1)
    chunks.push({ from: iso(monthStart), to: iso(cursor) })
    cursor = monthStart - DAY
  }

  return chunks
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/sync/history-plan.test.ts`
Expected: PASS

- [ ] **Step 5: `src/server/sync/history-sync.ts` yaz**

```ts
import { GscError } from '@/server/gsc/errors'
import { createGscClient } from '@/server/gsc/client'
import { metricsWriteRepo } from '@/server/repositories/metrics-write.repo'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { enqueueSiteJob } from './queue'
import { planHistoryChunks } from './history-plan'
import { toDailyTotalRows, toDimensionRows } from './write-metrics'

export async function startHistorySync(siteId: string, today = new Date()): Promise<void> {
  await sitesRepo.setStage(siteId, 'fetching_history')
  for (const chunk of planHistoryChunks(today)) {
    await enqueueSiteJob({ kind: 'history', siteId, from: chunk.from, to: chunk.to })
  }
}

export async function runHistorySync(job: { siteId: string; from: string; to: string }): Promise<void> {
  const site = await sitesRepo.findForSync(job.siteId)
  if (!site) return

  try {
    const client = await createGscClient(site.connectionId)
    const fetchFor = (dimensions: Parameters<typeof client.queryPerformance>[0]['dimensions']) =>
      client.queryPerformance({ property: site.gscProperty, from: job.from, to: job.to, dimensions })

    const [totals, queries, pages, countries, devices] = await Promise.all([
      fetchFor(['date']),
      fetchFor(['date', 'query']),
      fetchFor(['date', 'page']),
      fetchFor(['date', 'country']),
      fetchFor(['date', 'device']),
    ])

    await metricsWriteRepo.upsertDailyTotals(toDailyTotalRows(site.id, totals))
    await metricsWriteRepo.upsertQueryDaily(toDimensionRows(site.id, 'query', queries))
    await metricsWriteRepo.upsertPageDaily(toDimensionRows(site.id, 'page', pages))
    await metricsWriteRepo.upsertCountryDaily(toDimensionRows(site.id, 'country', countries))
    await metricsWriteRepo.upsertDeviceDaily(toDimensionRows(site.id, 'device', devices))

    await sitesRepo.completeHistoryChunk(site.id, job.from)
  } catch (error) {
    await sitesRepo.recordSyncFailure(site.id, error instanceof GscError ? error.code : 'unavailable')
    throw error
  }
}
```

`sitesRepo.completeHistoryChunk(siteId, from)` — `historyStartDate`'i daha eskiyse günceller; en eski dilim tamamlandığında `stage`'i `ready` yapar ve `status`'ü `fresh`'e çeker.

- [ ] **Step 6: Testleri çalıştır**

Run: `pnpm test src/server/sync`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: gecmis veri alma dilimleri"
```

---

### Task 14: Zamanlayıcı ve bakım işleri

**Files:**
- Create: `src/server/sync/scheduler.ts`, `src/server/sync/maintenance.ts`
- Modify: `src/worker/index.ts`
- Test: `src/server/sync/scheduler.test.ts`

**Interfaces:**
- Consumes: Task 11'in `siteQueue`, Task 6'nın `ensurePartitions`.
- Produces:
  - `registerSchedules(): Promise<void>` — tekrarlayan işleri kurar
  - `enqueueAllDailySyncs(): Promise<number>` — kuyruğa eklenen site sayısını döndürür
  - `runMaintenance(): Promise<void>` — gelecek bölümleri açar, 16 aydan eskisini düşürür, sahipsiz satırları siler

- [ ] **Step 1: Zamanlayıcı testini yaz (başarısız olacak)**

`src/server/sync/scheduler.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

const add = vi.fn()
vi.mock('./queue', () => ({
  siteQueue: { add, upsertJobScheduler: vi.fn() },
  enqueueSiteJob: vi.fn(),
}))
vi.mock('@/server/repositories/sites.repo', () => ({
  sitesRepo: { listSyncableIds: vi.fn(async () => ['a', 'b', 'c']) },
}))

const { enqueueAllDailySyncs } = await import('./scheduler')

describe('enqueueAllDailySyncs', () => {
  it('toplanabilir her site için iş ekler', async () => {
    await expect(enqueueAllDailySyncs()).resolves.toBe(3)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/sync/scheduler.test.ts`
Expected: FAIL — `./scheduler` modülü yok.

- [ ] **Step 3: `src/server/sync/scheduler.ts` yaz**

```ts
import { sitesRepo } from '@/server/repositories/sites.repo'
import { enqueueSiteJob, siteQueue } from './queue'

export async function enqueueAllDailySyncs(): Promise<number> {
  const ids = await sitesRepo.listSyncableIds()
  for (const siteId of ids) {
    await enqueueSiteJob({ kind: 'daily', siteId })
  }
  return ids.length
}

export async function registerSchedules(): Promise<void> {
  await siteQueue.upsertJobScheduler('daily-fanout', { pattern: '0 5 * * *', tz: 'Europe/Istanbul' }, {
    name: 'fanout',
    data: { kind: 'fanout' },
  })
  await siteQueue.upsertJobScheduler('maintenance', { pattern: '0 3 * * *', tz: 'Europe/Istanbul' }, {
    name: 'maintenance',
    data: { kind: 'maintenance' },
  })
}
```

`listSyncableIds` yalnızca `revokedAt IS NULL` bağlantıya sahip ve `lastErrorCode <> 'needs_reconnect'` olan siteleri döndürür — kullanıcı bağlantıyı yenileyene kadar boş yere Google'a gidilmez.

- [ ] **Step 4: `src/server/sync/maintenance.ts` yaz**

```ts
import { sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { PARTITIONED_TABLES, ensurePartitions, partitionRangeFor } from '@/server/db/partitions'
import { HISTORY_MONTHS } from './history-plan'

export async function runMaintenance(now = new Date()): Promise<void> {
  await ensurePartitions(db, now, 3)

  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - HISTORY_MONTHS - 1, 1))
  const { suffix } = partitionRangeFor(cutoff)
  for (const table of PARTITIONED_TABLES) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS ${table}_${suffix}`))
  }

  await db.execute(sql`DELETE FROM query_daily WHERE site_id NOT IN (SELECT id FROM sites)`)
  await db.execute(sql`DELETE FROM page_daily WHERE site_id NOT IN (SELECT id FROM sites)`)
}
```

- [ ] **Step 5: İşçiyi zamanlanan işleri de karşılayacak hale getir**

`src/worker/index.ts` içindeki işleyiciye `fanout` ve `maintenance` dallarını ekle; süreç başlarken `await registerSchedules()` çağır.

- [ ] **Step 6: İşçiyi çalıştırıp uçtan uca doğrula**

```bash
pnpm worker
```

Beklenen: hata olmadan başlar, `[worker]` günlükleri yalnızca gerçek hata olduğunda çıkar.

- [ ] **Step 7: Testleri çalıştır ve commit et**

Run: `pnpm test src/server`

```bash
git add -A
git commit -m "feat: zamanlanmis toplama ve bakim isleri"
```

---

## Faz 4 — Okuma katmanı

### Task 15: Özet ve zaman serisi okuması

**Files:**
- Create: `src/server/repositories/metrics-read.repo.ts`, `src/server/services/performance.service.ts`
- Test: `src/server/services/performance.service.test.ts`

**Interfaces:**
- Consumes: Task 6 tabloları, Task 7'nin `aggregate` / `compareMetric` / `previousPeriod`.
- Produces:
  - `type SiteScope = { kind: 'all'; userId: string } | { kind: 'site'; siteId: string }`
  - `metricsReadRepo.totalsFor(scope, period): Promise<Totals>`
  - `metricsReadRepo.dailySeries(scope, period): Promise<Array<{ date: string; clicks: number; impressions: number }>>`
  - `performanceService.getOverview(scope, period): Promise<Overview>`
  - `type Overview = { totals: Totals; previous: Totals; trends: { clicks: Trend; impressions: Trend; clickRate: Trend; rank: Trend }; series: DailyPoint[] }`

**Neden servis ayrı:** repository yalnızca SQL yazar; "önceki dönemi de çek ve karşılaştır" iş kuralıdır ve servis katmanında yaşar. Arayüz hiçbir zaman iki ayrı çağrı yapıp farkı kendisi hesaplamaz.

- [ ] **Step 1: Servis testini yaz (başarısız olacak)**

`src/server/services/performance.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const totalsFor = vi.fn()
const dailySeries = vi.fn()
vi.mock('@/server/repositories/metrics-read.repo', () => ({ metricsReadRepo: { totalsFor, dailySeries } }))

const { performanceService } = await import('./performance.service')

const scope = { kind: 'site', siteId: 'site-1' } as const
const period = { from: '2026-07-20', to: '2026-08-16' }

beforeEach(() => {
  vi.clearAllMocks()
  dailySeries.mockResolvedValue([])
})

describe('getOverview', () => {
  it('mevcut ve önceki dönemi karşılaştırır', async () => {
    totalsFor
      .mockResolvedValueOnce({ clicks: 112, impressions: 1000, clickRate: 0.112, rank: 7.2 })
      .mockResolvedValueOnce({ clicks: 100, impressions: 900, clickRate: 0.111, rank: 8.4 })

    const overview = await performanceService.getOverview(scope, period)

    expect(overview.trends.clicks.relativeChange).toBeCloseTo(0.12, 6)
    expect(overview.trends.rank.sentiment).toBe('good')
  })

  it('önceki dönemi doğru tarih aralığıyla ister', async () => {
    totalsFor.mockResolvedValue({ clicks: 0, impressions: 0, clickRate: null, rank: null })
    await performanceService.getOverview(scope, period)
    expect(totalsFor).toHaveBeenNthCalledWith(2, scope, { from: '2026-06-22', to: '2026-07-19' })
  })

  it('veri yoksa çökmez', async () => {
    totalsFor.mockResolvedValue({ clicks: 0, impressions: 0, clickRate: null, rank: null })
    const overview = await performanceService.getOverview(scope, period)
    expect(overview.trends.clickRate.sentiment).toBe('neutral')
    expect(overview.series).toEqual([])
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/services/performance.service.test.ts`
Expected: FAIL — `./performance.service` modülü yok.

- [ ] **Step 3: Okuma repository'sini yaz**

`src/server/repositories/metrics-read.repo.ts`:

```ts
import { and, between, eq, sql } from 'drizzle-orm'
import type { Period } from '@/lib/date/period'
import type { Totals } from '@/lib/metrics/aggregate'
import { db } from '@/server/db'
import { dailyTotals, sites } from '@/server/db/schema'

export type SiteScope = { kind: 'all'; userId: string } | { kind: 'site'; siteId: string }
export type DailyPoint = { date: string; clicks: number; impressions: number }

const scopeCondition = (scope: SiteScope) =>
  scope.kind === 'site'
    ? eq(dailyTotals.siteId, scope.siteId)
    : sql`${dailyTotals.siteId} IN (SELECT ${sites.id} FROM ${sites} WHERE ${sites.userId} = ${scope.userId})`

export const metricsReadRepo = {
  async totalsFor(scope: SiteScope, period: Period): Promise<Totals> {
    const [row] = await db
      .select({
        clicks: sql<number>`coalesce(sum(${dailyTotals.clicks}), 0)::int`,
        impressions: sql<number>`coalesce(sum(${dailyTotals.impressions}), 0)::int`,
        weightedPosition: sql<number>`coalesce(sum(${dailyTotals.position} * ${dailyTotals.impressions}), 0)::float8`,
      })
      .from(dailyTotals)
      .where(and(scopeCondition(scope), between(dailyTotals.date, period.from, period.to)))

    const clicks = row?.clicks ?? 0
    const impressions = row?.impressions ?? 0
    return {
      clicks,
      impressions,
      clickRate: impressions === 0 ? null : clicks / impressions,
      rank: impressions === 0 ? null : (row?.weightedPosition ?? 0) / impressions,
    }
  },

  async dailySeries(scope: SiteScope, period: Period): Promise<DailyPoint[]> {
    return db
      .select({
        date: dailyTotals.date,
        clicks: sql<number>`sum(${dailyTotals.clicks})::int`,
        impressions: sql<number>`sum(${dailyTotals.impressions})::int`,
      })
      .from(dailyTotals)
      .where(and(scopeCondition(scope), between(dailyTotals.date, period.from, period.to)))
      .groupBy(dailyTotals.date)
      .orderBy(dailyTotals.date)
  },
}
```

Ağırlıklı sıra toplaması SQL'de yapılır — satırları uygulamaya çekip toplamak 90 günlük çok siteli görünümde gereksiz veri taşır.

`Period` ve `Totals` tipleri `src/lib`'den gelir; yeniden tanımlanmaz. Katman kuralı tek yönlüdür: sunucu `lib`'i import edebilir, `lib` sunucuyu edemez.

- [ ] **Step 4: `src/server/services/performance.service.ts` yaz**

```ts
import { previousPeriod, type Period } from '@/lib/date/period'
import { compareMetric, type Trend } from '@/lib/metrics/trend'
import type { Totals } from '@/lib/metrics/aggregate'
import { metricsReadRepo, type DailyPoint, type SiteScope } from '@/server/repositories/metrics-read.repo'

export type Overview = {
  totals: Totals
  previous: Totals
  trends: { clicks: Trend; impressions: Trend; clickRate: Trend; rank: Trend }
  series: DailyPoint[]
}

export const performanceService = {
  async getOverview(scope: SiteScope, period: Period): Promise<Overview> {
    const totals = await metricsReadRepo.totalsFor(scope, period)
    const previous = await metricsReadRepo.totalsFor(scope, previousPeriod(period))
    const series = await metricsReadRepo.dailySeries(scope, period)

    return {
      totals,
      previous,
      series,
      trends: {
        clicks: compareMetric(totals.clicks, previous.clicks, {}),
        impressions: compareMetric(totals.impressions, previous.impressions, {}),
        clickRate: compareMetric(totals.clickRate, previous.clickRate, {}),
        rank: compareMetric(totals.rank, previous.rank, { lowerIsBetter: true }),
      },
    }
  },
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/services/performance.service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: performans ozeti okuma katmani"
```

---

### Task 16: Boyut okumaları (kelime, sayfa, ülke, cihaz)

**Files:**
- Create: `src/server/repositories/dimensions.repo.ts`, `src/server/services/dimensions.service.ts`
- Test: `src/server/services/dimensions.service.test.ts`

**Interfaces:**
- Consumes: Task 6'nın `queryDaily` / `pageDaily` / `countryDaily` / `deviceDaily`, Task 7'nin `compareMetric`.
- Produces:
  - `type DimensionKind = 'query' | 'page' | 'country' | 'device'`
  - `type DimensionRow = { key: string; clicks: number; impressions: number; clickRate: number | null; rank: number | null }`
  - `dimensionsRepo.topBy(kind, scope, period, limit): Promise<DimensionRow[]>`
  - `dimensionsRepo.shareOf(kind, scope, period): Promise<Array<DimensionRow & { share: number }>>`
  - `dimensionsService.getTop(kind, scope, period, limit): Promise<Array<DimensionRow & { trend: Trend }>>`
  - `DEFAULT_TOP_LIMIT = 50`

- [ ] **Step 1: Servis testini yaz (başarısız olacak)**

`src/server/services/dimensions.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const topBy = vi.fn()
vi.mock('@/server/repositories/dimensions.repo', () => ({ dimensionsRepo: { topBy, shareOf: vi.fn() } }))

const { dimensionsService } = await import('./dimensions.service')

const scope = { kind: 'site', siteId: 's' } as const
const period = { from: '2026-07-20', to: '2026-08-16' }

beforeEach(() => vi.clearAllMocks())

describe('getTop', () => {
  it('her satır için önceki dönemle karşılaştırma üretir', async () => {
    topBy
      .mockResolvedValueOnce([{ key: 'iphone kaufen', clicks: 1240, impressions: 23200, clickRate: 0.053, rank: 3.2 }])
      .mockResolvedValueOnce([{ key: 'iphone kaufen', clicks: 1000, impressions: 20000, clickRate: 0.05, rank: 4.1 }])

    const [row] = await dimensionsService.getTop('query', scope, period, 10)

    expect(row?.trend.relativeChange).toBeCloseTo(0.24, 6)
    expect(row?.trend.sentiment).toBe('good')
  })

  it('önceki dönemde olmayan satır için nötr karşılaştırma verir', async () => {
    topBy.mockResolvedValueOnce([{ key: 'yeni', clicks: 10, impressions: 100, clickRate: 0.1, rank: 5 }]).mockResolvedValueOnce([])
    const [row] = await dimensionsService.getTop('query', scope, period, 10)
    expect(row?.trend.sentiment).toBe('neutral')
  })

  it('önceki dönemi aynı boyut ve kapsamla ister', async () => {
    topBy.mockResolvedValue([])
    await dimensionsService.getTop('page', scope, period, 10)
    expect(topBy).toHaveBeenNthCalledWith(2, 'page', scope, { from: '2026-06-22', to: '2026-07-19' }, 10)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/services/dimensions.service.test.ts`
Expected: FAIL — `./dimensions.service` modülü yok.

- [ ] **Step 3: `src/server/repositories/dimensions.repo.ts` yaz**

```ts
import { and, between, desc, eq, sql } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { Period } from '@/lib/date/period'
import { db } from '@/server/db'
import { countryDaily, deviceDaily, pageDaily, queryDaily, sites } from '@/server/db/schema'
import type { SiteScope } from './metrics-read.repo'

export type DimensionKind = 'query' | 'page' | 'country' | 'device'
export type DimensionRow = {
  key: string
  clicks: number
  impressions: number
  clickRate: number | null
  rank: number | null
}

const SOURCES: Record<DimensionKind, { table: PgTable; keyColumn: PgColumn; siteId: PgColumn; date: PgColumn }> = {
  query: { table: queryDaily, keyColumn: queryDaily.query, siteId: queryDaily.siteId, date: queryDaily.date },
  page: { table: pageDaily, keyColumn: pageDaily.page, siteId: pageDaily.siteId, date: pageDaily.date },
  country: { table: countryDaily, keyColumn: countryDaily.country, siteId: countryDaily.siteId, date: countryDaily.date },
  device: { table: deviceDaily, keyColumn: deviceDaily.device, siteId: deviceDaily.siteId, date: deviceDaily.date },
}

export const dimensionsRepo = {
  async topBy(kind: DimensionKind, scope: SiteScope, period: Period, limit: number): Promise<DimensionRow[]> {
    const source = SOURCES[kind]
    const scopeCondition =
      scope.kind === 'site'
        ? eq(source.siteId, scope.siteId)
        : sql`${source.siteId} IN (SELECT ${sites.id} FROM ${sites} WHERE ${sites.userId} = ${scope.userId})`

    const rows = await db
      .select({
        key: source.keyColumn,
        clicks: sql<number>`sum(clicks)::int`,
        impressions: sql<number>`sum(impressions)::int`,
        weightedPosition: sql<number>`sum(position * impressions)::float8`,
      })
      .from(source.table)
      .where(and(scopeCondition, between(source.date, period.from, period.to)))
      .groupBy(source.keyColumn)
      .orderBy(desc(sql`sum(clicks)`))
      .limit(limit)

    return rows.map((row) => ({
      key: String(row.key),
      clicks: row.clicks,
      impressions: row.impressions,
      clickRate: row.impressions === 0 ? null : row.clicks / row.impressions,
      rank: row.impressions === 0 ? null : row.weightedPosition / row.impressions,
    }))
  },

  async shareOf(kind: DimensionKind, scope: SiteScope, period: Period) {
    const rows = await this.topBy(kind, scope, period, 100)
    const total = rows.reduce((sum, row) => sum + row.clicks, 0)
    return rows.map((row) => ({ ...row, share: total === 0 ? 0 : row.clicks / total }))
  },
}
```

- [ ] **Step 4: `src/server/services/dimensions.service.ts` yaz**

```ts
import { previousPeriod, type Period } from '@/lib/date/period'
import { compareMetric, type Trend } from '@/lib/metrics/trend'
import { dimensionsRepo, type DimensionKind, type DimensionRow } from '@/server/repositories/dimensions.repo'
import type { SiteScope } from '@/server/repositories/metrics-read.repo'

export const DEFAULT_TOP_LIMIT = 50

export const dimensionsService = {
  async getTop(
    kind: DimensionKind,
    scope: SiteScope,
    period: Period,
    limit = DEFAULT_TOP_LIMIT,
  ): Promise<Array<DimensionRow & { trend: Trend }>> {
    const current = await dimensionsRepo.topBy(kind, scope, period, limit)
    const previous = await dimensionsRepo.topBy(kind, scope, previousPeriod(period), limit)
    const previousByKey = new Map(previous.map((row) => [row.key, row]))

    return current.map((row) => ({
      ...row,
      trend: compareMetric(row.clicks, previousByKey.get(row.key)?.clicks ?? null, {}),
    }))
  },
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/services/dimensions.service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: boyut okumalari ve donem karsilastirmasi"
```

---

## Faz 5 — İçgörü motoru

### Task 17: Durum özeti üretimi

**Files:**
- Create: `src/lib/insights/rules.ts`, `src/lib/insights/types.ts`, `src/server/services/insights.service.ts`
- Modify: `src/lib/copy/tr.ts`
- Test: `src/lib/insights/rules.test.ts`

**Interfaces:**
- Consumes: Task 7'nin `Trend`, Task 15–16'nın servisleri, Task 10'un `SiteStatusView`.
- Produces:
  - `type InsightKind = 'clicks_change' | 'position_change' | 'query_breakout' | 'stale_data' | 'needs_reconnect'`
  - `type Insight = { kind: InsightKind; direction: 'up' | 'down' | 'warning'; siteId: string; values: Record<string, string | number>; href: string }`
  - `buildInsights(input: InsightInput): Insight[]` — saf fonksiyon, en fazla `MAX_INSIGHTS` üretir
  - `MAX_INSIGHTS = 5`, `CLICKS_CHANGE_THRESHOLD = 0.15`, `POSITION_CHANGE_THRESHOLD = 1.5`, `STALE_AFTER_DAYS = 2`
  - `insightsService.forUser(userId, period): Promise<Insight[]>`

**Neden saf fonksiyon:** Spec §6 — panelin en değerli parçası burası. Eşiklerin ve sıralamanın veritabanından bağımsız test edilebilmesi gerekir; kural motoru `lib` içinde yaşar, servis yalnızca veriyi toplayıp verir.

- [ ] **Step 1: Kural testini yaz (başarısız olacak)**

`src/lib/insights/rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildInsights, MAX_INSIGHTS } from './rules'

const site = (over: Partial<Parameters<typeof buildInsights>[0]['sites'][number]> = {}) => ({
  siteId: 's1',
  displayName: 'example.com',
  status: 'fresh' as const,
  daysSinceLastData: 0,
  clicksTrend: { current: 100, previous: 100, absoluteChange: 0, relativeChange: 0, sentiment: 'neutral' as const },
  rankTrend: { current: 8, previous: 8, absoluteChange: 0, relativeChange: 0, sentiment: 'neutral' as const },
  topQueryMover: null,
  ...over,
})

describe('buildInsights', () => {
  it('eşiği aşan tıklama artışını bildirir', () => {
    const insights = buildInsights({
      sites: [
        site({
          clicksTrend: { current: 124, previous: 100, absoluteChange: 24, relativeChange: 0.24, sentiment: 'good' },
        }),
      ],
    })
    expect(insights[0]).toMatchObject({ kind: 'clicks_change', direction: 'up' })
  })

  it('eşiğin altındaki değişimi bildirmez', () => {
    const insights = buildInsights({
      sites: [
        site({
          clicksTrend: { current: 105, previous: 100, absoluteChange: 5, relativeChange: 0.05, sentiment: 'good' },
        }),
      ],
    })
    expect(insights).toEqual([])
  })

  it('sıralama kötüleşmesini bildirir', () => {
    const insights = buildInsights({
      sites: [
        site({
          rankTrend: { current: 11.8, previous: 6.2, absoluteChange: 5.6, relativeChange: 0.9, sentiment: 'bad' },
        }),
      ],
    })
    expect(insights[0]).toMatchObject({ kind: 'position_change', direction: 'down' })
  })

  it('veri gecikmesini uyarı olarak verir', () => {
    const insights = buildInsights({ sites: [site({ daysSinceLastData: 3 })] })
    expect(insights[0]).toMatchObject({ kind: 'stale_data', direction: 'warning' })
  })

  it('bağlantı sorununu her şeyin önüne koyar', () => {
    const insights = buildInsights({
      sites: [
        site({
          status: 'needs_reconnect',
          daysSinceLastData: 5,
          clicksTrend: { current: 200, previous: 100, absoluteChange: 100, relativeChange: 1, sentiment: 'good' },
        }),
      ],
    })
    expect(insights[0]?.kind).toBe('needs_reconnect')
  })

  it('en fazla beş içgörü döndürür', () => {
    const sites = Array.from({ length: 12 }, (_, i) =>
      site({
        siteId: `s${i}`,
        clicksTrend: { current: 200, previous: 100, absoluteChange: 100, relativeChange: 1, sentiment: 'good' },
      }),
    )
    expect(buildInsights({ sites })).toHaveLength(MAX_INSIGHTS)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/insights/rules.test.ts`
Expected: FAIL — `./rules` modülü yok.

- [ ] **Step 3: `src/lib/insights/types.ts` ve `src/lib/insights/rules.ts` yaz**

`types.ts`:

```ts
import type { Trend } from '@/lib/metrics/trend'

export type InsightKind = 'needs_reconnect' | 'stale_data' | 'position_change' | 'clicks_change' | 'query_breakout'

export type Insight = {
  kind: InsightKind
  direction: 'up' | 'down' | 'warning'
  siteId: string
  values: Record<string, string | number>
  href: string
}

export type SiteInsightInput = {
  siteId: string
  displayName: string
  status: 'fresh' | 'syncing' | 'needs_reconnect' | 'failed'
  daysSinceLastData: number
  clicksTrend: Trend
  rankTrend: Trend
  topQueryMover: { query: string; clicksGained: number; rankNow: number } | null
}

export type InsightInput = { sites: SiteInsightInput[] }
```

`rules.ts`:

```ts
import type { Insight, InsightInput, InsightKind, SiteInsightInput } from './types'

export const MAX_INSIGHTS = 5
export const CLICKS_CHANGE_THRESHOLD = 0.15
export const POSITION_CHANGE_THRESHOLD = 1.5
export const STALE_AFTER_DAYS = 2
export const BREAKOUT_TOP_RANK = 3

/** Önce kullanıcının çözebileceği sorunlar, sonra kötü haber, en son iyi haber. */
const PRIORITY: Record<InsightKind, number> = {
  needs_reconnect: 0,
  stale_data: 1,
  position_change: 2,
  clicks_change: 3,
  query_breakout: 4,
}

function insightsForSite(site: SiteInsightInput): Insight[] {
  const found: Insight[] = []
  const siteHref = `/site/${site.siteId}`

  if (site.status === 'needs_reconnect') {
    return [{ kind: 'needs_reconnect', direction: 'warning', siteId: site.siteId, values: { site: site.displayName }, href: siteHref }]
  }

  if (site.daysSinceLastData > STALE_AFTER_DAYS) {
    found.push({
      kind: 'stale_data',
      direction: 'warning',
      siteId: site.siteId,
      values: { site: site.displayName, days: site.daysSinceLastData },
      href: siteHref,
    })
  }

  const rankChange = site.rankTrend.absoluteChange
  if (rankChange !== null && Math.abs(rankChange) >= POSITION_CHANGE_THRESHOLD) {
    found.push({
      kind: 'position_change',
      direction: site.rankTrend.sentiment === 'good' ? 'up' : 'down',
      siteId: site.siteId,
      values: { site: site.displayName, from: site.rankTrend.previous ?? 0, to: site.rankTrend.current ?? 0 },
      href: siteHref,
    })
  }

  const clicksChange = site.clicksTrend.relativeChange
  if (clicksChange !== null && Math.abs(clicksChange) >= CLICKS_CHANGE_THRESHOLD) {
    found.push({
      kind: 'clicks_change',
      direction: clicksChange > 0 ? 'up' : 'down',
      siteId: site.siteId,
      values: { site: site.displayName, change: Math.abs(clicksChange) },
      href: siteHref,
    })
  }

  if (site.topQueryMover && site.topQueryMover.rankNow <= BREAKOUT_TOP_RANK) {
    found.push({
      kind: 'query_breakout',
      direction: 'up',
      siteId: site.siteId,
      values: {
        site: site.displayName,
        query: site.topQueryMover.query,
        clicks: site.topQueryMover.clicksGained,
      },
      href: `${siteHref}/arama-kelimeleri`,
    })
  }

  return found
}

export function buildInsights({ sites }: InsightInput): Insight[] {
  return sites
    .flatMap(insightsForSite)
    .sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind])
    .slice(0, MAX_INSIGHTS)
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/lib/insights/rules.test.ts`
Expected: PASS

- [ ] **Step 5: İçgörü metinlerini sözlüğe ekle**

`src/lib/copy/tr.ts` içine — her içgörü tipi bir fonksiyondur, sayı biçimlendirmesi çağıran tarafta yapılır:

```ts
  insights: {
    title: 'Bugün dikkat etmeniz gerekenler',
    empty: 'Şu an dikkatinizi gerektiren bir durum yok.',
    needsReconnect: (site: string) => `${site} için Google bağlantınızı yenilemeniz gerekiyor.`,
    staleData: (site: string, days: string) => `${site} için ${days} gündür yeni veri gelmiyor.`,
    clicksUp: (site: string, change: string) => `${site} tıklamaları ${change} arttı.`,
    clicksDown: (site: string, change: string) => `${site} tıklamaları ${change} azaldı.`,
    rankUp: (site: string, from: string, to: string) => `${site} Google sıralaması ${from}'ten ${to}'e yükseldi.`,
    rankDown: (site: string, from: string, to: string) => `${site} Google sıralaması ${from}'ten ${to}'e geriledi.`,
    queryBreakout: (query: string) => `"${query}" kelimesi ilk 3 sıraya yükseldi.`,
  },
```

- [ ] **Step 6: İçgörü servisini yaz**

`src/server/services/insights.service.ts` — kullanıcının sitelerini gezer, her biri için `performanceService.getOverview` ve `dimensionsService.getTop('query', …, 5)` çağırır, `SiteInsightInput` kurar ve `buildInsights` sonucunu döndürür. Site sayısı yüksek olabileceği için çağrılar `Promise.all` yerine en fazla 5'erli gruplar halinde yapılır.

- [ ] **Step 7: Sözlük denetimi dahil testleri çalıştır**

Run: `pnpm test src/lib src/server`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: durum ozeti icgoru motoru"
```

---

## Faz 6 — Arayüz

### Task 18: Uygulama kabuğu, site ve tarih seçici

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/app-shell/sidebar.tsx`, `src/components/app-shell/topbar.tsx`
- Create: `src/components/filters/site-picker.tsx`, `src/components/filters/range-picker.tsx`
- Create: `src/lib/url/search-params.ts`
- Create: `src/app/(app)/raporlar/page.tsx`, `src/app/(app)/ayarlar/page.tsx` (Spec §9 — v1'de yer tutucu)
- Modify: `src/lib/copy/tr.ts`
- Test: `src/lib/url/search-params.test.ts`, `src/components/filters/range-picker.test.tsx`

**Interfaces:**
- Consumes: Task 3'ün `copy`, Task 7'nin `RangeKey`.
- Produces:
  - `parseDashboardParams(input: Record<string, string | string[] | undefined>): { siteId: string | 'all'; range: RangeKey }`
  - `buildDashboardHref(base: string, params: { siteId?: string; range?: RangeKey }): string`
  - `<AppShell>`, `<SitePicker>`, `<RangePicker>`

**Neden URL:** site ve tarih seçimi URL'de yaşar (`?site=…&range=28d`). Böylece sayfa sunucuda render edilir, geri tuşu çalışır, kullanıcı bağlantıyı paylaşabilir ve istemcide durum yönetimi gerekmez.

- [ ] **Step 1: Parametre testini yaz (başarısız olacak)**

`src/lib/url/search-params.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildDashboardHref, parseDashboardParams } from './search-params'

describe('parseDashboardParams', () => {
  it('varsayılan olarak tüm siteler ve son 28 gün seçilir', () => {
    expect(parseDashboardParams({})).toEqual({ siteId: 'all', range: '28d' })
  })

  it('geçerli değerleri okur', () => {
    expect(parseDashboardParams({ site: 'abc', range: '7d' })).toEqual({ siteId: 'abc', range: '7d' })
  })

  it('bilinmeyen aralığı varsayılana çevirir', () => {
    expect(parseDashboardParams({ range: 'hepsi' }).range).toBe('28d')
  })

  it('dizi gelen parametrede ilk değeri alır', () => {
    expect(parseDashboardParams({ range: ['7d', '3m'] }).range).toBe('7d')
  })
})

describe('buildDashboardHref', () => {
  it('yalnızca verilen parametreleri yazar', () => {
    expect(buildDashboardHref('/genel-bakis', { range: '3m' })).toBe('/genel-bakis?range=3m')
  })

  it('tüm siteler seçiliyken site parametresini yazmaz', () => {
    expect(buildDashboardHref('/genel-bakis', { siteId: 'all', range: '7d' })).toBe('/genel-bakis?range=7d')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/lib/url/search-params.test.ts`
Expected: FAIL — `./search-params` modülü yok.

- [ ] **Step 3: `src/lib/url/search-params.ts` yaz**

```ts
import type { RangeKey } from '@/lib/date/period'

const RANGES: readonly RangeKey[] = ['7d', '28d', '3m']
export const DEFAULT_RANGE: RangeKey = '28d'
export const ALL_SITES = 'all'

type ParamValue = string | string[] | undefined

const first = (value: ParamValue): string | undefined => (Array.isArray(value) ? value[0] : value)

export function parseDashboardParams(input: Record<string, ParamValue>): { siteId: string; range: RangeKey } {
  const range = first(input.range)
  return {
    siteId: first(input.site) ?? ALL_SITES,
    range: RANGES.includes(range as RangeKey) ? (range as RangeKey) : DEFAULT_RANGE,
  }
}

export function buildDashboardHref(base: string, params: { siteId?: string; range?: RangeKey }): string {
  const search = new URLSearchParams()
  if (params.siteId && params.siteId !== ALL_SITES) search.set('site', params.siteId)
  if (params.range) search.set('range', params.range)
  const query = search.toString()
  return query ? `${base}?${query}` : base
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/lib/url/search-params.test.ts`
Expected: PASS

- [ ] **Step 5: Tasarım sistemi primitiflerini kur**

```bash
pnpm dlx shadcn@latest init
```

```bash
pnpm dlx shadcn@latest add button card select tabs table badge tooltip skeleton separator input
```

- [ ] **Step 6: Tarih seçici testini yaz**

`src/components/filters/range-picker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RangePicker } from './range-picker'

vi.mock('next/navigation', () => ({
  usePathname: () => '/genel-bakis',
  useSearchParams: () => new URLSearchParams('range=28d'),
}))

describe('RangePicker', () => {
  it('seçenekleri insan diliyle gösterir', () => {
    render(<RangePicker />)
    expect(screen.getByRole('link', { name: 'Son 7 Gün' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Son 28 Gün' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Son 3 Ay' })).toBeDefined()
  })

  it('seçili aralığı işaretler', () => {
    render(<RangePicker />)
    expect(screen.getByRole('link', { name: 'Son 28 Gün' }).getAttribute('aria-current')).toBe('page')
  })
})
```

- [ ] **Step 7: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/components/filters/range-picker.test.tsx`
Expected: FAIL — `./range-picker` modülü yok.

- [ ] **Step 8: Metinleri ekle ve bileşenleri yaz**

`src/lib/copy/tr.ts` içine:

```ts
  filters: {
    allSites: 'Tüm Siteler',
    sitePickerLabel: 'Web sitesi seçin',
    rangeLabel: 'Tarih aralığı',
    ranges: { '7d': 'Son 7 Gün', '28d': 'Son 28 Gün', '3m': 'Son 3 Ay' },
  },
  common: {
    noData: '—',
    helpLabel: 'Bu nedir?',
    other: 'Diğer',
    comingSoon: 'Bu bölüm yakında kullanıma açılacak.',
  },
```

`common` bloğu bir kez burada tanımlanır; sonraki task'ler yalnızca içine satır ekler, bloğu yeniden yazmaz.

`src/components/filters/range-picker.tsx` — üç `next/link` bağlantısı üretir, her biri `buildDashboardHref` ile mevcut yolu ve site seçimini korur; seçili olana `aria-current="page"` verir. Metinler `copy.filters.ranges` üzerinden gelir (düz metin yazmak lint hatasıdır).

`src/components/filters/site-picker.tsx` — `Tüm Siteler` dahil site listesini `Select` içinde gösterir; seçim değişince `router.push(buildDashboardHref(...))`.

`src/components/app-shell/sidebar.tsx` — `copy.nav` üzerinden sekiz bağlantı. `src/app/(app)/layout.tsx` sidebar + topbar + içerik ızgarasını kurar.

`Raporlar` ve `Ayarlar` Spec §9 gereği v1'de içerik taşımaz; `src/app/(app)/raporlar/page.tsx` ve `src/app/(app)/ayarlar/page.tsx` yalnızca başlık ve `copy.common.comingSoon` metnini basar. Sidebar'da kırık bağlantı bırakmamak için bu iki dosya bu adımda oluşturulur. `copy.common` içine `comingSoon: 'Bu bölüm yakında kullanıma açılacak.'` ekle.

- [ ] **Step 9: Testleri ve lint'i çalıştır**

Run: `pnpm test src/components; if ($?) { pnpm lint }`
Expected: PASS ve lint temiz (düz metin kalmadığını doğrular).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: uygulama kabugu ve filtreler"
```

---

### Task 19: KPI kartları

**Files:**
- Create: `src/components/metrics/kpi-card.tsx`, `src/components/metrics/kpi-row.tsx`, `src/components/metrics/delta-badge.tsx`
- Test: `src/components/metrics/kpi-card.test.tsx`

**Interfaces:**
- Consumes: Task 4'ün biçimleyicileri, Task 7'nin `Trend`, Task 3'ün `copy.metrics`.
- Produces:
  - `<KpiCard label help value trend valueKind={'count' | 'rate' | 'rank'} />`
  - `<KpiRow overview={Overview} />` — dört kartı Spec §5.4 sırasında dizer

- [ ] **Step 1: Kart testini yaz (başarısız olacak)**

`src/components/metrics/kpi-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiCard } from './kpi-card'

const trend = { current: 128420, previous: 114000, absoluteChange: 14420, relativeChange: 0.124, sentiment: 'good' } as const

describe('KpiCard', () => {
  it('sayıyı Türkçe biçimde gösterir', () => {
    render(<KpiCard label="Tıklamalar" help="Açıklama" value={128420} valueKind="count" trend={trend} />)
    expect(screen.getByText('128.420')).toBeDefined()
  })

  it('değişimi yüzde olarak ve yön işaretiyle gösterir', () => {
    render(<KpiCard label="Tıklamalar" help="Açıklama" value={128420} valueKind="count" trend={trend} />)
    expect(screen.getByText('%12,4')).toBeDefined()
    expect(screen.getByLabelText('Geçen döneme göre arttı')).toBeDefined()
  })

  it('sıralama iyileşmesini olumlu gösterir', () => {
    const rank = { current: 7.2, previous: 8.4, absoluteChange: -1.2, relativeChange: -0.14, sentiment: 'good' } as const
    render(<KpiCard label="Ortalama Google Sırası" help="Açıklama" value={7.2} valueKind="rank" trend={rank} />)
    expect(screen.getByText('7,2')).toBeDefined()
    expect(screen.getByLabelText('Geçen döneme göre iyileşti')).toBeDefined()
  })

  it('veri yoksa çizgi gösterir, sıfır göstermez', () => {
    const empty = { current: null, previous: null, absoluteChange: null, relativeChange: null, sentiment: 'neutral' } as const
    render(<KpiCard label="Tıklama Oranı" help="Açıklama" value={null} valueKind="rate" trend={empty} />)
    expect(screen.getByText('—')).toBeDefined()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/components/metrics/kpi-card.test.tsx`
Expected: FAIL — `./kpi-card` modülü yok.

- [ ] **Step 3: Değişim metinlerini sözlüğe ekle**

```ts
  delta: {
    increased: 'Geçen döneme göre arttı',
    decreased: 'Geçen döneme göre azaldı',
    improved: 'Geçen döneme göre iyileşti',
    worsened: 'Geçen döneme göre geriledi',
    unchanged: 'Geçen döneme göre değişmedi',
    noComparison: 'Karşılaştırma için yeterli geçmiş veri yok',
  },
```

`common` bloğu Task 18'de tanımlandı; burada yalnızca `delta` eklenir.

- [ ] **Step 4: `delta-badge.tsx` ve `kpi-card.tsx` yaz**

`delta-badge.tsx` — `Trend` ve `lowerIsBetter` alır; oku (`↑`/`↓`) ve `formatDelta` çıktısını basar, `aria-label`'ı `copy.delta` içinden seçer. `relativeChange` `null` ise `copy.delta.noComparison` metnini gösterir ve okla uğraşmaz.

`kpi-card.tsx` — `Card` içinde etiket, `Tooltip` ile `?` açıklaması, biçimlenmiş değer ve `DeltaBadge`. Değer `null` ise `copy.common.noData`. Biçim seçimi:

```ts
const FORMATTERS = {
  count: formatCount,
  rate: formatRate,
  rank: formatRank,
} as const
```

`kpi-row.tsx` — `Overview` alır, dört kartı Spec §5.4 sırasıyla dizer: Tıklamalar, Google'da Görüntülenme, Tıklama Oranı, Ortalama Google Sırası. Yalnızca son kart `lowerIsBetter`.

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/components/metrics`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: kpi kartlari ve degisim rozeti"
```

---

### Task 20: Performans grafiği

**Files:**
- Create: `src/components/metrics/performance-chart.tsx`
- Test: `src/components/metrics/performance-chart.test.tsx`

**Interfaces:**
- Consumes: Task 15'in `series`, Task 4'ün biçimleyicileri.
- Produces: `<PerformanceChart points={DailyPoint[]} />` — Tıklamalar / Görüntülenmeler sekmeli tek çizgi grafiği

- [ ] **Step 1: Grafik testini yaz (başarısız olacak)**

`src/components/metrics/performance-chart.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PerformanceChart } from './performance-chart'

const points = [
  { date: '2026-08-01', clicks: 100, impressions: 4000 },
  { date: '2026-08-02', clicks: 120, impressions: 4300 },
]

describe('PerformanceChart', () => {
  it('varsayılan olarak tıklamaları gösterir', () => {
    render(<PerformanceChart points={points} />)
    expect(screen.getByRole('tab', { name: 'Tıklamalar', selected: true })).toBeDefined()
  })

  it('görüntülenmelere geçilebilir', async () => {
    render(<PerformanceChart points={points} />)
    await userEvent.click(screen.getByRole('tab', { name: "Google'da Görüntülenme" }))
    expect(screen.getByRole('tab', { name: "Google'da Görüntülenme", selected: true })).toBeDefined()
  })

  it('veri yoksa açıklayıcı mesaj gösterir', () => {
    render(<PerformanceChart points={[]} />)
    expect(screen.getByText('Bu dönem için henüz veri yok.')).toBeDefined()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/components/metrics/performance-chart.test.tsx`
Expected: FAIL — `./performance-chart` modülü yok.

- [ ] **Step 3: Metni ekle ve bileşeni yaz**

```bash
pnpm add recharts
```

`copy` içine: `chart: { title: 'Google Performansı', empty: 'Bu dönem için henüz veri yok.' }`.

`performance-chart.tsx` — `'use client'`. `Tabs` ile iki sekme (`copy.metrics.clicks.label`, `copy.metrics.views.label`), altında `ResponsiveContainer` + `LineChart`. Eksen etiketleri `formatCompactCount`, ipucu `formatCount`. `points.length === 0` ise `copy.chart.empty`.

Grafik istemci bileşenidir ama veri sunucudan hazır gelir — grafik hiçbir zaman kendi veri çağrısını yapmaz.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/components/metrics/performance-chart.test.tsx`
Expected: PASS. Recharts jsdom'da genişlik ölçemezse `ResponsiveContainer`'a test için sabit `width`/`height` ver.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: performans grafigi"
```

---

### Task 21: Durum özeti bileşeni ve Genel Bakış sayfası

**Files:**
- Create: `src/features/insights/insight-list.tsx`, `src/features/insights/insight-text.ts`
- Create: `src/app/(app)/genel-bakis/page.tsx`
- Test: `src/features/insights/insight-text.test.ts`

**Interfaces:**
- Consumes: Task 17'nin `Insight`, Task 15'in `performanceService`, Task 18–20 bileşenleri.
- Produces:
  - `insightText(insight: Insight): string` — `Insight` → kullanıcı cümlesi
  - `<InsightList insights={Insight[]} />`
  - `/genel-bakis` sunucu bileşeni

- [ ] **Step 1: Metin üretme testini yaz (başarısız olacak)**

`src/features/insights/insight-text.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { insightText } from './insight-text'

describe('insightText', () => {
  it('tıklama artışını cümleye çevirir', () => {
    expect(
      insightText({ kind: 'clicks_change', direction: 'up', siteId: 's', href: '/site/s', values: { site: 'example.de', change: 0.24 } }),
    ).toBe('example.de tıklamaları %24 arttı.')
  })

  it('sıralama gerilemesini cümleye çevirir', () => {
    expect(
      insightText({ kind: 'position_change', direction: 'down', siteId: 's', href: '/site/s', values: { site: 'example.es', from: 6.2, to: 11.8 } }),
    ).toBe("example.es Google sıralaması 6,2'ten 11,8'e geriledi.")
  })

  it('veri gecikmesini cümleye çevirir', () => {
    expect(
      insightText({ kind: 'stale_data', direction: 'warning', siteId: 's', href: '/site/s', values: { site: 'shop.example.com', days: 2 } }),
    ).toBe('shop.example.com için 2 gündür yeni veri gelmiyor.')
  })

  it('bağlantı uyarısını cümleye çevirir', () => {
    expect(
      insightText({ kind: 'needs_reconnect', direction: 'warning', siteId: 's', href: '/site/s', values: { site: 'example.com' } }),
    ).toBe('example.com için Google bağlantınızı yenilemeniz gerekiyor.')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/features/insights/insight-text.test.ts`
Expected: FAIL — `./insight-text` modülü yok.

- [ ] **Step 3: `src/features/insights/insight-text.ts` yaz**

```ts
import { copy } from '@/lib/copy'
import { formatCount, formatDelta, formatRank } from '@/lib/format/number'
import type { Insight } from '@/lib/insights/types'

const str = (value: string | number | undefined) => String(value ?? '')
const num = (value: string | number | undefined) => Number(value ?? 0)

export function insightText(insight: Insight): string {
  const { values } = insight
  const site = str(values.site)

  switch (insight.kind) {
    case 'needs_reconnect':
      return copy.insights.needsReconnect(site)
    case 'stale_data':
      return copy.insights.staleData(site, formatCount(num(values.days)))
    case 'clicks_change':
      return insight.direction === 'up'
        ? copy.insights.clicksUp(site, formatDelta(num(values.change)))
        : copy.insights.clicksDown(site, formatDelta(num(values.change)))
    case 'position_change':
      return insight.direction === 'up'
        ? copy.insights.rankUp(site, formatRank(num(values.from)), formatRank(num(values.to)))
        : copy.insights.rankDown(site, formatRank(num(values.from)), formatRank(num(values.to)))
    case 'query_breakout':
      return copy.insights.queryBreakout(str(values.query))
  }
}
```

Testteki `%24` beklentisi `formatDelta(0.24)` çıktısıyla uyuşmuyorsa (`%24` yerine `%24,0` gelebilir) testi gerçek çıktıya göre düzelt — biçim kararı Task 4'e aittir, burada yeniden tanımlanmaz.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/features/insights/insight-text.test.ts`
Expected: PASS

- [ ] **Step 5: `<InsightList>` ve Genel Bakış sayfasını yaz**

`insight-list.tsx` — `copy.insights.title` başlığı, her içgörü bir `Link`; yön simgesi `↑` / `↓` / `⚠`, `sentiment`'e göre renk. Liste boşsa `copy.insights.empty`.

`src/app/(app)/genel-bakis/page.tsx` — sunucu bileşeni:

```tsx
export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { siteId, range } = parseDashboardParams(await searchParams)
  const session = await requireSession()
  const scope = siteId === ALL_SITES ? { kind: 'all' as const, userId: session.userId } : { kind: 'site' as const, siteId }
  const period = resolvePeriod(range, new Date())

  const [overview, insights] = await Promise.all([
    performanceService.getOverview(scope, period),
    insightsService.forUser(session.userId, period),
  ])

  return (
    <>
      <KpiRow overview={overview} />
      <PerformanceChart points={overview.series} />
      <InsightList insights={insights} />
    </>
  )
}
```

Sayfa yalnızca veri toplar ve bileşen dizer — hesaplama yoktur.

- [ ] **Step 6: Testleri, tipleri ve lint'i çalıştır**

Run: `pnpm typecheck; if ($?) { pnpm lint; if ($?) { pnpm test } }`
Expected: hepsi yeşil.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: durum ozeti ve genel bakis sayfasi"
```

---

### Task 22: Web Sitelerim ekranı

**Files:**
- Create: `src/features/sites/site-card.tsx`, `src/features/sites/site-list.tsx`, `src/features/sites/view-toggle.tsx`
- Create: `src/app/(app)/sitelerim/page.tsx`
- Create: `src/server/services/sites.service.ts`
- Test: `src/features/sites/site-list.test.tsx`, `src/server/services/sites.service.test.ts`

**Interfaces:**
- Consumes: Task 10'un `deriveSiteStatus`, Task 15'in `performanceService`, Task 4'ün `formatLastUpdate`.
- Produces:
  - `type SiteSummary = { id: string; displayName: string; clicks: number; impressions: number; clicksTrend: Trend; status: SiteStatusView; lastDataAt: Date | null }`
  - `sitesService.listSummaries(userId, period): Promise<SiteSummary[]>`
  - `<SiteList sites={SiteSummary[]} view={'cards' | 'table'} />`

- [ ] **Step 1: Servis testini yaz (başarısız olacak)**

`src/server/services/sites.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listForUser = vi.fn()
const totalsForMany = vi.fn()
vi.mock('@/server/repositories/sites.repo', () => ({ sitesRepo: { listForUser } }))
vi.mock('@/server/repositories/metrics-read.repo', () => ({ metricsReadRepo: { totalsForMany } }))

const { sitesService } = await import('./sites.service')

beforeEach(() => {
  vi.clearAllMocks()
  listForUser.mockResolvedValue([
    { id: 'a', displayName: 'example.com', stage: 'ready', lastErrorCode: null, consecutiveFailures: 0, lastSuccessAt: new Date('2026-08-19T10:42:00Z') },
  ])
})

describe('listSummaries', () => {
  it('her site için tek sorguda toplam çeker', async () => {
    totalsForMany.mockResolvedValue(new Map([['a', { clicks: 10, impressions: 100, clickRate: 0.1, rank: 5 }]]))
    await sitesService.listSummaries('user-1', { from: '2026-07-20', to: '2026-08-16' })
    expect(totalsForMany).toHaveBeenCalledTimes(2)
  })

  it('veri olmayan siteyi listeden düşürmez', async () => {
    totalsForMany.mockResolvedValue(new Map())
    const [summary] = await sitesService.listSummaries('user-1', { from: '2026-07-20', to: '2026-08-16' })
    expect(summary?.clicks).toBe(0)
    expect(summary?.status.status).toBe('fresh')
  })
})
```

`totalsForMany` iki kez çağrılır: mevcut ve önceki dönem için. **Site başına ayrı sorgu atılmaz** — 50 siteli bir kullanıcıda 100 sorgu yerine 2 sorgu çalışır.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/services/sites.service.test.ts`
Expected: FAIL — `./sites.service` modülü yok.

- [ ] **Step 3: `metricsReadRepo.totalsForMany` ekle**

`src/server/repositories/metrics-read.repo.ts` içine — kullanıcının tüm siteleri için `GROUP BY site_id` ile tek sorgu, sonucu `Map<siteId, Totals>` olarak döndürür:

```ts
  async totalsForMany(userId: string, period: Period): Promise<Map<string, Totals>> {
    const rows = await db
      .select({
        siteId: dailyTotals.siteId,
        clicks: sql<number>`sum(${dailyTotals.clicks})::int`,
        impressions: sql<number>`sum(${dailyTotals.impressions})::int`,
        weightedPosition: sql<number>`sum(${dailyTotals.position} * ${dailyTotals.impressions})::float8`,
      })
      .from(dailyTotals)
      .innerJoin(sites, eq(sites.id, dailyTotals.siteId))
      .where(and(eq(sites.userId, userId), between(dailyTotals.date, period.from, period.to)))
      .groupBy(dailyTotals.siteId)

    return new Map(
      rows.map((row) => [
        row.siteId,
        {
          clicks: row.clicks,
          impressions: row.impressions,
          clickRate: row.impressions === 0 ? null : row.clicks / row.impressions,
          rank: row.impressions === 0 ? null : row.weightedPosition / row.impressions,
        },
      ]),
    )
  },
```

- [ ] **Step 4: `src/server/services/sites.service.ts` yaz**

Siteleri listeler, iki dönem toplamını `totalsForMany` ile çeker, `compareMetric` ile karşılaştırır, `deriveSiteStatus` ile durumu türetir ve `SiteSummary[]` döndürür. Veri bulunmayan site için sıfır toplam kullanılır.

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/services/sites.service.test.ts`
Expected: PASS

- [ ] **Step 6: Liste bileşeni testini yaz ve bileşenleri yaz**

`src/features/sites/site-list.test.tsx` — kart görünümünde site adının, biçimlenmiş tıklama sayısının, durum rozetinin ve `Detayları Gör` bağlantısının bulunduğunu; tablo görünümünde aynı verinin `role="table"` içinde geldiğini doğrula.

`copy` içine:

```ts
  sites: {
    title: 'Web Sitelerim',
    addAction: '+ Site Ekle',
    searchPlaceholder: 'Web sitesi arayın',
    detailAction: 'Detayları Gör',
    lastData: 'Son veri:',
    viewCards: 'Kartlar',
    viewTable: 'Tablo',
    empty: 'Henüz takip ettiğiniz bir web sitesi yok.',
  },
```

`site-card.tsx`, `site-list.tsx`, `view-toggle.tsx` ve `src/app/(app)/sitelerim/page.tsx` yaz. Görünüm tercihi de URL'de yaşar (`?gorunum=tablo`).

- [ ] **Step 7: Testleri ve lint'i çalıştır**

Run: `pnpm test src/features/sites; if ($?) { pnpm lint }`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: web sitelerim ekrani"
```

---

### Task 23: Site detayı ve boyut ekranları

**Files:**
- Create: `src/features/dimensions/dimension-table.tsx`, `src/features/dimensions/share-list.tsx`, `src/features/dimensions/query-detail-panel.tsx`
- Create: `src/app/(app)/site/[siteId]/page.tsx`
- Create: `src/app/(app)/site/[siteId]/arama-kelimeleri/page.tsx`, `.../sayfalar/page.tsx`, `.../ulkeler/page.tsx`, `.../cihazlar/page.tsx`
- Modify: `src/lib/copy/tr.ts`
- Test: `src/features/dimensions/dimension-table.test.tsx`, `src/features/dimensions/device-label.test.ts`

**Interfaces:**
- Consumes: Task 16'nın `dimensionsService`, Task 19–20 bileşenleri.
- Produces:
  - `<DimensionTable rows heading columnLabels onRowSelect? />`
  - `<ShareList rows heading />` — ülke ve cihaz için yüzde paylı liste
  - `deviceLabel(raw: string): string` — `'MOBILE'` ⇒ `'Mobil'`
  - `countryLabel(raw: string): string` — `'deu'` ⇒ `'Almanya'`

- [ ] **Step 1: Etiket testini yaz (başarısız olacak)**

`src/features/dimensions/device-label.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { countryLabel, deviceLabel } from './labels'

describe('deviceLabel', () => {
  it('cihazları Türkçeye çevirir', () => {
    expect(deviceLabel('MOBILE')).toBe('Mobil')
    expect(deviceLabel('DESKTOP')).toBe('Bilgisayar')
    expect(deviceLabel('TABLET')).toBe('Tablet')
  })

  it('bilinmeyen cihaz için ham değeri sızdırmaz', () => {
    expect(deviceLabel('SMART_TV')).toBe('Diğer')
  })
})

describe('countryLabel', () => {
  it('ülke kodunu Türkçe adına çevirir', () => {
    expect(countryLabel('deu')).toBe('Almanya')
    expect(countryLabel('tur')).toBe('Türkiye')
  })

  it('bilinmeyen kod için ham kodu göstermez', () => {
    expect(countryLabel('zzz')).toBe('Diğer')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/features/dimensions/device-label.test.ts`
Expected: FAIL — `./labels` modülü yok.

- [ ] **Step 3: `src/features/dimensions/labels.ts` yaz**

```ts
import { copy } from '@/lib/copy'

const DEVICES: Record<string, string> = {
  MOBILE: copy.devices.mobile,
  DESKTOP: copy.devices.desktop,
  TABLET: copy.devices.tablet,
}

const regionNames = new Intl.DisplayNames(['tr'], { type: 'region' })

const ALPHA3_TO_ALPHA2: Record<string, string> = { deu: 'DE', tur: 'TR', aut: 'AT', che: 'CH', usa: 'US', gbr: 'GB', fra: 'FR', nld: 'NL' }

export function deviceLabel(raw: string): string {
  return DEVICES[raw.toUpperCase()] ?? copy.common.other
}

export function countryLabel(raw: string): string {
  const alpha2 = ALPHA3_TO_ALPHA2[raw.toLowerCase()]
  if (!alpha2) return copy.common.other
  try {
    return regionNames.of(alpha2) ?? copy.common.other
  } catch {
    return copy.common.other
  }
}
```

Google ülkeyi üç harfli kodla döndürür; kullanıcıya `deu` göstermek Spec §4.1'in ihlalidir. Listede olmayan kod ham hâliyle sızmaz, `Diğer` olur. `ALPHA3_TO_ALPHA2` tablosuna yeni ülke eklemek tek satırlık bir iştir.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/features/dimensions/device-label.test.ts`
Expected: PASS

- [ ] **Step 5: Boyut metinlerini ekle**

```ts
  dimensions: {
    queriesHeading: 'İnsanlar sizi hangi kelimelerle buluyor?',
    pagesHeading: "Google'dan en çok ziyaret alan sayfalar",
    countriesHeading: 'Ziyaretçileriniz nereden geliyor?',
    devicesHeading: 'Ziyaretçiler hangi cihazları kullanıyor?',
    columns: { term: 'Arama', page: 'Sayfa', views: "Google'da Görünme", clicks: 'Tıklama', rank: 'Sıra', share: 'Pay' },
    empty: 'Bu dönem için gösterilecek veri yok.',
  },
  devices: { mobile: 'Mobil', desktop: 'Bilgisayar', tablet: 'Tablet' },
```

Ayrıca Task 19'da eklenen `common` bloğunu yeniden tanımlama — yalnızca içine `other: 'Diğer'` satırını ekle.

- [ ] **Step 6: Tablo testini yaz ve bileşenleri yaz**

`dimension-table.test.tsx` — başlığın `copy.dimensions.queriesHeading` olduğunu, sayıların Türkçe biçimlendiğini, satır boşken `copy.dimensions.empty` gösterildiğini doğrula.

`dimension-table.tsx` — `Table` ile başlık + satırlar; satıra tıklanınca `onRowSelect` çağrılır. `share-list.tsx` — ülke/cihaz için ad, tıklama sayısı ve yüzde payı; yatay bir oran çubuğu. `query-detail-panel.tsx` — seçilen kelimenin dönem karşılaştırmalı özeti (Spec §10 sonundaki panel).

Dört alt sayfa aynı şablonu kullanır; her biri yalnızca `dimensionsService.getTop(...)` çağrısının boyutunu ve başlığı değiştirir.

- [ ] **Step 7: Site detay sayfasını yaz**

`src/app/(app)/site/[siteId]/page.tsx` — üstte site adı ve `formatLastUpdate` ile son veri zamanı, `RangePicker`, `KpiRow`, `PerformanceChart`, ardından dört boyutun ilk beş satırı ve "tümünü gör" bağlantıları.

- [ ] **Step 8: Testleri, tipleri ve lint'i çalıştır**

Run: `pnpm typecheck; if ($?) { pnpm lint; if ($?) { pnpm test } }`
Expected: hepsi yeşil.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: site detayi ve boyut ekranlari"
```

---

### Task 24: Bağlanma akışı ve hazırlanıyor ekranı

**Files:**
- Create: `src/app/(auth)/baglan/page.tsx`, `src/app/(app)/siteler/sec/page.tsx`, `src/app/(app)/siteler/hazirlaniyor/page.tsx`
- Create: `src/features/onboarding/connect-card.tsx`, `src/features/onboarding/site-selection-form.tsx`, `src/features/onboarding/preparation-steps.tsx`
- Create: `src/features/onboarding/actions.ts`, `src/server/services/onboarding.service.ts`
- Test: `src/server/services/onboarding.service.test.ts`, `src/features/onboarding/preparation-steps.test.tsx`

**Interfaces:**
- Consumes: Task 8'in oturumu, Task 9'un `listSites`, Task 13'ün `startHistorySync`.
- Produces:
  - `onboardingService.discoverSites(userId): Promise<Array<{ property: string; displayName: string; alreadyAdded: boolean }>>`
  - `onboardingService.addSites(userId, properties: string[]): Promise<string[]>` — eklenen site kimlikleri
  - `onboardingService.preparationProgress(siteIds: string[]): Promise<Array<{ siteId: string; stage: PreparationStage }>>`
  - `<PreparationSteps stage={PreparationStage} />`

- [ ] **Step 1: Servis testini yaz (başarısız olacak)**

`src/server/services/onboarding.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listSites = vi.fn()
const insertMany = vi.fn()
const listForUser = vi.fn()
const startHistorySync = vi.fn()

vi.mock('@/server/gsc/client', () => ({ createGscClient: vi.fn(async () => ({ listSites })) }))
vi.mock('@/server/repositories/sites.repo', () => ({ sitesRepo: { insertMany, listForUser } }))
vi.mock('@/server/repositories/connections.repo', () => ({
  connectionsRepo: { findActiveForUser: vi.fn(async () => ({ id: 'conn-1' })) },
}))
vi.mock('@/server/sync/history-sync', () => ({ startHistorySync }))

const { onboardingService } = await import('./onboarding.service')

beforeEach(() => {
  vi.clearAllMocks()
  listForUser.mockResolvedValue([{ gscProperty: 'https://example.com/' }])
})

describe('discoverSites', () => {
  it('zaten eklenmiş siteleri işaretler', async () => {
    listSites.mockResolvedValue([
      { property: 'https://example.com/', permissionLevel: 'siteOwner' },
      { property: 'https://example.de/', permissionLevel: 'siteOwner' },
    ])
    const found = await onboardingService.discoverSites('user-1')
    expect(found).toEqual([
      { property: 'https://example.com/', displayName: 'example.com', alreadyAdded: true },
      { property: 'https://example.de/', displayName: 'example.de', alreadyAdded: false },
    ])
  })

  it('alan adı biçimindeki siteleri de okunabilir gösterir', async () => {
    listSites.mockResolvedValue([{ property: 'sc-domain:example.com', permissionLevel: 'siteOwner' }])
    const [found] = await onboardingService.discoverSites('user-1')
    expect(found?.displayName).toBe('example.com')
  })
})

describe('addSites', () => {
  it('eklenen her site için geçmiş veri toplamayı başlatır', async () => {
    insertMany.mockResolvedValue([{ id: 'site-1' }, { id: 'site-2' }])
    await onboardingService.addSites('user-1', ['https://a.com/', 'https://b.com/'])
    expect(startHistorySync).toHaveBeenCalledTimes(2)
  })

  it('boş seçimde hiçbir iş başlatmaz', async () => {
    insertMany.mockResolvedValue([])
    await onboardingService.addSites('user-1', [])
    expect(startHistorySync).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/server/services/onboarding.service.test.ts`
Expected: FAIL — `./onboarding.service` modülü yok.

- [ ] **Step 3: `src/server/services/onboarding.service.ts` yaz**

`displayName` üretimi kritiktir — kullanıcı `sc-domain:example.com` ya da `https://example.com/` görmemelidir:

```ts
export function toDisplayName(property: string): string {
  if (property.startsWith('sc-domain:')) return property.slice('sc-domain:'.length)
  try {
    return new URL(property).host
  } catch {
    return property
  }
}
```

`discoverSites` bağlantıdan site listesini çeker, kullanıcının mevcut sitelerine göre `alreadyAdded` işaretler. `addSites` seçilenleri `sitesRepo.insertMany` ile yazar ve her biri için `startHistorySync` çağırır.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/server/services/onboarding.service.test.ts`
Expected: PASS

- [ ] **Step 5: Hazırlık adımları testini yaz**

`src/features/onboarding/preparation-steps.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreparationSteps } from './preparation-steps'

describe('PreparationSteps', () => {
  it('tamamlanan adımları işaretler', () => {
    render(<PreparationSteps stage="fetching_history" />)
    expect(screen.getByText('Google bağlantısı kontrol edildi').getAttribute('data-done')).toBe('true')
    expect(screen.getByText('Dashboard hazır').getAttribute('data-done')).toBe('false')
  })

  it('tamamlandığında dashboard bağlantısını gösterir', () => {
    render(<PreparationSteps stage="ready" />)
    expect(screen.getByRole('link', { name: "Dashboard'a Git" })).toBeDefined()
  })

  it('teknik ayrıntıları varsayılan olarak gizler', () => {
    render(<PreparationSteps stage="fetching_history" />)
    expect(screen.getByText('Teknik detayları göster').closest('details')?.hasAttribute('open')).toBe(false)
  })
})
```

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/features/onboarding/preparation-steps.test.tsx`
Expected: FAIL — `./preparation-steps` modülü yok.

- [ ] **Step 7: Metinleri ekle ve akışı yaz**

```ts
  onboarding: {
    connectTitle: 'Search Performance',
    connectAction: "Google Search Console'u Bağla",
    connectNote: 'Google hesabınızdan yalnızca Search Console performans verileri okunur.',
    connectedTitle: 'Google hesabınız başarıyla bağlandı',
    selectTitle: 'Takip etmek istediğiniz web sitelerini seçin.',
    foundCount: (count: string) => `${count} web sitesi bulundu.`,
    addAction: 'Seçilen Siteleri Ekle',
    preparingTitle: (site: string) => `${site} hazırlanıyor...`,
    steps: {
      connecting: 'Google bağlantısı kontrol edildi',
      discovering: 'Web sitesi bulundu',
      fetchingHistory: 'Geçmiş performans verileri alındı',
      ready: 'Dashboard hazır',
    },
    goToDashboard: "Dashboard'a Git",
    technicalDetails: 'Teknik detayları göster',
  },
```

`preparation-steps.tsx` — dört adımı sabit sırada basar, mevcut `stage`'e kadar olanlara `data-done="true"` verir. `stage === 'ready'` ise `Dashboard'a Git` bağlantısı. Ham günlükler `<details>` içinde kalır ve varsayılan olarak kapalıdır.

`hazirlaniyor/page.tsx` — istemci bileşeni her 2 saniyede `onboardingService.preparationProgress`'i çağıran bir sunucu eylemini yoklar; tüm siteler `ready` olunca yoklama durur. Uzun süreli bağlantı (SSE/WebSocket) kurulmaz — hazırlık dakikalar sürer ve 2 saniyelik yoklama hem yeterli hem de ölçeklenmesi bedavadır.

`site-selection-form.tsx` — çoklu seçim listesi + `addSites` sunucu eylemi.

- [ ] **Step 8: Testleri, tipleri ve lint'i çalıştır**

Run: `pnpm typecheck; if ($?) { pnpm lint; if ($?) { pnpm test } }`
Expected: hepsi yeşil.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: baglanma akisi ve hazirlaniyor ekrani"
```

---

## Faz 7 — Kapanış

### Task 25: Hata yüzeyleri ve yeniden bağlanma

**Files:**
- Create: `src/features/sites/status-badge.tsx`, `src/features/sites/reconnect-banner.tsx`
- Create: `src/app/(app)/error.tsx`, `src/app/(app)/not-found.tsx`
- Create: `src/features/sites/actions.ts`
- Test: `src/features/sites/status-badge.test.tsx`

**Interfaces:**
- Consumes: Task 10'un `SiteStatusView`, Task 11'in `enqueueSiteJob`.
- Produces:
  - `<StatusBadge view={SiteStatusView} />`
  - `<ReconnectBanner />`
  - `retrySiteSync(siteId: string)` — sunucu eylemi, `enqueueSiteJob({ kind: 'daily', siteId })`

- [ ] **Step 1: Rozet testini yaz (başarısız olacak)**

`src/features/sites/status-badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('güncel durumu gösterir', () => {
    render(<StatusBadge view={{ status: 'fresh', action: null }} />)
    expect(screen.getByText('Güncel')).toBeDefined()
  })

  it('bağlantı gerektiğinde yenileme düğmesi gösterir', () => {
    render(<StatusBadge view={{ status: 'needs_reconnect', action: 'reconnect' }} />)
    expect(screen.getByRole('button', { name: 'Bağlantıyı Yenile' })).toBeDefined()
  })

  it('veri alınamadığında tekrar deneme düğmesi gösterir', () => {
    render(<StatusBadge view={{ status: 'failed', action: 'retry' }} />)
    expect(screen.getByRole('button', { name: 'Tekrar Dene' })).toBeDefined()
  })

  it('güncel durumda düğme göstermez', () => {
    render(<StatusBadge view={{ status: 'fresh', action: null }} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm test src/features/sites/status-badge.test.tsx`
Expected: FAIL — `./status-badge` modülü yok.

- [ ] **Step 3: Bileşenleri ve hata sayfalarını yaz**

`status-badge.tsx` — `copy.status` üzerinden metin, `action`'a göre düğme. `reconnect-banner.tsx` — `copy.status.reconnectMessage` ve Google bağlanma bağlantısı.

`src/app/(app)/error.tsx` — hata sınırı. Kullanıcıya yalnızca:

```
Bir şeyler ters gitti. Sayfayı yenilemeyi deneyin.
[ Tekrar Dene ]
```

`error.digest` dışında hiçbir teknik ayrıntı gösterilmez; asıl hata sunucu günlüğüne yazılır.

`copy` içine `errors: { pageTitle: 'Bir şeyler ters gitti.', pageBody: 'Sayfayı yenilemeyi deneyin.', retry: 'Tekrar Dene', notFound: 'Aradığınız sayfa bulunamadı.' }`.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `pnpm test src/features/sites`
Expected: PASS

- [ ] **Step 5: Sözlük denetimini son kez çalıştır**

Run: `pnpm test src/lib/copy`
Expected: PASS — yeni eklenen tüm metinler yasaklı terim içermiyor.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: hata yuzeyleri ve yeniden baglanma"
```

---

### Task 26: Uçtan uca doğrulama

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/onboarding.spec.ts`, `tests/e2e/dashboard.spec.ts`
- Create: `tests/e2e/fixtures/google-mock.ts`, `scripts/seed-demo.ts`
- Create: `.github/workflows/ci.yml`
- Test: yukarıdaki e2e dosyaları

**Interfaces:**
- Consumes: tüm önceki task'ler.
- Produces: `pnpm e2e` betiği; CI'da lint + typecheck + test + e2e.

- [ ] **Step 1: Playwright'ı kur**

```bash
pnpm create playwright@latest --quiet --browser=chromium --no-examples
```

- [ ] **Step 2: Google'ı taklit eden fixture'ı yaz**

`tests/e2e/fixtures/google-mock.ts` — `page.route('**/webmasters/v3/**')` ile site listesi ve performans yanıtlarını sabit veriyle karşılar. Gerçek Google'a e2e sırasında hiç gidilmez.

- [ ] **Step 3: Onboarding e2e testini yaz**

`tests/e2e/onboarding.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { mockGoogle } from './fixtures/google-mock'

test('kullanıcı bağlanır, site seçer ve dashboard görür', async ({ page }) => {
  await mockGoogle(page)
  await page.goto('/baglan')

  await expect(page.getByRole('button', { name: "Google Search Console'u Bağla" })).toBeVisible()
  await page.getByRole('button', { name: "Google Search Console'u Bağla" }).click()

  await expect(page.getByText('2 web sitesi bulundu.')).toBeVisible()
  await page.getByRole('checkbox', { name: 'example.com' }).check()
  await page.getByRole('button', { name: 'Seçilen Siteleri Ekle' }).click()

  await expect(page.getByText('Dashboard hazır')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('link', { name: "Dashboard'a Git" }).click()
  await expect(page.getByText('Tıklamalar')).toBeVisible()
})
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu gör**

Run: `pnpm e2e`
Expected: FAIL — akış henüz uçtan uca bağlı değilse eksikleri gösterir; eksikleri tamamla.

- [ ] **Step 5: Dashboard e2e testini yaz**

`tests/e2e/dashboard.spec.ts` — tohum veriyle: dört KPI kartının göründüğü, tarih aralığı değişince URL'in `?range=7d` olduğu ve sayıların değiştiği, `Bugün dikkat etmeniz gerekenler` bölümünün en az bir cümle gösterdiği, hiçbir ekranda `docs/banned-ui-terms.md` listesindeki bir kelimenin görünmediği doğrulanır:

```ts
test('hiçbir ekranda teknik terim görünmez', async ({ page }) => {
  const banned = readBannedTerms()
  for (const path of ['/genel-bakis', '/sitelerim']) {
    await page.goto(path)
    const text = (await page.locator('body').innerText()).toLowerCase()
    for (const term of banned) {
      expect(text, `${path} sayfasında "${term}" görünüyor`).not.toMatch(new RegExp(`\\b${term}\\b`))
    }
  }
})
```

Bu test Spec §4.1'in son savunma hattıdır: sözlük denetimi ve lint kaçırırsa burada yakalanır.

- [ ] **Step 6: Tohum betiğini yaz**

`scripts/seed-demo.ts` — bir kullanıcı, bir bağlantı, iki site ve 120 günlük rastgele ama tutarlı ölçüm verisi yazar. E2E ve yerel geliştirme bunu kullanır.

- [ ] **Step 7: CI'yı kur**

`.github/workflows/ci.yml` — `postgres:16` ve `redis:7` servis konteynerleriyle: `pnpm install`, `pnpm db:migrate`, `pnpm exec tsx scripts/ensure-partitions.ts`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`.

- [ ] **Step 8: Tam doğrulamayı çalıştır**

Run: `pnpm lint; if ($?) { pnpm typecheck; if ($?) { pnpm test; if ($?) { pnpm e2e } } }`
Expected: dördü de yeşil.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: uctan uca dogrulama ve ci"
```

---

## Ek: Büyüme oyun kitabı

Bunların hiçbiri **şimdi** yapılmaz. Her biri bir eşiğe bağlıdır; eşik geçilmeden kod eklemek erken soyutlamadır.

| Eşik | Belirti | Yapılacak |
| ---- | ------- | --------- |
| Site sayısı > 5.000 | Günlük toplama 6 saati aşıyor | İşçi süreç sayısını artır; kuyruk zaten yatay ölçekler, kod değişmez |
| `query_daily` tek ay > 100M satır | Kelime tablosu sorguları 2 sn'yi aşıyor | Aylık bölümü haftalığa indir (`partitionRangeFor` tek dosya) |
| Genel Bakış sorgusu > 500 ms | Çok siteli 3 aylık görünüm yavaş | `daily_totals` üzerine `site_id, date` kapsamlı indeks; yetmezse aylık özet materyalize görünümü |
| Kullanıcı ikinci bir dil istiyor | — | `src/lib/copy/tr.ts` yanına `en.ts`; `copy` seçimi istekten gelir. Bileşenler değişmez |
| Google kotası dolmaya başlıyor | `rate_limited` hataları artıyor | `GOOGLE_REQUESTS_PER_SECOND` düşür; gerekirse kullanıcı başına ayrı Google projesi |
| Rapor e-postası isteniyor | — | Yeni kuyruk işi + `src/server/services/reports.service.ts`. Okuma katmanı aynen kullanılır |

**Değişmemesi gereken kararlar:** katman yönü, sözlük tekliği, idempotent yazım, ağırlıklı sıra kuralı, bölümleme anahtarının `date` olması. Bunlardan biri bozulursa sistem büyüdükçe sessizce yanlış sayı üretmeye başlar.

---

## Ek: Uygulama sırası ve bağımlılıklar

```
Task 1 ─┬─ Task 2 ─┬─ Task 5 ── Task 6 ─┬─ Task 12 ─┬─ Task 13 ── Task 14
        │          │                    │           │
        ├─ Task 3  ├─ Task 8 ── Task 9 ─┘           └─ Task 15 ─┬─ Task 16 ── Task 17
        │          │                                            │
        └─ Task 4  └─ Task 10                                    └─ Task 18 ─┬─ Task 19 ── Task 20 ── Task 21
                                                                             ├─ Task 22 ── Task 23
                                                                             └─ Task 24 ── Task 25 ── Task 26
```

Task 11 (kuyruk) Task 12'den önce gelmelidir. Task 3 ve 4 arayüz işlerinin tamamının ön koşuludur. Task 18–26 sırayla yürütülmelidir; her biri bir öncekinin bileşenlerini kullanır.
