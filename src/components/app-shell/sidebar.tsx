'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { copy } from '@/lib/copy'
import { NAV_ITEMS } from './nav-items'

/**
 * Sol menü. Bağlantılar mevcut site ve tarih seçimini koruyarak gezer;
 * kullanıcı bölüm değiştirdiğinde filtresini yeniden kurmak zorunda kalmaz.
 */
export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  return (
    <nav aria-label={copy.common.mainNavLabel} className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={query ? `${item.href}?${query}` : item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-cobalt-soft font-semibold text-cobalt'
                : 'text-ink-muted hover:bg-paper-raised hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
