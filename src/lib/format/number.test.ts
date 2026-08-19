import { describe, expect, it } from 'vitest'
import { formatCompactCount, formatCount, formatDelta, formatRank, formatRate } from './number'

describe('formatCount', () => {
  it('binlik ayıracı olarak nokta kullanır', () => {
    expect(formatCount(128420)).toBe('128.420')
  })

  it('sıfırı gösterir', () => {
    expect(formatCount(0)).toBe('0')
  })

  it('ondalık göstermez', () => {
    expect(formatCount(1234.7)).toBe('1.235')
  })
})

describe('formatCompactCount', () => {
  it('binin altını kısaltmaz', () => {
    expect(formatCompactCount(940)).toBe('940')
  })

  it('büyük sayıları kısaltır', () => {
    expect(formatCompactCount(820000)).toMatch(/^820/)
    expect(formatCompactCount(820000).length).toBeLessThan('820.000'.length + 3)
  })

  it('milyonları binlerden farklı gösterir', () => {
    expect(formatCompactCount(4280320)).not.toBe(formatCompactCount(4280))
  })
})

describe('formatRate', () => {
  it('yüzde işaretini başa koyar ve virgül kullanır', () => {
    expect(formatRate(0.0295)).toBe('%2,95')
  })

  it('sıfır oranı gösterir', () => {
    expect(formatRate(0)).toBe('%0')
  })
})

describe('formatRank', () => {
  it('tek ondalık gösterir', () => {
    expect(formatRank(8.42)).toBe('8,4')
  })

  it('tam sayıda da ondalık gösterir', () => {
    expect(formatRank(3)).toBe('3,0')
  })
})

describe('formatDelta', () => {
  it('işaretsiz mutlak yüzde döndürür', () => {
    expect(formatDelta(0.124)).toBe('%12,4')
  })

  it('negatif değişimi de işaretsiz verir; yönü çağıran gösterir', () => {
    expect(formatDelta(-0.03)).toBe('%3')
  })
})
