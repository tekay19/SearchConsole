import Link from 'next/link'
import { DeltaBadge } from '@/components/metrics/delta-badge'
import { copy } from '@/lib/copy'
import { formatCount, formatRank, formatRate } from '@/lib/format/number'
import { formatLastUpdate } from '@/lib/format/time'
import type { SiteSummary } from '@/server/services/sites.service'
import { StatusBadge } from './status-badge'

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * Tek bir sitenin özeti.
 *
 * Kullanıcı tablo okumak zorunda değil: en çok baktığı iki sayı öne
 * çıkıyor, geri kalanı detay ekranında.
 */
export function SiteCard({
  site,
  onRetry,
}: {
  site: SiteSummary
  onRetry: (formData: FormData) => Promise<void>
}) {
  return (
    <article className="flex flex-col rounded-(--radius) bg-paper-raised p-5 ring-1 ring-rule">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold break-all">{site.displayName}</h3>
        <StatusBadge view={site.status} siteId={site.id} onRetry={onRetry} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <Figure label={copy.metrics.clicks.label} value={formatCount(site.clicks)} />
        <Figure label={copy.metrics.views.label} value={formatCount(site.impressions)} />
        <Figure
          label={copy.metrics.clickRate.label}
          value={site.clickRate === null ? copy.common.noData : formatRate(site.clickRate)}
        />
        <Figure
          label={copy.metrics.rank.label}
          value={site.rank === null ? copy.common.noData : formatRank(site.rank)}
        />
      </dl>

      <DeltaBadge trend={site.clicksTrend} />

      <p className="mt-4 text-xs text-ink-faint">
        {site.lastDataAt
          ? `${copy.sites.lastData} ${formatLastUpdate(site.lastDataAt, new Date())}`
          : copy.sites.neverSynced}
      </p>

      <Link
        href={`/site/${site.id}`}
        className="mt-4 self-start text-sm font-medium text-cobalt underline-offset-4 hover:underline"
      >
        {copy.sites.detailAction}
      </Link>
    </article>
  )
}
