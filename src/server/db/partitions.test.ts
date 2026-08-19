import { describe, expect, it } from 'vitest'
import { partitionRangeFor, partitionsToCreate } from './partitions'

describe('partitionRangeFor', () => {
  it('ayın ilkinden sonraki ayın ilkine kadar aralık üretir', () => {
    expect(partitionRangeFor(new Date('2026-08-19T00:00:00Z'))).toEqual({
      suffix: '2026_08',
      from: '2026-08-01',
      to: '2026-09-01',
    })
  })

  it('yıl sınırını doğru geçer', () => {
    expect(partitionRangeFor(new Date('2026-12-05T00:00:00Z'))).toEqual({
      suffix: '2026_12',
      from: '2026-12-01',
      to: '2027-01-01',
    })
  })

  it('ayın son gününde de aynı aralığı verir', () => {
    expect(partitionRangeFor(new Date('2026-02-28T23:59:59Z')).suffix).toBe('2026_02')
  })
})

describe('partitionsToCreate', () => {
  it('içinde bulunulan ay dahil ileriye dönük N ay üretir', () => {
    const result = partitionsToCreate(new Date('2026-11-19T00:00:00Z'), 3)
    expect(result.map((range) => range.suffix)).toEqual(['2026_11', '2026_12', '2027_01'])
  })

  it('bölümler arasında boşluk veya çakışma bırakmaz', () => {
    const ranges = partitionsToCreate(new Date('2026-01-15T00:00:00Z'), 14)
    for (let i = 1; i < ranges.length; i += 1) {
      expect(ranges[i]!.from).toBe(ranges[i - 1]!.to)
    }
  })

  it('sıfır ay istendiğinde boş döner', () => {
    expect(partitionsToCreate(new Date('2026-01-15T00:00:00Z'), 0)).toEqual([])
  })
})
