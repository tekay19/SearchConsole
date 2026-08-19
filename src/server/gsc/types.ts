/** Google'ın tanıdığı ham site adresi ("https://example.com/" veya "sc-domain:example.com"). */
export type GscSite = { property: string; permissionLevel: string }

export type GscDimension = 'date' | 'query' | 'page' | 'country' | 'device'

/**
 * Google'ın döndürdüğü ham satır. `ctr` alanı bilerek taşınır ama hiçbir
 * yerde saklanmaz; oran her zaman clicks / impressions ile yeniden hesaplanır.
 */
export type GscRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}
