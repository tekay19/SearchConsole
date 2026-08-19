import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryPerformance = vi.fn()
const findForSync = vi.fn()
const recordSyncSuccess = vi.fn()
const recordSyncFailure = vi.fn()
const upsertDailyTotals = vi.fn()
const upsertQueryDaily = vi.fn()

vi.mock('@/server/gsc/access-token', () => ({
  createGscClient: vi.fn(async () => ({ queryPerformance, listSites: vi.fn() })),
}))

vi.mock('@/server/repositories/sites.repo', () => ({
  sitesRepo: { findForSync, recordSyncSuccess, recordSyncFailure },
}))

vi.mock('@/server/repositories/metrics-write.repo', () => ({
  metricsWriteRepo: {
    upsertDailyTotals,
    upsertQueryDaily,
    upsertPageDaily: vi.fn(),
    upsertCountryDaily: vi.fn(),
    upsertDeviceDaily: vi.fn(),
  },
}))

const { SYNC_LOOKBACK_DAYS, runDailySync } = await import('./daily-sync')

const now = new Date('2026-08-19T04:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  queryPerformance.mockResolvedValue([])
  findForSync.mockResolvedValue({
    id: 'site-1',
    connectionId: 'conn-1',
    gscProperty: 'https://example.com/',
    lastSyncedDate: '2026-08-14',
  })
})

const firstRange = () => queryPerformance.mock.calls[0]![0] as { from: string; to: string }

describe('runDailySync', () => {
  it('son senkron tarihinden geriye güvenlik penceresi bırakır', () => {
    // Google son gunlerin verisini geriye donuk duzeltiyor; o pencereyi
    // her turda yeniden yaziyoruz.
    expect(SYNC_LOOKBACK_DAYS).toBeGreaterThanOrEqual(3)
  })

  it('pencereyi son senkron tarihinden başlatır', async () => {
    await runDailySync({ siteId: 'site-1' }, now)
    // 2026-08-14 eksi (5 - 1) gun = 2026-08-10
    expect(firstRange().from).toBe('2026-08-10')
  })

  it('dönem sonunu Google gecikmesi kadar geride tutar', async () => {
    await runDailySync({ siteId: 'site-1' }, now)
    expect(firstRange().to).toBe('2026-08-16')
  })

  it('beş boyutu da çeker', async () => {
    await runDailySync({ siteId: 'site-1' }, now)
    const dimensions = queryPerformance.mock.calls.map((call) => call[0].dimensions.join('+'))
    expect(dimensions).toEqual(
      expect.arrayContaining(['date', 'date+query', 'date+page', 'date+country', 'date+device']),
    )
  })

  it('başarıda son tarihi kaydeder', async () => {
    await runDailySync({ siteId: 'site-1' }, now)
    expect(recordSyncSuccess).toHaveBeenCalledWith('site-1', '2026-08-16')
    expect(recordSyncFailure).not.toHaveBeenCalled()
  })

  it('hiç senkron olmamışsa yalnızca gecikme penceresini çeker', async () => {
    findForSync.mockResolvedValue({
      id: 'site-1',
      connectionId: 'conn-1',
      gscProperty: 'https://example.com/',
      lastSyncedDate: null,
    })
    await runDailySync({ siteId: 'site-1' }, now)
    expect(firstRange().from).toBe('2026-08-12')
  })

  it('site yoksa sessizce çıkar', async () => {
    findForSync.mockResolvedValue(null)
    await runDailySync({ siteId: 'yok' }, now)
    expect(queryPerformance).not.toHaveBeenCalled()
    expect(recordSyncFailure).not.toHaveBeenCalled()
  })

  it('Google hatasında kodu kaydeder ve hatayı yeniden fırlatır', async () => {
    const { GscError } = await import('@/server/gsc/errors')
    queryPerformance.mockRejectedValue(new GscError('needs_reconnect', 'yetki yok'))

    await expect(runDailySync({ siteId: 'site-1' }, now)).rejects.toThrow()
    expect(recordSyncFailure).toHaveBeenCalledWith('site-1', 'needs_reconnect')
    expect(recordSyncSuccess).not.toHaveBeenCalled()
  })

  it('beklenmedik hatayı geçici sayar', async () => {
    queryPerformance.mockRejectedValue(new Error('ag kesildi'))
    await expect(runDailySync({ siteId: 'site-1' }, now)).rejects.toThrow()
    expect(recordSyncFailure).toHaveBeenCalledWith('site-1', 'unavailable')
  })

  it('veri yazılmadan başarı kaydetmez', async () => {
    upsertDailyTotals.mockRejectedValueOnce(new Error('disk dolu'))
    await expect(runDailySync({ siteId: 'site-1' }, now)).rejects.toThrow()
    expect(recordSyncSuccess).not.toHaveBeenCalled()
  })
})
