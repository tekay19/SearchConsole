import { copy } from '@/lib/copy'
import type { Overview } from '@/server/services/performance.service'
import { KpiCard } from './kpi-card'

/**
 * Dört kart, Spec §5.4 sırasıyla: Tıklamalar, Görüntülenme, Oran, Sıra.
 *
 * Sıra en sonda ve tek `lowerIsBetter` olan — küçüldükçe iyileşen tek metrik.
 */
export function KpiRow({ overview }: { overview: Overview }) {
  const { totals, trends } = overview

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={copy.metrics.clicks.label}
        help={copy.metrics.clicks.help}
        value={totals.clicks}
        valueKind="count"
        trend={trends.clicks}
      />
      <KpiCard
        label={copy.metrics.views.label}
        help={copy.metrics.views.help}
        value={totals.impressions}
        valueKind="count"
        trend={trends.impressions}
      />
      <KpiCard
        label={copy.metrics.clickRate.label}
        help={copy.metrics.clickRate.help}
        value={totals.clickRate}
        valueKind="rate"
        trend={trends.clickRate}
      />
      <KpiCard
        label={copy.metrics.rank.label}
        help={copy.metrics.rank.help}
        value={totals.rank}
        valueKind="rank"
        trend={trends.rank}
        lowerIsBetter
      />
    </div>
  )
}
