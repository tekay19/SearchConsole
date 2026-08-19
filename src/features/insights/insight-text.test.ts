import { describe, expect, it } from 'vitest'
import type { Insight } from '@/lib/insights/types'
import { insightText } from './insight-text'

const make = (over: Partial<Insight>): Insight => ({
  kind: 'clicks_change',
  direction: 'up',
  siteId: 's',
  href: '/site/s',
  values: {},
  ...over,
})

describe('insightText', () => {
  it('tıklama artışını cümleye çevirir', () => {
    expect(insightText(make({ values: { site: 'example.de', change: 0.24 } }))).toBe(
      'example.de tıklamaları %24 arttı.',
    )
  })

  it('tıklama düşüşünü cümleye çevirir', () => {
    expect(insightText(make({ direction: 'down', values: { site: 'example.de', change: 0.31 } }))).toBe(
      'example.de tıklamaları %31 azaldı.',
    )
  })

  it('sıralama gerilemesini cümleye çevirir', () => {
    expect(
      insightText(
        make({ kind: 'position_change', direction: 'down', values: { site: 'example.es', from: 6.2, to: 11.8 } }),
      ),
    ).toBe("example.es Google sıralaması 6,2'ten 11,8'e geriledi.")
  })

  it('sıralama iyileşmesini yükselme olarak anlatır', () => {
    expect(
      insightText(
        make({ kind: 'position_change', direction: 'up', values: { site: 'example.de', from: 8.4, to: 7.2 } }),
      ),
    ).toBe("example.de Google sıralaması 8,4'ten 7,2'e yükseldi.")
  })

  it('veri gecikmesini cümleye çevirir', () => {
    expect(
      insightText(make({ kind: 'stale_data', direction: 'warning', values: { site: 'shop.example.com', days: 2 } })),
    ).toBe('shop.example.com için 2 gündür yeni veri gelmiyor.')
  })

  it('bağlantı uyarısını cümleye çevirir', () => {
    expect(
      insightText(make({ kind: 'needs_reconnect', direction: 'warning', values: { site: 'example.com' } })),
    ).toBe('example.com için Google bağlantınızı yenilemeniz gerekiyor.')
  })

  it('yükselen kelimeyi cümleye çevirir', () => {
    expect(insightText(make({ kind: 'query_breakout', values: { query: 'iphone kaufen' } }))).toBe(
      '"iphone kaufen" kelimesi ilk 3 sıraya yükseldi.',
    )
  })
})
