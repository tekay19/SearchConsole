import { describe, expect, it } from 'vitest'
import { HISTORY_MONTHS, planHistoryChunks } from './history-plan'

const today = new Date('2026-08-19T00:00:00Z')

describe('planHistoryChunks', () => {
  it('Google’ın verdiği kadar geriye gider', () => {
    expect(planHistoryChunks(today)).toHaveLength(HISTORY_MONTHS)
    expect(HISTORY_MONTHS).toBe(16)
  })

  it('en yeni dilimden başlar', () => {
    // En yeni once cekilir; kullanici bekletirken once ise yarayan
    // veriyi gormeli, 16 ay oncesini degil.
    expect(planHistoryChunks(today)[0]).toEqual({ from: '2026-08-01', to: '2026-08-16' })
  })

  it('ilk dilim veri gecikmesini aşmaz', () => {
    expect(planHistoryChunks(today)[0]!.to).toBe('2026-08-16')
  })

  it('dilimler arasında boşluk veya çakışma bırakmaz', () => {
    const chunks = planHistoryChunks(today)
    for (let i = 1; i < chunks.length; i += 1) {
      const previousStart = Date.parse(chunks[i - 1]!.from)
      const currentEnd = Date.parse(chunks[i]!.to)
      expect(currentEnd).toBe(previousStart - 86_400_000)
    }
  })

  it('her dilim tek bir aya denk gelir', () => {
    for (const chunk of planHistoryChunks(today)) {
      expect(chunk.from.slice(0, 7)).toBe(chunk.to.slice(0, 7))
      expect(chunk.from.endsWith('-01')).toBe(true)
    }
  })

  it('yıl sınırını doğru geçer', () => {
    const chunks = planHistoryChunks(new Date('2026-01-20T00:00:00Z'))
    expect(chunks[0]!.from).toBe('2026-01-01')
    expect(chunks[1]!.from).toBe('2025-12-01')
    expect(chunks[1]!.to).toBe('2025-12-31')
  })
})
