import { beforeEach, describe, expect, it, vi } from 'vitest'

const totalsFor = vi.fn()
const dailySeries = vi.fn()

vi.mock('@/server/repositories/metrics-read.repo', () => ({
  metricsReadRepo: { totalsFor, dailySeries },
}))

const { performanceService } = await import('./performance.service')

const scope = { kind: 'site', siteId: 'site-1' } as const
const period = { from: '2026-07-20', to: '2026-08-16' }
const empty = { clicks: 0, impressions: 0, clickRate: null, rank: null }

beforeEach(() => {
  vi.clearAllMocks()
  dailySeries.mockResolvedValue([])
  totalsFor.mockResolvedValue(empty)
})

describe('getOverview', () => {
  it('mevcut ve önceki dönemi karşılaştırır', async () => {
    totalsFor
      .mockResolvedValueOnce({ clicks: 112, impressions: 1000, clickRate: 0.112, rank: 7.2 })
      .mockResolvedValueOnce({ clicks: 100, impressions: 900, clickRate: 0.111, rank: 8.4 })

    const overview = await performanceService.getOverview(scope, period)

    expect(overview.totals.clicks).toBe(112)
    expect(overview.trends.clicks.relativeChange).toBeCloseTo(0.12, 6)
  })

  it('sıralamada küçülmeyi iyileşme sayar', async () => {
    totalsFor
      .mockResolvedValueOnce({ clicks: 1, impressions: 1, clickRate: 1, rank: 7.2 })
      .mockResolvedValueOnce({ clicks: 1, impressions: 1, clickRate: 1, rank: 8.4 })

    expect((await performanceService.getOverview(scope, period)).trends.rank.sentiment).toBe('good')
  })

  it('önceki dönemi aynı uzunlukta ve hemen önceki aralıkla ister', async () => {
    await performanceService.getOverview(scope, period)
    expect(totalsFor).toHaveBeenNthCalledWith(2, scope, { from: '2026-06-22', to: '2026-07-19' })
  })

  it('zaman serisini yalnızca mevcut dönem için ister', async () => {
    await performanceService.getOverview(scope, period)
    expect(dailySeries).toHaveBeenCalledTimes(1)
    expect(dailySeries).toHaveBeenCalledWith(scope, period)
  })

  it('veri yoksa çökmez ve nötr karşılaştırma verir', async () => {
    const overview = await performanceService.getOverview(scope, period)
    expect(overview.trends.clickRate.sentiment).toBe('neutral')
    expect(overview.trends.rank.sentiment).toBe('neutral')
    expect(overview.series).toEqual([])
  })

  it('tüm siteler kapsamını olduğu gibi geçirir', async () => {
    const allSites = { kind: 'all', userId: 'user-1' } as const
    await performanceService.getOverview(allSites, period)
    expect(totalsFor).toHaveBeenNthCalledWith(1, allSites, period)
  })
})
