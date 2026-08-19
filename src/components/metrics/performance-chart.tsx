'use client'

import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { copy } from '@/lib/copy'
import { formatCompactCount, formatCount } from '@/lib/format/number'

export type ChartPoint = { date: string; clicks: number; impressions: number }

type SeriesKey = 'clicks' | 'impressions'

const SERIES: ReadonlyArray<{ key: SeriesKey; label: string }> = [
  { key: 'clicks', label: copy.metrics.clicks.label },
  { key: 'impressions', label: copy.metrics.views.label },
]

const dayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

/**
 * Zaman serisi grafiği.
 *
 * Veri sunucudan hazır gelir; grafik hiçbir zaman kendi isteğini atmaz.
 * Tıklama ve görüntülenme aynı eksende gösterilemez — biri diğerinin
 * otuz katı olduğu için küçük olan düz çizgiye dönerdi. Bu yüzden sekme.
 */
export function PerformanceChart({ points }: { points: ChartPoint[] }) {
  const [series, setSeries] = useState<SeriesKey>('clicks')

  return (
    <section className="mt-6 rounded-(--radius) bg-paper-raised p-5 ring-1 ring-rule">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">{copy.chart.title}</h2>

        {points.length > 0 ? (
          <div role="tablist" aria-label={copy.chart.seriesLabel} className="inline-flex gap-1">
            {SERIES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={series === entry.key}
                onClick={() => setSeries(entry.key)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  series === entry.key
                    ? 'bg-cobalt-soft font-semibold text-cobalt'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {points.length === 0 ? (
        <p className="py-14 text-center text-sm text-ink-muted">{copy.chart.empty}</p>
      ) : (
        <div className="mt-5 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--rule)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => dayMonth.format(new Date(value))}
                tick={{ fill: 'var(--ink-faint)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--rule)' }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={formatCompactCount}
                tick={{ fill: 'var(--ink-faint)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: 'var(--rule)' }}
                labelFormatter={(value: string) => fullDate.format(new Date(value))}
                formatter={(value: number) => [
                  formatCount(value),
                  SERIES.find((entry) => entry.key === series)!.label,
                ]}
                contentStyle={{
                  background: 'var(--paper-raised)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink)',
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey={series}
                stroke="var(--cobalt)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
