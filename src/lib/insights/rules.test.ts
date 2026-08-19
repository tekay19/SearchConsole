import { describe, expect, it } from 'vitest'
import {
  CLICKS_CHANGE_THRESHOLD,
  MAX_INSIGHTS,
  POSITION_CHANGE_THRESHOLD,
  STALE_AFTER_DAYS,
  buildInsights,
} from './rules'
import type { SiteInsightInput } from './types'

const flat = { current: 100, previous: 100, absoluteChange: 0, relativeChange: 0, sentiment: 'neutral' } as const

const site = (over: Partial<SiteInsightInput> = {}): SiteInsightInput => ({
  siteId: 's1',
  displayName: 'example.com',
  status: 'fresh',
  daysSinceLastData: 0,
  clicksTrend: flat,
  rankTrend: flat,
  topQueryMover: null,
  ...over,
})

const clicksTrend = (relativeChange: number) => ({
  current: 100 * (1 + relativeChange),
  previous: 100,
  absoluteChange: 100 * relativeChange,
  relativeChange,
  sentiment: relativeChange > 0 ? ('good' as const) : ('bad' as const),
})

const rankTrend = (from: number, to: number) => ({
  current: to,
  previous: from,
  absoluteChange: to - from,
  relativeChange: (to - from) / from,
  sentiment: to < from ? ('good' as const) : ('bad' as const),
})

describe('buildInsights', () => {
  it('eşiği aşan tıklama artışını bildirir', () => {
    const [insight] = buildInsights({ sites: [site({ clicksTrend: clicksTrend(0.24) })] })
    expect(insight).toMatchObject({ kind: 'clicks_change', direction: 'up' })
    expect(insight?.values.change).toBeCloseTo(0.24, 6)
  })

  it('eşiğin altındaki değişimi bildirmez', () => {
    const under = CLICKS_CHANGE_THRESHOLD / 2
    expect(buildInsights({ sites: [site({ clicksTrend: clicksTrend(under) })] })).toEqual([])
  })

  it('tıklama düşüşünü de bildirir', () => {
    const [insight] = buildInsights({ sites: [site({ clicksTrend: clicksTrend(-0.3) })] })
    expect(insight).toMatchObject({ kind: 'clicks_change', direction: 'down' })
  })

  it('sıralama kötüleşmesini bildirir', () => {
    const [insight] = buildInsights({ sites: [site({ rankTrend: rankTrend(6.2, 11.8) })] })
    expect(insight).toMatchObject({ kind: 'position_change', direction: 'down' })
  })

  it('sıralamada eşiğin altındaki oynamayı bildirmez', () => {
    const under = POSITION_CHANGE_THRESHOLD / 2
    expect(buildInsights({ sites: [site({ rankTrend: rankTrend(8, 8 + under) })] })).toEqual([])
  })

  it('veri gecikmesini uyarı olarak verir', () => {
    const [insight] = buildInsights({ sites: [site({ daysSinceLastData: STALE_AFTER_DAYS + 1 })] })
    expect(insight).toMatchObject({ kind: 'stale_data', direction: 'warning' })
  })

  it('bağlantı sorununu her şeyin önüne koyar', () => {
    // Kullanicinin yapabilecegi tek sey bu; iyi haberin altinda kalmamali.
    const insights = buildInsights({
      sites: [
        site({ siteId: 'iyi', clicksTrend: clicksTrend(2) }),
        site({ siteId: 'sorunlu', status: 'needs_reconnect', daysSinceLastData: 5 }),
      ],
    })
    expect(insights[0]).toMatchObject({ kind: 'needs_reconnect', siteId: 'sorunlu' })
  })

  it('bağlantı sorunlu site için başka bir şey bildirmez', () => {
    // Veri gelmiyorsa sayilar zaten anlamsiz.
    const insights = buildInsights({
      sites: [site({ status: 'needs_reconnect', daysSinceLastData: 9, clicksTrend: clicksTrend(-0.9) })],
    })
    expect(insights).toHaveLength(1)
  })

  it('kötü haberi iyi haberin önüne koyar', () => {
    const insights = buildInsights({
      sites: [
        site({ siteId: 'artan', clicksTrend: clicksTrend(0.5) }),
        site({ siteId: 'gerileyen', rankTrend: rankTrend(4, 12) }),
      ],
    })
    expect(insights[0]?.kind).toBe('position_change')
  })

  it('ilk üçe yükselen kelimeyi bildirir', () => {
    const [insight] = buildInsights({
      sites: [site({ topQueryMover: { query: 'iphone kaufen', clicksGained: 820, rankNow: 2.4 } })],
    })
    expect(insight).toMatchObject({ kind: 'query_breakout', direction: 'up' })
    expect(insight?.href).toContain('arama-kelimeleri')
  })

  it('ilk üçe girmemiş kelimeyi bildirmez', () => {
    expect(
      buildInsights({ sites: [site({ topQueryMover: { query: 'x', clicksGained: 9, rankNow: 7.5 } })] }),
    ).toEqual([])
  })

  it('en fazla beş içgörü döndürür', () => {
    const sites = Array.from({ length: 12 }, (_, index) =>
      site({ siteId: `s${index}`, clicksTrend: clicksTrend(1) }),
    )
    expect(buildInsights({ sites })).toHaveLength(MAX_INSIGHTS)
  })

  it('sakin bir dönemde hiçbir şey uydurmaz', () => {
    expect(buildInsights({ sites: [site(), site({ siteId: 's2' })] })).toEqual([])
  })
})
