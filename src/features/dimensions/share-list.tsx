import { copy } from '@/lib/copy'
import { formatCount, formatRate } from '@/lib/format/number'

export type ShareRow = { key: string; clicks: number; share: number }

/**
 * Ülke ve cihaz kırılımı.
 *
 * Tablo yerine oran çubuğu: kullanıcının burada aradığı şey kesin sayı
 * değil, dağılımın şekli. "Ziyaretçilerimin çoğu nereden geliyor" sorusu
 * bir bakışta cevaplanmalı.
 */
export function ShareList({
  heading,
  rows,
  renderKey,
}: {
  heading: string
  rows: ShareRow[]
  renderKey: (key: string) => string
}) {
  const visible = rows.filter((row) => row.clicks > 0)

  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight">{heading}</h2>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-(--radius) border border-dashed border-rule px-5 py-10 text-center text-sm text-ink-muted">
          {copy.dimensions.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-rule overflow-hidden rounded-(--radius) bg-paper-raised ring-1 ring-rule">
          {visible.map((row) => (
            <li key={row.key} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">{renderKey(row.key)}</span>

                <span className="flex shrink-0 items-baseline gap-3 text-sm tabular-nums">
                  <span className="text-ink-muted">{formatCount(row.clicks)}</span>
                  <span className="w-14 text-right font-display font-semibold">{formatRate(row.share)}</span>
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
                <div
                  className="h-full rounded-full bg-cobalt"
                  style={{ width: `${Math.max(row.share * 100, 1)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
