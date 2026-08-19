import { describe, expect, it } from 'vitest'
import { aggregate } from './aggregate'

describe('aggregate', () => {
  it('tıklama ve gösterimleri toplar', () => {
    const result = aggregate([
      { clicks: 10, impressions: 100, position: 5 },
      { clicks: 30, impressions: 300, position: 9 },
    ])
    expect(result.clicks).toBe(40)
    expect(result.impressions).toBe(400)
  })

  it('oranı ortalamaların ortalaması olarak değil toplamlardan hesaplar', () => {
    // Ortalamaların ortalaması %50 verirdi; doğrusu 1/100 = %1.
    const result = aggregate([
      { clicks: 1, impressions: 1, position: 1 },
      { clicks: 0, impressions: 99, position: 1 },
    ])
    expect(result.clickRate).toBeCloseTo(0.01, 6)
  })

  it('sırayı gösterim sayısıyla ağırlıklandırır', () => {
    // Düz ortalama 7 verirdi; ağırlıklı doğrusu 11.
    const result = aggregate([
      { clicks: 0, impressions: 100, position: 2 },
      { clicks: 0, impressions: 900, position: 12 },
    ])
    expect(result.rank).toBeCloseTo(11, 6)
  })

  it('gösterim yoksa oran ve sıra null olur, sıfır olmaz', () => {
    expect(aggregate([])).toEqual({ clicks: 0, impressions: 0, clickRate: null, rank: null })
  })

  it('gösterimi sıfır olan satırlar sırayı bozmaz', () => {
    const result = aggregate([
      { clicks: 0, impressions: 0, position: 99 },
      { clicks: 5, impressions: 100, position: 4 },
    ])
    expect(result.rank).toBeCloseTo(4, 6)
  })
})
