import Link from 'next/link'
import { copy } from '@/lib/copy'
import type { Insight } from '@/lib/insights/types'
import { insightText } from './insight-text'

const MARKS = {
  up: { symbol: '↑', tone: 'text-rise' },
  down: { symbol: '↓', tone: 'text-fall' },
  warning: { symbol: '⚠', tone: 'text-fall' },
} as const

/**
 * "Bugün dikkat etmeniz gerekenler".
 *
 * Panelin sadece grafik gösteren bir şey olmaktan çıktığı yer: her satır
 * ne olduğunu söyler ve tıklanınca ilgili ekrana götürür.
 * Sakin bir dönemde liste boş kalır ve bu doğrudur.
 */
export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <section className="mt-6 rounded-(--radius) bg-paper-raised p-5 ring-1 ring-rule">
      <h2 className="font-display text-base font-semibold">{copy.insights.title}</h2>

      {insights.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{copy.insights.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule">
          {insights.map((insight, index) => {
            const mark = MARKS[insight.direction]

            return (
              <li key={`${insight.kind}-${insight.siteId}-${index}`}>
                <Link
                  href={insight.href}
                  className="-mx-2 flex items-baseline gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-cobalt-soft/40"
                >
                  <span className={`shrink-0 font-display text-base ${mark.tone}`} aria-hidden="true">
                    {mark.symbol}
                  </span>
                  <span className="text-sm leading-relaxed text-ink">{insightText(insight)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
