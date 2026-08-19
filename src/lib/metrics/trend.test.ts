import { describe, expect, it } from 'vitest'
import { compareMetric } from './trend'

describe('compareMetric', () => {
  it('artışı olumlu sayar', () => {
    const trend = compareMetric(112, 100, {})
    expect(trend.absoluteChange).toBe(12)
    expect(trend.relativeChange).toBeCloseTo(0.12, 6)
    expect(trend.sentiment).toBe('good')
  })

  it('düşüşü olumsuz sayar', () => {
    expect(compareMetric(88, 100, {}).sentiment).toBe('bad')
  })

  it('sıra metriğinde küçülmeyi olumlu sayar', () => {
    const trend = compareMetric(7.2, 8.4, { lowerIsBetter: true })
    expect(trend.absoluteChange).toBeCloseTo(-1.2, 6)
    expect(trend.sentiment).toBe('good')
  })

  it('sıra metriğinde büyümeyi olumsuz sayar', () => {
    expect(compareMetric(11.8, 6.2, { lowerIsBetter: true }).sentiment).toBe('bad')
  })

  it('önceki dönem yoksa oransal değişim üretmez', () => {
    const trend = compareMetric(50, null, {})
    expect(trend.relativeChange).toBeNull()
    expect(trend.absoluteChange).toBeNull()
    expect(trend.sentiment).toBe('neutral')
  })

  it('mevcut dönem yoksa nötr kalır', () => {
    expect(compareMetric(null, 50, {}).sentiment).toBe('neutral')
  })

  it('önceki dönem sıfırsa oransal değişim üretmez ama mutlak değişimi verir', () => {
    const trend = compareMetric(50, 0, {})
    expect(trend.relativeChange).toBeNull()
    expect(trend.absoluteChange).toBe(50)
    expect(trend.sentiment).toBe('good')
  })

  it('değişim yoksa nötr olur', () => {
    expect(compareMetric(100, 100, {}).sentiment).toBe('neutral')
  })
})
