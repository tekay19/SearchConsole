export type Sentiment = 'good' | 'bad' | 'neutral'

export type Trend = {
  current: number | null
  previous: number | null
  absoluteChange: number | null
  /** Önceki dönem yoksa veya sıfırsa null — sıfıra bölmek yerine "karşılaştırılamaz" deriz. */
  relativeChange: number | null
  sentiment: Sentiment
}

/**
 * İki dönemi karşılaştırır.
 *
 * `sentiment` ham işaretten ayrıdır çünkü her metrikte büyümek iyi değildir:
 * ortalama sıra küçüldükçe iyileşir. Arayüz oku ve rengi bu alandan seçer,
 * sayının işaretinden değil.
 */
export function compareMetric(
  current: number | null,
  previous: number | null,
  { lowerIsBetter = false }: { lowerIsBetter?: boolean },
): Trend {
  if (current === null || previous === null) {
    return { current, previous, absoluteChange: null, relativeChange: null, sentiment: 'neutral' }
  }

  const absoluteChange = current - previous
  const relativeChange = previous === 0 ? null : absoluteChange / previous
  const improved = lowerIsBetter ? absoluteChange < 0 : absoluteChange > 0

  return {
    current,
    previous,
    absoluteChange,
    relativeChange,
    sentiment: absoluteChange === 0 ? 'neutral' : improved ? 'good' : 'bad',
  }
}
