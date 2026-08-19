import Link from 'next/link'
import { PageHeader } from '@/components/app-shell/page-header'
import { removeTrackedSite, signOutAction } from '@/features/settings/actions'
import { StatusBadge } from '@/features/sites/status-badge'
import { copy } from '@/lib/copy'
import { formatLastUpdate } from '@/lib/format/time'
import { requireSession } from '@/server/auth'
import { settingsService } from '@/server/services/settings.service'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-(--radius) bg-paper-raised p-5 ring-1 ring-rule">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-medium break-all">{value}</dd>
    </div>
  )
}

export default async function SettingsPage() {
  const session = await requireSession()
  const settings = await settingsService.load(session.userId)

  return (
    <>
      <PageHeader title={copy.nav.settings} withRange={false} />

      <div className="grid max-w-2xl gap-5">
        <Card title={copy.settings.connectionHeading}>
          {settings.connection === null ? (
            <p className="text-sm text-ink-muted">{copy.settings.noConnection}</p>
          ) : (
            <>
              <dl className="divide-y divide-rule">
                <Row label={copy.settings.connectedAs} value={settings.connection.googleEmail} />
                <Row
                  label={copy.settings.connectedSince}
                  value={formatLastUpdate(settings.connection.connectedAt, new Date())}
                />
              </dl>

              <p
                className={`mt-4 text-sm font-medium ${
                  settings.connection.isActive ? 'text-rise' : 'text-fall'
                }`}
              >
                {settings.connection.isActive
                  ? copy.settings.connectionActive
                  : copy.settings.connectionBroken}
              </p>

              <Link
                href="/baglan"
                className="mt-4 inline-block rounded-lg bg-cobalt-soft px-4 py-2 text-sm font-medium text-cobalt hover:underline"
              >
                {copy.settings.reconnect}
              </Link>
            </>
          )}
        </Card>

        <Card title={copy.settings.sitesHeading}>
          {settings.sites.length === 0 ? (
            <p className="text-sm text-ink-muted">{copy.settings.noSites}</p>
          ) : (
            <ul className="divide-y divide-rule">
              {settings.sites.map((site) => (
                <li key={site.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium break-all">{site.displayName}</p>
                    <div className="mt-1">
                      <StatusBadge view={site.status} />
                    </div>
                  </div>

                  <form action={removeTrackedSite}>
                    <input type="hidden" name="siteId" value={site.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-fall ring-1 ring-rule hover:bg-fall/10"
                    >
                      {copy.settings.removeSite}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-rule pt-4 text-xs leading-relaxed text-ink-faint">
            {copy.settings.dangerNote}
          </p>
        </Card>

        <Card title={copy.settings.signOutHeading}>
          <dl className="divide-y divide-rule">
            <Row label={copy.settings.accountHeading} value={settings.email} />
          </dl>

          <p className="mt-3 text-sm text-ink-muted">{copy.settings.signOutNote}</p>

          <form action={signOutAction} className="mt-4">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-rule hover:bg-paper"
            >
              {copy.common.signOut}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}
