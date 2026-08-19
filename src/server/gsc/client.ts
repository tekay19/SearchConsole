import { GscError, classifyGoogleError } from './errors'
import type { GscDimension, GscRow, GscSite } from './types'

const BASE = 'https://www.googleapis.com/webmasters/v3'

/** Google'ın tek istekte döndürdüğü azami satır sayısı. */
export const PAGE_SIZE = 25_000

/**
 * Yalnızca bu üç yetki düzeyi performans verisi okuyabilir.
 * `siteUnverifiedUser` listede görünür ama sorgusu izin hatası döner;
 * kullanıcıya hiç göstermiyoruz ki ekleyip sonra hata almasın.
 */
const READABLE_PERMISSIONS = new Set(['siteOwner', 'siteFullUser', 'siteRestrictedUser'])

export type PerformanceQuery = {
  property: string
  from: string
  to: string
  dimensions: GscDimension[]
  rowLimit?: number
}

export type GscClient = {
  listSites(): Promise<GscSite[]>
  queryPerformance(input: PerformanceQuery): Promise<GscRow[]>
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

  // Google bakım sırasında HTML döndürebiliyor; gövde okunamazsa da
  // durum kodundan anlamlı bir sınıflandırma yapabiliyoruz.
  const payload: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new GscError(
      classifyGoogleError(response.status, payload),
      `Google isteği başarısız oldu (${response.status}) — ${path}`,
    )
  }

  return payload
}

/**
 * Google Search Console adaptörü.
 *
 * Sistemdeki tek dış bağımlılık burası. HTTP ayrıntısı, sayfalama ve hata
 * sınıflandırması bu dosyada kalır; dışarıya yalnızca sade tipler ve dört
 * hata kodu çıkar.
 */
export function createGscClientWithToken(accessToken: string): GscClient {
  return {
    async listSites() {
      const payload = (await call(accessToken, '/sites')) as { siteEntry?: unknown }
      const entries = Array.isArray(payload.siteEntry) ? payload.siteEntry : []

      return entries
        .map((entry) => entry as { siteUrl?: string; permissionLevel?: string })
        .filter(
          (entry): entry is { siteUrl: string; permissionLevel: string } =>
            typeof entry.siteUrl === 'string' &&
            typeof entry.permissionLevel === 'string' &&
            READABLE_PERMISSIONS.has(entry.permissionLevel),
        )
        .map((entry) => ({ property: entry.siteUrl, permissionLevel: entry.permissionLevel }))
    },

    async queryPerformance({ property, from, to, dimensions, rowLimit = PAGE_SIZE }) {
      const collected: GscRow[] = []
      let startRow = 0

      // Tam dolu sayfa geldiği sürece devam; eksik sayfa son sayfadır.
      for (;;) {
        const payload = (await call(
          accessToken,
          `/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
          {
            startDate: from,
            endDate: to,
            dimensions,
            rowLimit,
            startRow,
            // Yalnızca kesinleşmiş veri; taze günler sonradan değişiyor.
            dataState: 'final',
            type: 'web',
          },
        )) as { rows?: GscRow[] }

        const rows = payload.rows ?? []
        collected.push(...rows)

        if (rows.length < rowLimit) return collected
        startRow += rows.length
      }
    },
  }
}
