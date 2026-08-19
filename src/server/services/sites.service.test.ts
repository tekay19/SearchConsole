import { beforeEach, describe, expect, it, vi } from 'vitest'

const listForUser = vi.fn()
const totalsForMany = vi.fn()

vi.mock('@/server/repositories/sites.repo', () => ({ sitesRepo: { listForUser } }))
vi.mock('@/server/repositories/metrics-read.repo', () => ({ metricsReadRepo: { totalsForMany } }))

const { sitesService } = await import('./sites.service')

const now = new Date('2026-08-19T12:00:00Z')
const period = { from: '2026-07-20', to: '2026-08-16' }

const dbSite = (over: Record<string, unknown> = {}) => ({
  id: 'a',
  displayName: 'example.com',
  stage: 'ready',
  lastErrorCode: null,
  consecutiveFailures: 0,
  lastSuccessAt: new Date('2026-08-19T10:42:00Z'),
  ...over,
})

const totals = (clicks: number) => ({
  clicks,
  impressions: clicks * 30,
  clickRate: 0.033,
  rank: 12,
})

beforeEach(() => {
  vi.clearAllMocks()
  listForUser.mockResolvedValue([dbSite()])
  totalsForMany.mockResolvedValue(new Map())
})

describe('listSummaries', () => {
  it('site başına ayrı sorgu atmaz', async () => {
    // 50 siteli kullanicida 100 sorgu yerine 2 sorgu calismali.
    listForUser.mockResolvedValue([dbSite({ id: 'a' }), dbSite({ id: 'b' }), dbSite({ id: 'c' })])

    await sitesService.listSummaries('user-1', period, { now })

    expect(totalsForMany).toHaveBeenCalledTimes(2)
  })

  it('mevcut ve önceki dönemi karşılaştırır', async () => {
    totalsForMany
      .mockResolvedValueOnce(new Map([['a', totals(124)]]))
      .mockResolvedValueOnce(new Map([['a', totals(100)]]))

    const [summary] = await sitesService.listSummaries('user-1', period, { now })

    expect(summary?.clicks).toBe(124)
    expect(summary?.clicksTrend.relativeChange).toBeCloseTo(0.24, 6)
  })

  it('önceki dönemi doğru aralıkla ister', async () => {
    await sitesService.listSummaries('user-1', period, { now })
    expect(totalsForMany).toHaveBeenNthCalledWith(
      2,
      'user-1',
      { from: '2026-06-22', to: '2026-07-19' },
      undefined,
    )
  })

  it('hesap seçiliyken filtreyi her sorguya taşır', async () => {
    // Bir sorguda unutulursa kullanici baska hesabinin verisini gorurdu.
    await sitesService.listSummaries('user-1', period, { now, connectionId: 'acc-1' })

    expect(listForUser).toHaveBeenCalledWith('user-1', 'acc-1')
    expect(totalsForMany).toHaveBeenNthCalledWith(1, 'user-1', period, 'acc-1')
    expect(totalsForMany).toHaveBeenNthCalledWith(
      2,
      'user-1',
      { from: '2026-06-22', to: '2026-07-19' },
      'acc-1',
    )
  })

  it('verisi olmayan siteyi listeden düşürmez', async () => {
    // Yeni eklenmis site de listede gorunmeli, yoksa kullanici
    // "eklendi mi eklenmedi mi" diye dusunur.
    const [summary] = await sitesService.listSummaries('user-1', period, { now })

    expect(summary?.clicks).toBe(0)
    expect(summary?.impressions).toBe(0)
    expect(summary?.status.status).toBe('fresh')
  })

  it('hazırlanan siteyi veri alınıyor olarak gösterir', async () => {
    listForUser.mockResolvedValue([dbSite({ stage: 'fetching_history' })])

    const [summary] = await sitesService.listSummaries('user-1', period, { now })

    expect(summary?.status.status).toBe('syncing')
  })

  it('yetki sorunlu siteyi yenilemeye yönlendirir', async () => {
    listForUser.mockResolvedValue([dbSite({ lastErrorCode: 'needs_reconnect' })])

    const [summary] = await sitesService.listSummaries('user-1', period, { now })

    expect(summary?.status).toEqual({ status: 'needs_reconnect', action: 'reconnect' })
  })

  it('son veri zamanını taşır', async () => {
    const [summary] = await sitesService.listSummaries('user-1', period, { now })
    expect(summary?.lastDataAt).toEqual(new Date('2026-08-19T10:42:00Z'))
  })
})
