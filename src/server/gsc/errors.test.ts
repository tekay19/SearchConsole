import { describe, expect, it } from 'vitest'
import { RETRYABLE, classifyGoogleError } from './errors'

describe('classifyGoogleError', () => {
  it('401 için yeniden bağlanma ister', () => {
    expect(classifyGoogleError(401, {})).toBe('needs_reconnect')
  })

  it('iptal edilmiş izni yeniden bağlanma olarak sınıflar', () => {
    expect(classifyGoogleError(403, { error: { status: 'PERMISSION_DENIED' } })).toBe('needs_reconnect')
  })

  it('kullanım sınırı aşımını hız sınırı sayar, izin sorunu saymaz', () => {
    // 403 iki farklı anlama gelir; gerekçe listesi olmadan ayırt edilemez.
    expect(classifyGoogleError(403, { error: { errors: [{ reason: 'rateLimitExceeded' }] } })).toBe('rate_limited')
    expect(classifyGoogleError(403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } })).toBe('rate_limited')
    expect(classifyGoogleError(403, { error: { errors: [{ reason: 'quotaExceeded' }] } })).toBe('rate_limited')
  })

  it('429 hız sınırıdır', () => {
    expect(classifyGoogleError(429, {})).toBe('rate_limited')
  })

  it('API etkin değilse kullanıcıyı yeniden bağlanmaya yönlendirmez', () => {
    // Bu bir kurulum hatasıdır; kullanıcı bağlantısını yenilese de düzelmez.
    // Ona yanlış iş yaptırmaktansa geçici hata deyip sessizce beklemek doğru.
    expect(
      classifyGoogleError(403, { error: { errors: [{ reason: 'accessNotConfigured' }] } }),
    ).toBe('unavailable')
  })

  it('404 bulunamadıdır', () => {
    expect(classifyGoogleError(404, {})).toBe('not_found')
  })

  it('sunucu hatalarını geçici sayar', () => {
    expect(classifyGoogleError(500, {})).toBe('unavailable')
    expect(classifyGoogleError(503, {})).toBe('unavailable')
  })

  it('bozuk gövdede çökmez', () => {
    expect(classifyGoogleError(500, null)).toBe('unavailable')
    expect(classifyGoogleError(500, 'beklenmedik')).toBe('unavailable')
    expect(classifyGoogleError(403, { error: { errors: 'dizi degil' } })).toBe('needs_reconnect')
  })

  it('yalnızca geçici hatalar yeniden denenir', () => {
    expect(RETRYABLE).toContain('rate_limited')
    expect(RETRYABLE).toContain('unavailable')
    expect(RETRYABLE).not.toContain('needs_reconnect')
  })
})
