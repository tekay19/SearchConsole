'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { RangeKey } from '@/lib/date/period'
import { copy } from '@/lib/copy'

const RANGES: readonly RangeKey[] = ['7d', '28d', '3m']

/**
 * Tarih aralığı seçici.
 *
 * Açılır menü değil bağlantı grubu: üç seçenek var, hepsini aynı anda
 * göstermek bir tık tasarruf ettiriyor. Bağlantı olduğu için de sağ tıkla
 * yeni sekmede açılabiliyor ve sunucuda render ediliyor.
 */
export function RangePicker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('aralik') ?? '28d'

  return (
    <div
      role="group"
      aria-label={copy.filters.rangeLabel}
      className="inline-flex rounded-lg bg-paper-raised p-0.5 ring-1 ring-rule"
    >
      {RANGES.map((range) => {
        const next = new URLSearchParams(searchParams)
        next.set('aralik', range)
        const active = current === range

        return (
          <Link
            key={range}
            href={`${pathname}?${next.toString()}`}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[7px] px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              active ? 'bg-cobalt font-semibold text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {copy.filters.ranges[range]}
          </Link>
        )
      })}
    </div>
  )
}
