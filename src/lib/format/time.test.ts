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

  it('gün sınırını saat farkına göre değil takvime göre belirler', () => {
    // 23 saat önce ama takvimde dün.
    expect(formatLastUpdate(new Date('2026-08-18T23:30:00+03:00'), new Date('2026-08-19T00:30:00+03:00'))).toBe(
      'Dün 23:30',
    )
  })

  it('yıl değişimini doğru geçer', () => {
    expect(formatLastUpdate(new Date('2025-12-31T10:00:00+03:00'), new Date('2026-01-01T10:00:00+03:00'))).toBe(
      'Dün 10:00',
    )
  })
})
