import { Suspense } from 'react'
import Link from 'next/link'
import { AccountPicker } from '@/components/app-shell/account-picker'
import { Sidebar } from '@/components/app-shell/sidebar'
import { SitePicker } from '@/components/filters/site-picker'
import { copy } from '@/lib/copy'
import { requireSession } from '@/server/auth'
import { accountsService } from '@/server/services/accounts.service'
import { sitesService } from '@/server/services/sites.service'

/**
 * Panelin kabuğu. Oturum kontrolü burada bir kez yapılır; alt sayfaların
 * tek tek kontrol etmesi gerekmez.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  const [accounts, sites] = await Promise.all([
    accountsService.listForUser(session.userId),
    sitesService.listOptions(session.userId),
  ])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-rule px-5 py-5 lg:w-64 lg:border-r lg:border-b-0 lg:py-7">
        <Link
          href="/genel-bakis"
          className="block font-display text-sm font-semibold tracking-tight text-ink-faint"
        >
          {copy.app.name}
        </Link>

        <div className="mt-3">
          <Suspense>
            <AccountPicker accounts={accounts} />
          </Suspense>
        </div>

        <div className="mt-2">
          <Link href="/api/google/connect" className="text-xs font-medium text-cobalt hover:underline">
            {copy.accounts.addAccount}
          </Link>
        </div>

        <div className="mt-6">
          <Suspense>
            <Sidebar />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-rule px-6 py-4">
          <Suspense>
            <SitePicker sites={sites} />
          </Suspense>
        </header>

        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
