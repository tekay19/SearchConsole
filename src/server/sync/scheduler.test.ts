import { beforeEach, describe, expect, it, vi } from 'vitest'

const enqueueSiteJob = vi.fn()
const upsertJobScheduler = vi.fn()
const listSyncableIds = vi.fn()

vi.mock('./queue', () => ({
  enqueueSiteJob,
  siteQueue: { upsertJobScheduler },
}))

vi.mock('@/server/repositories/sites.repo', () => ({
  sitesRepo: { listSyncableIds },
}))

const { enqueueAllDailySyncs, registerSchedules } = await import('./scheduler')

beforeEach(() => {
  vi.clearAllMocks()
  listSyncableIds.mockResolvedValue(['a', 'b', 'c'])
})

describe('enqueueAllDailySyncs', () => {
  it('toplanabilir her site için iş ekler', async () => {
    await expect(enqueueAllDailySyncs()).resolves.toBe(3)
    expect(enqueueSiteJob).toHaveBeenCalledTimes(3)
    expect(enqueueSiteJob).toHaveBeenCalledWith({ kind: 'daily', siteId: 'a' })
  })

  it('site yoksa hiçbir şey eklemez', async () => {
    listSyncableIds.mockResolvedValue([])
    await expect(enqueueAllDailySyncs()).resolves.toBe(0)
    expect(enqueueSiteJob).not.toHaveBeenCalled()
  })
})

describe('registerSchedules', () => {
  it('günlük tur ve bakım işini kaydeder', async () => {
    await registerSchedules()
    const names = upsertJobScheduler.mock.calls.map((call) => call[0])
    expect(names).toContain('daily-fanout')
    expect(names).toContain('maintenance')
  })

  it('zamanları Türkiye saatine göre kurar', async () => {
    await registerSchedules()
    for (const [, repeat] of upsertJobScheduler.mock.calls) {
      expect(repeat.tz).toBe('Europe/Istanbul')
      expect(repeat.pattern).toMatch(/^\d+ \d+ \* \* \*$/)
    }
  })

  it('bakımı günlük turdan önce çalıştırır', async () => {
    // Bolumler acilmadan veri yazilirsa Postgres hata verir.
    await registerSchedules()
    const hourOf = (name: string) =>
      Number(
        upsertJobScheduler.mock.calls.find((call) => call[0] === name)![1].pattern.split(' ')[1],
      )
    expect(hourOf('maintenance')).toBeLessThan(hourOf('daily-fanout'))
  })
})
