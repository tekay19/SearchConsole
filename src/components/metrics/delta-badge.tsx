import { copy } from '@/lib/copy'
import { formatDelta } from '@/lib/format/number'
import type { Trend } from '@/lib/metrics/trend'

/**
 * Değişim rozeti.
 *
 * Yön oku ile "iyi/kötü" rengi ayrı iki şeydir: ortalama sırada ok aşağı
 * bakarken renk olumlu olur. Metin (`aria-label`) her zaman kullanıcının
 * anladığı dilde — "arttı" değil "iyileşti" gibi.
 */
export function DeltaBadge({ trend, lowerIsBetter = false }: { trend: Trend; lowerIsBetter?: boolean }) {
  if (trend.relativeChange === null || trend.absoluteChange === null) {
    return <p className="mt-2 text-xs text-ink-faint">{copy.delta.noComparison}</p>
  }

  if (trend.absoluteChange === 0) {
    return <p className="mt-2 text-xs text-ink-faint">{copy.delta.unchanged}</p>
  }

  const rose = trend.absoluteChange > 0
  const label = lowerIsBetter
    ? trend.sentiment === 'good'
      ? copy.delta.improved
      : copy.delta.worsened
    : rose
      ? copy.delta.increased
      : copy.delta.decreased

  const tone = trend.sentiment === 'good' ? 'text-rise' : 'text-fall'

  return (
    <p className={`mt-2 flex items-center gap-1 text-sm font-medium ${tone}`}>
      <span aria-hidden="true">{rose ? '↑' : '↓'}</span>
      <span aria-label={label}>{formatDelta(trend.relativeChange)}</span>
    </p>
  )
}
