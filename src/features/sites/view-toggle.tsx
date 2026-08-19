'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { copy } from '@/lib/copy'

const VIEWS = [
  { key: 'kartlar', label: copy.sites.viewCards },
  { key: 'tablo', label: copy.sites.viewTable },
] as const

/** Görünüm tercihi de adres çubuğunda; sayfa yenilense de korunuyor. */
export function ViewToggle() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('gorunum') === 'tablo' ? 'tablo' : 'kartlar'

  return (
    <div
      role="group"
      aria-label={copy.sites.viewLabel}
      className="inline-flex rounded-lg bg-paper-raised p-0.5 ring-1 ring-rule"
    >
      {VIEWS.map((view) => {
        const next = new URLSearchParams(searchParams)
        if (view.key === 'kartlar') next.delete('gorunum')
        else next.set('gorunum', view.key)

        const query = next.toString()

        return (
          <Link
            key={view.key}
            href={query ? `${pathname}?${query}` : pathname}
            aria-current={current === view.key ? 'page' : undefined}
            className={`rounded-[7px] px-3 py-1.5 text-sm transition-colors ${
              current === view.key ? 'bg-cobalt font-semibold text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {view.label}
          </Link>
        )
      })}
    </div>
  )
}
