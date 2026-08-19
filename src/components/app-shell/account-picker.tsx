'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { copy } from '@/lib/copy'
import { formatCount } from '@/lib/format/number'
import { ALL_ACCOUNTS } from '@/lib/url/search-params'
import type { AccountOption } from '@/server/services/accounts.service'

/** "ornek@gmail.com — 4 site" ya da yenilenmesi gerekiyorsa uyarısıyla. */
function optionLabel(account: AccountOption): string {
  const base = `${account.googleEmail} — ${copy.accounts.siteCount(formatCount(account.siteCount))}`
  return account.isActive ? base : `${base} (${copy.accounts.needsReconnect})`
}

/**
 * Bağlı Google hesapları arasında geçiş.
 *
 * Hesap değişince site seçimi sıfırlanır: seçili site başka bir hesaba
 * aitse listede olmayan bir siteye bakıyor olurduk.
 */
export function AccountPicker({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('hesap') ?? ALL_ACCOUNTS

  // Tek hesap varken seçim sunmak gereksiz gürültü.
  if (accounts.length <= 1) {
    return accounts[0] ? (
      <p className="truncate text-sm text-ink-muted" title={accounts[0].googleEmail}>
        {accounts[0].googleEmail}
      </p>
    ) : null
  }

  return (
    <select
      aria-label={copy.accounts.pickerLabel}
      value={current}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams)
        next.delete('site')

        if (event.target.value === ALL_ACCOUNTS) next.delete('hesap')
        else next.set('hesap', event.target.value)

        const query = next.toString()
        router.push(query ? `${pathname}?${query}` : pathname)
      }}
      className="w-full rounded-lg bg-paper-raised px-3 py-2 text-sm font-medium text-ink ring-1 ring-rule"
    >
      <option value={ALL_ACCOUNTS}>{copy.accounts.all}</option>

      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {optionLabel(account)}
        </option>
      ))}
    </select>
  )
}
