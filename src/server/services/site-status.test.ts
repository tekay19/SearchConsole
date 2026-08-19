import { describe, expect, it } from 'vitest'
import { MAX_FAILURES_BEFORE_FAILED, STALE_AFTER_DAYS, deriveSiteStatus } from './site-status'

const now = new Date('2026-08-19T12:00:00Z')
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000)

const base = {
  stage: 'ready' as const,
  lastErrorCode: null,
  consecutiveFailures: 0,
  lastSuccessAt: hoursAgo(2),
}

describe('deriveSiteStatus', () => {
  it('her şey yolundaysa güncel gösterir', () => {
    expect(deriveSiteStatus(base, now)).toEqual({ status: 'fresh', action: null })
  })

  it('hazırlık sürüyorsa veri alınıyor gösterir', () => {
    expect(deriveSiteStatus({ ...base, stage: 'fetching_history' }, now).status).toBe('syncing')
    expect(deriveSiteStatus({ ...base, stage: 'connecting' }, now).status).toBe('syncing')
  })

  it('yetki sorununda bağlantı yenilemeye yönlendirir', () => {
    expect(deriveSiteStatus({ ...base, lastErrorCode: 'needs_reconnect', consecutiveFailures: 1 }, now)).toEqual({
      status: 'needs_reconnect',
      action: 'reconnect',
    })
  })

  it('yetki sorunu hazırlık aşamasının önüne geçer', () => {
    // Kullanıcı bir şey yapmadan ilerleyemeyiz; "veri alınıyor" demek onu bekletmek olur.
    const view = deriveSiteStatus(
      { ...base, stage: 'fetching_history', lastErrorCode: 'needs_reconnect' },
      now,
    )
    expect(view.status).toBe('needs_reconnect')
  })

  it('geçici hatada ilk denemelerde güncel kalır', () => {
    // Kuyruk zaten yeniden deniyor; kullanıcıyı her tökezlemede rahatsız etmeyiz.
    const view = deriveSiteStatus({ ...base, lastErrorCode: 'unavailable', consecutiveFailures: 2 }, now)
    expect(view.status).toBe('fresh')
  })

  it('üst üste üç başarısızlıkta veri alınamadı gösterir', () => {
    expect(
      deriveSiteStatus({ ...base, lastErrorCode: 'unavailable', consecutiveFailures: MAX_FAILURES_BEFORE_FAILED }, now),
    ).toEqual({ status: 'failed', action: 'retry' })
  })

  it('hiç başarılı veri alınmadıysa güncel demez', () => {
    expect(deriveSiteStatus({ ...base, lastSuccessAt: null }, now).status).toBe('failed')
  })

  it('veri bayatladıysa güncel demez', () => {
    // Hata sayacı sıfır olsa bile (işçi hiç çalışmamış olabilir) rozet yalan söylememeli.
    const stale = deriveSiteStatus({ ...base, lastSuccessAt: hoursAgo(STALE_AFTER_DAYS * 24 + 1) }, now)
    expect(stale).toEqual({ status: 'failed', action: 'retry' })
  })

  it('eşiğin hemen altındaki veri hâlâ günceldir', () => {
    expect(deriveSiteStatus({ ...base, lastSuccessAt: hoursAgo(STALE_AFTER_DAYS * 24 - 1) }, now).status).toBe('fresh')
  })

  it('hazırlanırken bayatlık aranmaz', () => {
    // Geçmiş veri çekilirken henüz hiç başarılı tur olmamış olabilir.
    expect(deriveSiteStatus({ ...base, stage: 'fetching_history', lastSuccessAt: null }, now).status).toBe('syncing')
  })
})
