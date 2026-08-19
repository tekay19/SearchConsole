import { copy } from '@/lib/copy'
import { formatCount, formatRank, formatRate } from '@/lib/format/number'
import type { Trend } from '@/lib/metrics/trend'
import { DeltaBadge } from './delta-badge'

export type ValueKind = 'count' | 'rate' | 'rank'

const FORMATTERS: Record<ValueKind, (value: number) => string> = {
  count: formatCount,
  rate: formatRate,
  rank: formatRank,
}

/**
 * Tek bir sayı, ne anlama geldiği ve geçen döneme göre durumu.
 *
 * Açıklama gizli bir ipucu değil, kartın parçası. Teknik olmayan
 * kullanıcının "bu ne demek" sorusunu üzerine gelmeden cevaplaması gerekiyor.
 */
export function KpiCard({
  label,
  help,
  value,
  valueKind,
  trend,
  lowerIsBetter = false,
}: {
  label: string
  help: string
  value: number | null
  valueKind: ValueKind
  trend: Trend
  lowerIsBetter?: boolean
}) {
  return (
    <article className="rounded-(--radius) bg-paper-raised p-5 ring-1 ring-rule">
      <h3 className="text-sm font-medium text-ink-muted">{label}</h3>

      <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
        {value === null ? copy.common.noData : FORMATTERS[valueKind](value)}
      </p>

      <DeltaBadge trend={trend} lowerIsBetter={lowerIsBetter} />

      <p className="mt-3 border-t border-rule pt-3 text-xs leading-relaxed text-ink-faint">{help}</p>
    </article>
  )
}
