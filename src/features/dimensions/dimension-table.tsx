import { DeltaBadge } from '@/components/metrics/delta-badge'
import { copy } from '@/lib/copy'
import { formatCount, formatRank } from '@/lib/format/number'
import type { DimensionEntry } from '@/server/services/dimensions.service'

/**
 * Arama kelimeleri ve sayfalar için sıralı tablo.
 *
 * Başlık bir soru: "İnsanlar sizi hangi kelimelerle buluyor?" —
 * "Sorgular" demekten hem daha anlaşılır hem de kullanıcıya neye baktığını
 * hatırlatıyor.
 */
export function DimensionTable({
  heading,
  keyColumnLabel,
  rows,
  renderKey,
}: {
  heading: string
  keyColumnLabel: string
  rows: DimensionEntry[]
  renderKey?: (key: string) => React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight">{heading}</h2>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-(--radius) border border-dashed border-rule px-5 py-10 text-center text-sm text-ink-muted">
          {copy.dimensions.empty}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-(--radius) ring-1 ring-rule">
          <table className="w-full min-w-[40rem] bg-paper-raised text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-xs text-ink-faint">
                <th scope="col" className="px-4 py-3 font-medium">
                  {keyColumnLabel}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {copy.dimensions.columns.clicks}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {copy.dimensions.columns.views}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {copy.dimensions.columns.rank}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {copy.dimensions.columns.change}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-rule">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-cobalt-soft/30">
                  <td className="max-w-sm px-4 py-3 break-words">
                    {renderKey ? renderKey(row.key) : row.key}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCount(row.clicks)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCount(row.impressions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.rank === null ? copy.common.noData : formatRank(row.rank)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <DeltaBadge trend={row.trend} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
