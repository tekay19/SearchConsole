import { beforeEach, describe, expect, it, vi } from 'vitest'

const topBy = vi.fn()

vi.mock('@/server/repositories/dimensions.repo', () => ({
  dimensionsRepo: { topBy, shareOf: vi.fn() },
}))

const { DEFAULT_TOP_LIMIT, dimensionsService } = await import('./dimensions.service')

const scope = { kind: 'site', siteId: 'site-1' } as const
const period = { from: '2026-07-20', to: '2026-08-16' }

const row = (key: string, clicks: number) => ({
  key,
  clicks,
  impressions: clicks * 20,
  clickRate: 0.05,
  rank: 3.2,
})

beforeEach(() => {
  vi.clearAllMocks()
  topBy.mockResolvedValue([])
})

describe('getTop', () => {
  it('her satır için önceki dönemle karşılaştırma üretir', async () => {
    topBy.mockResolvedValueOnce([row('iphone kaufen', 1240)]).mockResolvedValueOnce([row('iphone kaufen', 1000)])

    const [result] = await dimensionsService.getTop('query', scope, period)

    expect(result?.trend.relativeChange).toBeCloseTo(0.24, 6)
    expect(result?.trend.sentiment).toBe('good')
  })

  it('önceki dönemde olmayan satır için nötr karşılaştırma verir', async () => {
    // Yeni cikan bir kelimeyi "sonsuz artis" diye gostermek yaniltici olur.
    topBy.mockResolvedValueOnce([row('yeni kelime', 10)]).mockResolvedValueOnce([])

    const [result] = await dimensionsService.getTop('query', scope, period)

    expect(result?.trend.sentiment).toBe('neutral')
    expect(result?.trend.relativeChange).toBeNull()
  })

  it('önceki dönemi aynı boyut, kapsam ve sınırla ister', async () => {
    await dimensionsService.getTop('page', scope, period, 10)
    expect(topBy).toHaveBeenNthCalledWith(2, 'page', scope, { from: '2026-06-22', to: '2026-07-19' }, 10)
  })

  it('varsayılan bir sınır uygular', async () => {
    await dimensionsService.getTop('query', scope, period)
    expect(topBy).toHaveBeenNthCalledWith(1, 'query', scope, period, DEFAULT_TOP_LIMIT)
  })

  it('mevcut dönemin sırasını korur', async () => {
    topBy.mockResolvedValueOnce([row('a', 30), row('b', 20), row('c', 10)]).mockResolvedValueOnce([row('c', 99)])

    const keys = (await dimensionsService.getTop('query', scope, period)).map((entry) => entry.key)

    expect(keys).toEqual(['a', 'b', 'c'])
  })

  it('veri yoksa boş liste döner', async () => {
    await expect(dimensionsService.getTop('device', scope, period)).resolves.toEqual([])
  })
})
