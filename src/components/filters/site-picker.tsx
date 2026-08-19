'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { copy } from '@/lib/copy'
import { ALL_SITES } from '@/lib/url/search-params'

export type SiteOption = { id: string; displayName: string }

/**
 * Site seçici.
 *
 * Site sayısı onlarca olabildiği için açılır menü; tarih seçicinin aksine
 * hepsini aynı anda göstermek mümkün değil.
 */
export function SitePicker({ sites }: { sites: SiteOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('site') ?? ALL_SITES

  return (
    <select
      aria-label={copy.filters.sitePickerLabel}
      value={current}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams)
        if (event.target.value === ALL_SITES) next.delete('site')
        else next.set('site', event.target.value)

        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
      }}
      className="rounded-lg bg-paper-raised px-3 py-2 text-sm font-medium text-ink ring-1 ring-rule"
    >
      <option value={ALL_SITES}>{copy.filters.allSites}</option>
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.displayName}
        </option>
      ))}
    </select>
  )
}
