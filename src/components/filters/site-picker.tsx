'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { copy } from '@/lib/copy'
import { ALL_ACCOUNTS, ALL_SITES } from '@/lib/url/search-params'
import type { SiteOption } from '@/server/services/sites.service'

/**
 * Site seçici.
 *
 * Hesap süzgecini burada uyguluyoruz: kabuk bir layout ve Next.js
 * layout'lara adres çubuğu parametrelerini vermiyor. Liste zaten
 * hazır olduğu için istemcide süzmek ek istek doğurmuyor.
 */
export function SitePicker({ sites }: { sites: SiteOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const account = searchParams.get('hesap') ?? ALL_ACCOUNTS
  const current = searchParams.get('site') ?? ALL_SITES

  const visible = account === ALL_ACCOUNTS ? sites : sites.filter((site) => site.accountId === account)

  if (visible.length === 0) return null

  return (
    <select
      aria-label={copy.filters.sitePickerLabel}
      value={visible.some((site) => site.id === current) ? current : ALL_SITES}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams)
        if (event.target.value === ALL_SITES) next.delete('site')
        else next.set('site', event.target.value)

        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
      }}
      className="max-w-64 rounded-lg bg-paper-raised px-3 py-2 text-sm font-medium text-ink ring-1 ring-rule"
    >
      <option value={ALL_SITES}>{copy.filters.allSites}</option>
      {visible.map((site) => (
        <option key={site.id} value={site.id}>
          {site.displayName}
        </option>
      ))}
    </select>
  )
}
