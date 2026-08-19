import { describe, expect, it } from 'vitest'
import { periodLengthInDays, previousPeriod, resolvePeriod } from './period'

const today = new Date('2026-08-19T10:00:00Z')

describe('resolvePeriod', () => {
  it('son 28 günü veri gecikmesini düşerek hesaplar', () => {
    expect(resolvePeriod('28d', today)).toEqual({ from: '2026-07-20', to: '2026-08-16' })
  })

  it('son 7 günü hesaplar', () => {
    expect(resolvePeriod('7d', today)).toEqual({ from: '2026-08-10', to: '2026-08-16' })
  })

  it('son 3 ayı 90 gün olarak hesaplar', () => {
    expect(periodLengthInDays(resolvePeriod('3m', today))).toBe(90)
  })

  it('bugünü ve son iki günü hiç göstermez', () => {
    expect(resolvePeriod('7d', today).to < '2026-08-19').toBe(true)
  })
})

describe('periodLengthInDays', () => {
  it('her iki ucu dahil sayar', () => {
    expect(periodLengthInDays({ from: '2026-08-01', to: '2026-08-01' })).toBe(1)
    expect(periodLengthInDays({ from: '2026-07-20', to: '2026-08-16' })).toBe(28)
  })
})

describe('previousPeriod', () => {
  it('aynı uzunlukta hemen önceki dönemi verir', () => {
    expect(previousPeriod({ from: '2026-07-20', to: '2026-08-16' })).toEqual({
      from: '2026-06-22',
      to: '2026-07-19',
    })
  })

  it('önceki dönem mevcut dönemle çakışmaz', () => {
    const current = resolvePeriod('28d', today)
    expect(previousPeriod(current).to < current.from).toBe(true)
  })

  it('uzunluğu korur', () => {
    const current = resolvePeriod('3m', today)
    expect(periodLengthInDays(previousPeriod(current))).toBe(periodLengthInDays(current))
  })
})
