import Link from 'next/link'
import { copy } from '@/lib/copy'
import { formatCount, formatRank, formatRate } from '@/lib/format/number'
import type { SiteSummary } from '@/server/services/sites.service'
import { StatusBadge } from './status-badge'

/**
 * Aynı veri, çok siteli kullanıcı için sıkıştırılmış hâli.
 * Onlarca site varken kart görünümü çok fazla kaydırma gerektiriyor.
 */
export function SiteTable({
  sites,
  onRetry,
}: {
  sites: SiteSummary[]
  onRetry: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="overflow-x-auto rounded-(--radius) ring-1 ring-rule">
      <table className="w-full min-w-[42rem] bg-paper-raised text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-xs text-ink-faint">
            <th scope="col" className="px-4 py-3 font-medium">
              {copy.nav.sites}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.metrics.clicks.label}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.metrics.views.label}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.metrics.clickRate.label}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.metrics.rank.label}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-rule">
          {sites.map((site) => (
            <tr key={site.id} className="hover:bg-cobalt-soft/30">
              <td className="px-4 py-3">
                <Link href={`/site/${site.id}`} className="font-medium text-cobalt hover:underline">
                  {site.displayName}
                </Link>
                <div className="mt-1">
                  <StatusBadge view={site.status} siteId={site.id} onRetry={onRetry} />
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(site.clicks)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(site.impressions)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {site.clickRate === null ? copy.common.noData : formatRate(site.clickRate)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {site.rank === null ? copy.common.noData : formatRank(site.rank)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
