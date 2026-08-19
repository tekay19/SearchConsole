import { describe, expect, it } from 'vitest'
import { toDailyTotalRows, toDimensionRows } from './write-metrics'

describe('toDailyTotalRows', () => {
  it('tarih anahtarını satıra çevirir', () => {
    expect(
      toDailyTotalRows('site-1', [{ keys: ['2026-08-01'], clicks: 5, impressions: 100, ctr: 0.05, position: 7.4 }]),
    ).toEqual([{ siteId: 'site-1', date: '2026-08-01', clicks: 5, impressions: 100, position: 7.4 }])
  })

  it('Google’ın ctr alanını taşımaz', () => {
    // Oran her zaman clicks / impressions ile yeniden hesaplanir; iki
    // kaynaktan iki farkli oran cikmasi mumkun olmamali.
    const [row] = toDailyTotalRows('s', [{ keys: ['2026-08-01'], clicks: 1, impressions: 2, ctr: 0.9, position: 1 }])
    expect(row).not.toHaveProperty('ctr')
  })

  it('anahtarsız satırları atar', () => {
    expect(toDailyTotalRows('s', [{ keys: [], clicks: 1, impressions: 1, ctr: 1, position: 1 }])).toEqual([])
  })
})

describe('toDimensionRows', () => {
  it('tarih ve boyut anahtarlarını ayırır', () => {
    expect(
      toDimensionRows('s', 'query', [
        { keys: ['2026-08-01', 'iphone kaufen'], clicks: 3, impressions: 40, ctr: 0.075, position: 3.2 },
      ]),
    ).toEqual([
      { siteId: 's', date: '2026-08-01', query: 'iphone kaufen', clicks: 3, impressions: 40, position: 3.2 },
    ])
  })

  it('her boyut için doğru sütun adını kullanır', () => {
    const row = { keys: ['2026-08-01', 'deger'], clicks: 1, impressions: 1, ctr: 1, position: 1 }
    expect(toDimensionRows('s', 'page', [row])[0]).toHaveProperty('page', 'deger')
    expect(toDimensionRows('s', 'country', [row])[0]).toHaveProperty('country', 'deger')
    expect(toDimensionRows('s', 'device', [row])[0]).toHaveProperty('device', 'deger')
  })

  it('boyut anahtarı eksik satırları atar', () => {
    expect(toDimensionRows('s', 'page', [{ keys: ['2026-08-01'], clicks: 1, impressions: 1, ctr: 1, position: 1 }])).toEqual([])
  })

  it('boş metinli boyut değerini korur', () => {
    // Google bos arama terimi dondurebiliyor; satiri atmak toplami bozar.
    const rows = toDimensionRows('s', 'query', [
      { keys: ['2026-08-01', ''], clicks: 2, impressions: 9, ctr: 0.2, position: 4 },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveProperty('query', '')
  })
})
